const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
    const timers = new Map(), sockets = [], recovered = [], disconnected = [], notifications = [];
    class Socket {
        static OPEN = 1;
        constructor(url) { Object.assign(this, { url, readyState: 0, bufferedAmount: 0, sent: [] }); sockets.push(this); }
        open() { this.readyState = 1; this.onopen?.(); }
        send(raw) { if (this.failSend) throw Error('send failed'); this.sent.push(JSON.parse(raw)); }
        message(value) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }); }
        close() { this.readyState = 3; this.onclose?.(); }
        reply(index, result) { this.message({ jsonrpc: '2.0', id: this.sent[index].id, result }); }
    }
    const context = {
        URL, WebSocket: Socket, window: { location: { origin: 'https://notes.example' } }, console: { error() {} },
        setTimeout(callback, delay) { const id = {}; timers.set(id, { callback, delay }); return id; },
        clearTimeout(id) { timers.delete(id); },
    };
    const anchors=readFileSync(path.join(__dirname,'../src/frontend/anchors.js'),'utf8');
    const prefix=readFileSync(path.join(__dirname,'../src/protocol.js'),'utf8')+'\n'+readFileSync(path.join(__dirname,'../src/wire.js'),'utf8')+'\nconst DOCUMENT_ID=COLLAB_ID;\n'+anchors.slice(anchors.indexOf('function validCursor('),anchors.indexOf('function captureSelection('));
    const wire = vm.runInNewContext(prefix+readFileSync(path.join(__dirname, '../src/frontend/rpc.js'), 'utf8') + '\n({Rpc:ChordRpcSocket,wirePack,wireDiff,wirePacket})', context);
    const Rpc=wire.Rpc;
    const rpc = new Rpc('siyuan-plugin-chord', 'client A', () => recovered.push(true), () => disconnected.push(true));
    rpc.bind('cursor-changed', value => notifications.push(value));
    const run = id => { const timer = timers.get(id); assert(timer, 'missing timer'); timers.delete(id); timer.callback(); };
    return { rpc, timers, sockets, recovered, disconnected, notifications, run, wire };
}

test('one WSS connection multiplexes out-of-order calls, errors and broadcast notifications', async () => {
    const { rpc, sockets, notifications, timers } = fixture();
    const first = rpc.call.getStatus(), second = rpc.call.setCursorTick(3);
    assert.equal(sockets.length, 1);
    const socket = sockets[0], url = new URL(socket.url);
    assert.equal(url.protocol, 'wss:'); assert.equal(url.pathname, '/plugin/private/siyuan-plugin-chord/rpc');
    assert.equal(url.searchParams.get('appId'), 'client A');
    socket.open(); await flush();
    socket.message('{broken'); socket.message(null);
    socket.message({ jsonrpc: '2.0', id: socket.sent[0].id, result: 1, error: { code: -1, message: 'invalid' } });
    assert.equal(rpc.pending.size, 2);
    socket.reply(1, { tick: 3 });
    assert.equal((await second).tick, 3);
    socket.message([{ jsonrpc: '2.0', method: 'cursor-changed', params: [{ tick: 3 }] }, { jsonrpc: '2.0', id: socket.sent[0].id, error: { code: -32002, message: 'Plugin not running' } }]);
    await assert.rejects(first, error => error.code === -32002 && error.message === 'Plugin not running');
    assert.equal(notifications[0].tick, 3);
    socket.reply(1, { tick: 30 }); assert.equal(rpc.pending.size, 0);
    rpc.close(); assert.equal(timers.size, 0);
});

test('disconnect rejects pending work, drops offline activity and reconnects without replay', async () => {
    const f = fixture(), { rpc, sockets } = f;
    const initial = rpc.connect(); sockets[0].open(); await initial;
    const request = rpc.call.cursorUpdate('session', 1, 1, { x: 1 }); await flush();
    const staleMessage = sockets[0].onmessage;
    const rejected = assert.rejects(request, /connection lost/);
    sockets[0].close(); await rejected;
    assert.equal(rpc.pending.size, 0);
    for (const method of ['cursorUpdate', 'selectionUpdate', 'editingUpdate', 'shortcut', 'pointerClick']) await assert.rejects(rpc.call[method](), /unavailable/);
    assert.equal(f.timers.get(rpc.retryTimer).delay, 250);
    f.run(rpc.retryTimer); sockets[1].open(); await flush();
    assert.equal(f.recovered.length, 1); assert.equal(sockets[1].sent.length, 0);
    const latest = rpc.call.cursorUpdate('session', 1, 2, { x: 99 }); await flush();
    staleMessage({ data: JSON.stringify({ jsonrpc: '2.0', id: sockets[1].sent[0].id, result: 'stale' }) });
    assert.equal(rpc.pending.size, 1);
    sockets[1].reply(0, 'latest'); assert.equal(await latest, 'latest');
    rpc.close(); assert.equal(f.timers.size, 0);
});

test('connection timeout retries with bounded backoff and recovers after initial failure', async () => {
    const f = fixture(), { rpc, sockets } = f;
    const pending = assert.rejects(rpc.call.presenceHeartbeat(), /connection timed out/);
    f.run(rpc.connectTimer); await pending;
    for (const delay of [250, 500, 1000, 2000, 4000, 5000, 5000]) {
        assert.equal(f.timers.get(rpc.retryTimer).delay, delay);
        f.run(rpc.retryTimer); sockets.at(-1).close();
        await flush();
    }
    f.run(rpc.retryTimer); sockets.at(-1).open(); await flush();
    assert.equal(f.recovered.length, 1);
    rpc.close(); assert.equal(f.timers.size, 0);
});

test('request timeout retires the connection and never retries a possibly applied mutation', async () => {
    const f = fixture(), { rpc, sockets } = f;
    const connection = rpc.connect(); sockets[0].open(); await connection;
    const save = rpc.call.presenceRename('session', 'New name', 1, 90), snapshot = rpc.call.cursorSnapshot();
    const rejected = Promise.all([assert.rejects(save, /request timed out/), assert.rejects(snapshot, /request timed out/)]);
    await flush(); f.run(rpc.pending.values().next().value.timer); await rejected;
    assert.equal(sockets[0].readyState, 3); assert.equal(rpc.pending.size, 0);
    f.run(rpc.retryTimer); sockets[1].open(); await flush();
    assert.equal(sockets[1].sent.length, 0);
    rpc.close(); assert.equal(f.timers.size, 0);
});

test('pending requests and socket buffering remain bounded', async () => {
    const f = fixture(), { rpc, sockets } = f;
    const connection = rpc.connect(); sockets[0].open(); await connection;
    const requests = Array.from({ length: 64 }, () => rpc.call.getStatus());
    const settled = Promise.allSettled(requests); await flush();
    await assert.rejects(rpc.call.getStatus(), /Too many pending/);
    assert.equal(rpc.pending.size, 64);
    sockets[0].reply(0, true); await requests[0];
    sockets[0].bufferedAmount = 1024 * 1024 + 1;
    await assert.rejects(rpc.call.getStatus(), /buffer full/);
    assert.equal((await settled).filter(row => row.status === 'rejected').length, 63);
    assert.equal(rpc.pending.size, 0);
    rpc.close(); assert.equal(f.timers.size, 0);
});

test('close cancels a shared connection attempt and prevents subsequent reconnects', async () => {
    const f = fixture(), { rpc, sockets } = f;
    const requests = [rpc.call.getStatus(), rpc.call.presenceHeartbeat()];
    const rejected = Promise.all(requests.map(request => assert.rejects(request, /closed/)));
    rpc.close(); await rejected;
    assert.equal(sockets.length, 1); assert.equal(sockets[0].readyState, 3);
    assert.equal(rpc.handlers.size, 0); assert.equal(f.timers.size, 0);
    await assert.rejects(rpc.call.getStatus(), /closed/);
    assert.equal(sockets.length, 1);
});

test('send errors clear pending requests and isolate failing notification handlers', async () => {
    const f = fixture(), { rpc, sockets, notifications } = f;
    const connection = rpc.connect(); sockets[0].open(); await connection;
    rpc.bind('cursor-changed', () => { throw Error('handler failed'); });
    rpc.bind('cursor-changed', async () => { throw Error('async handler failed'); });
    sockets[0].message({ jsonrpc: '2.0', method: 'cursor-changed', params: ['valid'] });
    await flush(); assert.equal(notifications[0], 'valid');
    rpc.onDisconnect = () => { throw Error("disconnect UI failed"); };
    sockets[0].failSend = true;
    await assert.rejects(rpc.call.presenceLeave(), /send failed/);
    assert.equal(rpc.pending.size, 0); assert.equal(sockets[0].readyState, 3);
    assert(rpc.retryTimer, 'disconnect callback prevented recovery');
    rpc.close(); assert.equal(f.timers.size, 0);
});

test('compact uploads negotiate support, keep acknowledged baselines and retry explicit resets once',async()=>{
    const f=fixture(),{rpc,sockets}=f;
    const joined=rpc.call.presenceHeartbeat('test-session',{generation:1});sockets[0].open();await flush();
    assert.equal(sockets[0].sent[0].params[1].wire,1);sockets[0].reply(0,{wire:1});await joined;
    const cursor=require('./helpers/wire-fixtures.cjs')()[1],second=JSON.parse(JSON.stringify(cursor));second.x=.8636779505946935;
    const first=rpc.call.cursorUpdate('test-session',1,1,cursor);await flush();
    assert.equal(sockets[0].sent[1].method,'cursorDelta');assert.equal(sockets[0].sent[1].params[3],null);
    sockets[0].reply(1,true);await first;
    const next=rpc.call.cursorUpdate('test-session',1,2,second);await flush();
    assert.equal(sockets[0].sent[2].params[3],1);
    sockets[0].reply(2,{reset:1});await flush();
    assert.equal(sockets[0].sent[3].params[3],null);assert.equal(sockets[0].sent[3].params[2],2);
    sockets[0].reply(3,true);await next;
    assert.equal(rpc.uploadCursor.value.x,second.x);
    second.x=0;assert.notEqual(rpc.uploadCursor.value.x,0,'baseline shared caller mutation');
    rpc.close();assert.equal(f.timers.size,0);
});

test('missing download revisions hide stale markers and coalesce resync without rolling back newer state',async()=>{
    const f=fixture(),{rpc,sockets,wire,notifications}=f;
    const resets=[];rpc.bind('cursor-changed',(_state,reset)=>resets.push(reset));
    const connection=rpc.connect();sockets[0].open();await connection;
    const cursor=require('./helpers/wire-fixtures.cjs')()[0];
    const state=x=>({tick:10,cursors:[{name:'A',hue:134,cursor:{...cursor,x}}],selections:[],editing:[]});
    const send=packet=>sockets[0].message({jsonrpc:'2.0',method:'cursor-delta',params:[packet]});
    send(wire.wirePacket('epoch-a',1,null,null,state(.1)));
    send(wire.wirePacket('epoch-a',3,2,state(.2),state(.3)));await flush();
    assert.equal(notifications.at(-1).cursors.length,0,'gap kept stale coordinates');
    assert.equal(resets.at(-1),true,'recovery must bypass the normal cursor fade');
    send(wire.wirePacket('epoch-a',4,3,state(.3),state(.4)));await flush();
    assert.equal(sockets[0].sent.length,1);assert.equal(sockets[0].sent[0].method,'cursorSync');
    send(wire.wirePacket('epoch-a',5,null,null,state(.5)));
    sockets[0].reply(0,wire.wirePacket('epoch-a',4,null,null,state(.4)));await flush();
    assert.equal(notifications.at(-1).cursors[0].cursor.x,.5,'older snapshot rolled back coordinates');
    const invalid=state(.7);invalid.cursors[0].hue=999;
    send(wire.wirePacket('epoch-a',6,null,null,invalid));await flush();
    assert.equal(rpc.download,null,'unvalidated snapshot became baseline');
    assert.equal(notifications.at(-1).cursors.length,0);
    sockets[0].reply(1,wire.wirePacket('epoch-a',7,null,null,state(.6)));await flush();
    assert.equal(notifications.at(-1).cursors[0].cursor.x,.6);
    rpc.close();assert.equal(f.timers.size,0);
});

test('upload timeout never advances the baseline and reconnect clears both compact directions',async()=>{
    const f=fixture(),{rpc,sockets,wire}=f;
    const connection=rpc.connect();sockets[0].open();await connection;rpc.compact=true;
    const cursor=require('./helpers/wire-fixtures.cjs')()[0];
    const sent=rpc.call.cursorUpdate('test-session',1,1,cursor);const rejected=assert.rejects(sent,/timed out/);await flush();
    assert.equal(rpc.uploadCursor,undefined);
    rpc.acceptSnapshot(wire.wirePacket('epoch-a',1,null,null,{tick:10,cursors:[],selections:[],editing:[]}));
    f.run(rpc.pending.values().next().value.timer);await rejected;
    assert.equal(rpc.compact,false);assert.equal(rpc.uploadCursor,null);assert.equal(rpc.download,null);
    rpc.close();assert.equal(f.timers.size,0);
});

test('an acknowledged response from a retired socket cannot restore an old compact baseline',async()=>{
    const f=fixture(),{rpc,sockets,wire}=f;
    const connection=rpc.connect();sockets[0].open();await connection;rpc.compact=true;
    const snapshot=rpc.call.cursorSnapshot(),rejected=assert.rejects(snapshot,/connection lost/);await flush();
    sockets[0].reply(0,wire.wirePacket('retired',1,null,null,{tick:10,cursors:[],selections:[],editing:[]}));
    sockets[0].close();await rejected;
    assert.equal(rpc.download,null);assert.equal(rpc.compact,false);
    rpc.close();assert.equal(f.timers.size,0);
});

test('deltas overtaking a snapshot response are replayed exactly instead of triggering a resync loop',async()=>{
    const f=fixture(),{rpc,sockets,wire,notifications}=f;
    const connection=rpc.connect();sockets[0].open();await connection;
    const cursor=require('./helpers/wire-fixtures.cjs')()[0];
    const state=x=>({tick:10,cursors:[{name:'A',hue:134,cursor:{...cursor,x}}],selections:[],editing:[]});
    const send=packet=>sockets[0].message({jsonrpc:'2.0',method:'cursor-delta',params:[packet]});
    send(wire.wirePacket('epoch-a',1,null,null,state(.1)));
    send(wire.wirePacket('epoch-a',3,2,state(.2),state(.3)));await flush();
    send(wire.wirePacket('epoch-a',4,3,state(.3),state(.4)));
    sockets[0].reply(0,wire.wirePacket('epoch-a',2,null,null,state(.2)));await flush();
    assert.equal(sockets[0].sent.length,1);assert.equal(rpc.download.revision,4);
    assert.equal(notifications.at(-1).cursors[0].cursor.x,.4);
    assert.equal(rpc.waitingDeltas.length,0);assert.equal(rpc.requiredRevision,null);
    rpc.close();assert.equal(f.timers.size,0);
});

test('recovery buffers stay bounded and impossible revisions retire the connection after two snapshots',async()=>{
    const f=fixture(),{rpc,sockets,wire}=f;
    const connection=rpc.connect();sockets[0].open();await connection;
    const state={tick:10,cursors:[],selections:[],editing:[]};
    const initial=wire.wirePacket('epoch-a',1,null,null,state);
    sockets[0].message({jsonrpc:'2.0',method:'cursor-delta',params:[initial]});
    for(let i=3;i<603;i++)sockets[0].message({jsonrpc:'2.0',method:'cursor-delta',params:[wire.wirePacket('epoch-a',i,i-1,state,state)]});
    await flush();assert(rpc.waitingDeltas.length<=512);assert(rpc.waitingBytes<=1048576);
    sockets[0].reply(0,initial);await flush();assert.equal(sockets[0].sent.length,2);
    sockets[0].reply(1,initial);await flush();assert.equal(sockets[0].readyState,3);
    assert.equal(rpc.requiredRevision,null);assert.equal(rpc.waitingDeltas.length,0);
    rpc.close();assert.equal(f.timers.size,0);
});
