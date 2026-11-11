const { plugin, rpc, logger, storage } = siyuan;
const sessions = new Map();
const rpcMethods = new Map(), streams = new Set();
let peerSequence = 0;
let presenceRevision = 0;
const SESSION_TIMEOUT = 90000;
let sweepTimer;
let cursorTimer;
let tick = 10;
let cursorDirty = false;
let settingsWrite = Promise.resolve();
const wireEpoch = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
let wireEnabled = false, wireRevision = 0, wireState = null, wireForceFull = false, cursorFlush = null;
const BLOCK_ID = /^\d{14}-[a-z0-9]{7}$/;

function normalizeCursor(value) {
    if(value?.dragging!==undefined && typeof value.dragging!=='boolean')throw Error('Invalid dragging state');
    if(value?.state!==undefined && !['editing','typing'].includes(value.state))throw Error('Invalid cursor state');
    const metadata={...(value?.region!==undefined ? {region:cleanRegion(value.region)}:{}),...(value?.state!==undefined ? {state:value.state}:{}),...(value?.dragging!==undefined ? {dragging:value.dragging}:{})};
    if (value?.surface === 'ui') {
        if (value.documentId !== null || value.blockId !== null || !validUIAnchor(value.ui) || ![value.x,value.y,value.screen?.x,value.screen?.y].every((n)=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1)) throw new Error('Invalid UI cursor');
        return {...metadata,surface:'ui',documentId:null,blockId:null,page:cleanPage(value.page),ui:cleanUIAnchor(value.ui),screen:{x:value.screen.x,y:value.screen.y},x:value.x,y:value.y};
    }
    if (value === null) return null;
    if (!value || !["document", "tree"].includes(value.surface) || typeof value.blockId !== "string" || !BLOCK_ID.test(value.blockId) ||
        (value.surface === "document" ? typeof value.documentId !== "string" || !BLOCK_ID.test(value.documentId) : value.documentId !== null) ||
        ![value.x, value.y].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1)) {
        throw new Error("Invalid cursor anchor");
    }
    const cursor = { ...metadata, surface: value.surface, documentId: value.documentId, blockId: value.blockId, x: value.x, y: value.y };
    if (value.space !== undefined) {
        if (value.surface !== 'document' || value.text !== undefined || !validDocumentSpace(value.space)) throw new Error('Invalid cursor document space');
        cursor.space = { offset: value.space.offset, x: value.space.x, y: value.space.y, ...(value.space.gap ? {gap:{side:value.space.gap.side,ratio:value.space.gap.ratio,...(value.space.gap.y!==undefined ? {y:value.space.gap.y}:{})}}:{}) };
    }
    if (value.text !== undefined) {
        if (value.surface !== "document" || !value.text || !Number.isSafeInteger(value.text.offset) || value.text.offset < 0 || value.text.offset > 10000000 ||
            ![value.text.x, value.text.y].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1)) throw new Error("Invalid cursor text anchor");
        cursor.text = { offset: value.text.offset, x: value.text.x, y: value.text.y };
    }
    if (value.page !== undefined) {
        if (![value.screen?.x,value.screen?.y].every((n)=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1)) throw new Error('Invalid screen position');
        cursor.page=cleanPage(value.page);cursor.screen={x:value.screen.x,y:value.screen.y};
    }
    return cursor;
}

function normalizeSelection(value) {
    if (value === null) return null;
    if (!value || typeof value.documentId !== "string" || !BLOCK_ID.test(value.documentId) || [value.anchor, value.focus].some((point) =>
        !point || typeof point.blockId !== "string" || !BLOCK_ID.test(point.blockId) || !Number.isSafeInteger(point.offset) || point.offset < 0 || point.offset > 10000000)) {
        throw new Error("Invalid text selection");
    }
    return { ...(value.region!==undefined ? {region:cleanRegion(value.region)}:{}), documentId: value.documentId, anchor: { blockId: value.anchor.blockId, offset: value.anchor.offset }, focus: { blockId: value.focus.blockId, offset: value.focus.offset } };
}

function normalizeEditing(value) {
    if (value === null) return null;
    const region=value?.region!==undefined ? cleanRegion(value.region):undefined;
    if (!validEditing(value)) throw new Error("Invalid editing activity");
    return { ...(region ? {region}:{}), documentId: value.documentId, blockId: value.blockId,
        ...(value.blockIds!==undefined ? {blockIds:[...value.blockIds]}:{}) };
}

function cursorSnapshot(excludeId) {
    const clients=[...sessions.values()].filter(client=>client!==sessions.get(excludeId));
    return { tick, cursors: clients.filter((client) => client.cursor && Date.now() - client.lastSeen < SESSION_TIMEOUT)
        .map(({ name, hue, cursor }) => ({ name, hue, cursor })),
        selections: clients.filter((client) => client.selection && Date.now() - client.lastSeen < SESSION_TIMEOUT)
            .map(({ name, hue, selection }) => ({ name, hue, selection })),
        editing: clients.filter((client) => client.editing && Date.now() - client.editingSeen < 30000 && Date.now() - client.lastSeen < SESSION_TIMEOUT)
            .map(({ name, hue, editing }) => ({ name, hue, editing })) };
}

async function bindRpc(name, handler, description) {
    rpcMethods.set(name,handler);
    await rpc.bind(name,handler,description);
}

async function sendStream(stream, message) {
    try {
        if(stream.closed)throw Error('Connection closed');
        if(stream.port.bufferedAmount>1048576)throw Error('Send buffer full');
        // apply owns its argument array; SiYuan exports native send arguments after this VM call returns.
        await stream.port.send.apply(stream.port,[JSON.stringify(message)]);
    } catch(error){stream.closed=true;streams.delete(stream);stream.port.close();throw error;}
}

async function flushStream(stream) {
    const client=sessions.get(stream.id);
    if(!client || client.generation!==stream.generation)return;
    const next=cursorSnapshot(stream.id),patch=stream.state ? wireDiff(stream.state,next):[0,wirePack(next)];
    if(!patch)return;
    const revision=stream.revision+1,packet=[1,wireEpoch,revision,stream.state ? stream.revision:null,patch];
    await sendStream(stream,{jsonrpc:'2.0',method:'cursor-delta',params:[packet]});
    stream.state=next;stream.revision=revision;
}

async function broadcastEvent(method, params) {
    await Promise.allSettled([...streams].filter(stream=>stream.id).map(stream=>sendStream(stream,{jsonrpc:'2.0',method,params})));
    await rpc.broadcast(method,params);
}

function openStream(request) {
    const port=request.port;
    if(request.url.path!=='/plugin/private/'+plugin.name+'/rpc'){port.close();return;}
    const stream={port,revision:0,state:null,pending:0,closed:false};streams.add(stream);
    port.onclose=()=>{stream.closed=true;streams.delete(stream);};
    port.onmessage=event=>{
        const respond=async()=>{
            let message,id=null;
            try {
                if(typeof event.data!=='string' || event.data.length>1048576)throw Error('Invalid RPC message');
                try{message=JSON.parse(event.data);}catch{throw Object.assign(Error('Parse error'),{code:-32700});}
                if(!message || message.jsonrpc!=='2.0' || !(typeof message.id==='string' || typeof message.id==='number' && Number.isFinite(message.id)) || typeof message.method!=='string' || !Array.isArray(message.params))throw Object.assign(Error('Invalid request'),{code:-32600});
                id=message.id;
                if(stream.pending>=64)throw Error('Too many pending requests');
                const handler=rpcMethods.get(message.method);if(!handler)throw Object.assign(Error('Method not found'),{code:-32601});
                stream.pending++;
                let result;
                try {
                    if(message.method==='cursorSync'){
                        const client=sessions.get(stream.id);if(!client || client.generation!==stream.generation)throw Error('Session expired or superseded');
                        await flushCursors();
                        if(!stream.state){stream.state=cursorSnapshot(stream.id);stream.revision++;}
                        result=wirePacket(wireEpoch,stream.revision,null,null,stream.state);
                    }else{
                        result=await handler(...message.params);
                        if(message.method==='presenceHeartbeat'){
                            const client=sessions.get(message.params[0]);
                            if(client?.direct){
                                for(const old of streams)if(old!==stream && old.id===message.params[0]){old.closed=true;streams.delete(old);old.port.close();}
                                stream.id=message.params[0];stream.generation=client.generation;
                            }
                        }
                        if(message.method==='setCursorTick')result=cursorSnapshot(stream.id);
                    }
                }finally{stream.pending--;}
                await sendStream(stream,{jsonrpc:'2.0',id,result:result ?? null});
            }catch(error){
                if(!stream.closed)await sendStream(stream,{jsonrpc:'2.0',id,error:{code:Number.isInteger(error.code) ? error.code:-32603,message:error.message}});
            }
        };
        respond().catch(()=>{});
    };
}

async function flushCursorState() {
    for (const client of sessions.values()) {
        if (client.editing && (Date.now() - client.editingSeen >= 30000 || Date.now() - client.lastSeen >= SESSION_TIMEOUT)) {
            client.editing = null;
            cursorDirty = true;
        }
        if(client.cursor?.state==='typing' && Date.now()-client.cursorSeen>=2000) {client.cursor={...client.cursor,state:'editing'};cursorDirty=true;}
        if (client.cursor && Date.now() - client.lastSeen >= SESSION_TIMEOUT) {
            client.cursor = null;
            cursorDirty = true;
        }
        if (client.selection && Date.now() - client.lastSeen >= SESSION_TIMEOUT) {
            client.selection = null;
            cursorDirty = true;
        }
    }
    if (cursorDirty) {
        cursorDirty = false;
        const state = cursorSnapshot();
        try {
            await Promise.allSettled([...streams].filter(stream=>stream.id).map(flushStream));
            const legacy=[...sessions.values()].filter(client=>!client.direct);
            if (wireEnabled) {
                const packet = wirePacket(wireEpoch, ++wireRevision, wireForceFull || !wireState ? null : wireRevision - 1, wireForceFull ? null : wireState, state);
                // Normalized activity stays immutable so unchanged selections need no deep traversal.
                wireState = state;
                wireForceFull = false;
                if(legacy.some(client=>client.wire))await rpc.broadcast('cursor-delta', [packet]);
            }
            if (legacy.some(client=>!client.wire)) await rpc.broadcast('cursor-changed', [state]);
        } catch (error) { cursorDirty = true; wireForceFull = true; throw error; }
    }
}

async function flushCursors() {
    if (cursorFlush) return cursorFlush;
    cursorFlush = flushCursorState();
    try { await cursorFlush; } finally { cursorFlush = null; }
}

function startCursorTimer() {
    clearInterval(cursorTimer);
    cursorTimer = setInterval(() => flushCursors().catch((error) => console.error("Cursor broadcast failed:", error)), 1000 / tick);
}

// shortcut: 每个前端窗口是一名参与者，接入账号身份后再做跨窗口去重。
function snapshot(selfId) {
    const clients = [...sessions.values()].map(({ peerId, name, documentId, hue, page }) => ({ peerId, name, documentId, hue, page:page || null }));
    const result = { count: clients.length, clients, revision:presenceRevision, wire: 1 };
    const self = sessions.get(selfId);
    if (self) {
        result.self = { peerId: self.peerId, name: self.name, hue: self.hue };
    }
    return result;
}

function validateSession(id) {
    if (typeof id !== "string" || !/^[a-z0-9-]{8,80}$/.test(id)) {
        throw new Error("Invalid presence session ID");
    }
}

function validateGeneration(generation) {
    if (!Number.isSafeInteger(generation) || generation < 0) throw new Error("Invalid session generation");
}

function normalizeName(value) {
    if (typeof value !== "string") {
        throw new Error("Invalid display name");
    }
    const name = value.normalize("NFKC").trim();
    if (!name || [...name].length > 24 || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(name)) {
        throw new Error("Invalid display name");
    }
    return name;
}

function nameTaken(name, selfId) {
    return [...sessions].some(([id, client]) => id !== selfId && client.name === name);
}

function assignName(preferredName, selfId) {
    if (preferredName && !nameTaken(preferredName, selfId)) {
        return preferredName;
    }
    const taken = new Set([...sessions].filter(([id]) => id !== selfId).map(([, client]) => client.name));
    for (let index = 1; ; index++) {
        let name = "";
        for (let value = index; value > 0; value = Math.floor((value - 1) / 26)) {
            name = String.fromCharCode(65 + (value - 1) % 26) + name;
        }
        if (!taken.has(name)) return name;
    }
}

function pruneSessions() {
    let changed = false;
    for (const [id, client] of sessions) {
        if (Date.now() - client.lastSeen >= SESSION_TIMEOUT) {
            sessions.delete(id);
            cursorDirty = true;
            changed = true;
        }
    }
    return changed;
}

function broadcastPresence() {
    presenceRevision++;
    return broadcastEvent("presence-changed", [snapshot()]);
}

async function expireSessions() {
    if (pruneSessions()) {
        await broadcastPresence();
    }
}

async function updateCursor(id, generation, sequence, value) {
    validateSession(id);
    validateGeneration(generation);
    if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid cursor sequence");
    const cursor = normalizeCursor(value);
    const client = sessions.get(id);
    if (!client || client.generation !== generation) throw new Error("Session expired or superseded");
    if (sequence <= (client.cursorSequence || 0)) return false;
    client.cursorSequence = sequence;
    client.wireCursor = null;
    if (JSON.stringify(client.cursor ?? null) !== JSON.stringify(cursor)) cursorDirty = true;
    client.cursor = cursor;
    client.cursorSeen = Date.now();
    return true;
}

plugin.lifecycle.onload = async () => {
    siyuan.server.private.ws.handler=openStream;
    try {
        const saved = await (await storage.get("cursor-settings.json")).json();
        if (Number.isInteger(saved.tick) && saved.tick >= 1 && saved.tick <= 30) tick = saved.tick;
    } catch { /* 首次安装没有设置文件，使用 10 tick/秒。 */ }
    await bindRpc("cursorSnapshot", async () => cursorSnapshot(), "Read current cursor positions and tick rate.");
    await bindRpc("setCursorTick", (value) => {
        if (!Number.isInteger(value) || value < 1 || value > 30) throw new Error("Tick must be an integer from 1 to 30");
        settingsWrite = settingsWrite.catch(() => {}).then(async () => {
            await storage.put("cursor-settings.json", JSON.stringify({ tick: value }));
            tick = value;
            startCursorTimer();
            cursorDirty = true;
            await flushCursors();
            return cursorSnapshot();
        });
        return settingsWrite;
    }, "Persist the shared cursor tick rate.");
    await bindRpc('cursorUpdate', updateCursor, "Update a frontend's content-relative pointer position.");
    await bindRpc('cursorSync', async () => {
        wireEnabled = true;
        await flushCursors();
        if (!wireState) { wireState = cursorSnapshot(); wireRevision++; }
        return wirePacket(wireEpoch, wireRevision, null, null, wireState);
    }, 'Read a revisioned, lossless display baseline.');
    await bindRpc('cursorDelta', async (id, generation, sequence, base, patch) => {
        validateSession(id); validateGeneration(generation);
        if (!Number.isSafeInteger(sequence) || sequence < 1 || base !== null && (!Number.isSafeInteger(base) || base < 1 || base >= sequence)) throw Error('Invalid compact cursor sequence');
        const client = sessions.get(id);
        if (!client || client.generation !== generation) throw Error('Session expired or superseded');
        if (sequence <= (client.cursorSequence || 0)) return false;
        if (base !== null && client.wireCursor?.sequence !== base) return {reset:1};
        if (base === null && (!Array.isArray(patch) || patch[0] !== 0)) throw Error('Invalid compact cursor baseline');
        const value = wireApply(base === null ? null : client.wireCursor.value, patch);
        const accepted = await updateCursor(id, generation, sequence, value);
        if (accepted && client.cursorSequence === sequence) client.wireCursor = {sequence, value:client.cursor};
        return accepted;
    }, 'Update an exact cursor using a validated lossless patch.');
    await bindRpc("selectionUpdate", async (id, generation, sequence, value) => {
        validateSession(id);
        validateGeneration(generation);
        if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid selection sequence");
        const selection = normalizeSelection(value);
        const client = sessions.get(id);
        if (!client || client.generation !== generation) throw new Error("Session expired or superseded");
        if (sequence <= (client.selectionSequence || 0)) return false;
        client.selectionSequence = sequence;
        if (JSON.stringify(client.selection ?? null) !== JSON.stringify(selection)) cursorDirty = true;
        client.selection = selection;
        return true;
    }, "Share text selection anchors.");
    await bindRpc("editingUpdate", async (id, generation, sequence, value) => {
        validateSession(id);
        validateGeneration(generation);
        if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid editing sequence");
        const editing = normalizeEditing(value);
        const client = sessions.get(id);
        if (!client || client.generation !== generation) throw new Error("Session expired or superseded");
        if (sequence <= (client.editingSequence || 0)) return false;
        client.editingSequence = sequence;
        if (JSON.stringify(client.editing ?? null) !== JSON.stringify(editing)) cursorDirty = true;
        client.editing = editing;
        client.editingSeen = Date.now();
        return true;
    }, "Share focused or selected blocks; never reserve them or restrict editing.");
    await bindRpc('shortcut', async (id,generation,sequence,value) => {
        validateSession(id);validateGeneration(generation);
        if (!Number.isSafeInteger(sequence) || sequence<1 || !validShortcut(value)) throw new Error('Invalid shortcut');
        const client=sessions.get(id);
        if (!client || client.generation!==generation) throw new Error('Session expired or superseded');
        if (sequence <= (client.shortcutSequence || 0)) return false;
        client.shortcutSequence=sequence;
        if (Date.now()-(client.shortcutAt ?? -Infinity)<1000/tick) return false;
        client.shortcutAt=Date.now();
        await broadcastEvent('shortcut-shown',[{peerId:client.peerId,name:client.name,hue:client.hue,keys:value,page:client.page || null}]);
        return true;
    },'Show a key combination without executing it or sharing clipboard content.');
    await bindRpc('pointerClick', async (id,generation,sequence,value) => {
        validateSession(id);validateGeneration(generation);
        if(!Number.isSafeInteger(sequence) || sequence<1)throw Error('Invalid click sequence');
        const cursor=normalizeCursor(value);if(!cursor)throw Error('Invalid click anchor');
        const client=sessions.get(id);
        if(!client || Date.now()-client.lastSeen>=SESSION_TIMEOUT || client.generation!==generation)throw Error('Session expired or superseded');
        if(sequence<=(client.clickSequence || 0))return false;
        client.clickSequence=sequence;
        client.clickTimes=(client.clickTimes || []).filter(time=>Date.now()-time<1000);
        if(client.clickTimes.length>=30)return false;
        client.clickTimes.push(Date.now());
        await broadcastEvent('pointer-clicked',[{peerId:client.peerId,name:client.name,hue:client.hue,cursor}]);
        return true;
    },'Show an ephemeral click at a validated content anchor; never execute a click.');
    await bindRpc("getStatus", async () => {
        await expireSessions();
        return { name: plugin.name, version: plugin.version, platform: plugin.platform, onlineCount: sessions.size };
    }, "Return kernel metadata and the online frontend count.");
    await bindRpc("presenceHeartbeat", async (id, state = {}) => {
        validateSession(id);
        if (!state || typeof state !== "object" || Array.isArray(state)) {
            throw new Error("Invalid presence state");
        }
        const preferredName = state.name === undefined || state.name === "" ? "" : normalizeName(state.name);
        if(state.hue!==undefined && (!Number.isInteger(state.hue) || state.hue<0 || state.hue>=360))throw Error('Invalid client hue');
        const generation = state.generation === undefined ? 0 : state.generation;
        validateGeneration(generation);
        if (state.documentId !== undefined && state.documentId !== null &&
            (typeof state.documentId !== "string" || !/^\d{14}-[a-z0-9]{7}$/.test(state.documentId))) {
            throw new Error("Invalid document ID");
        }
        const page=state.page === undefined ? undefined : state.page === null ? null : cleanPage(state.page);
        let changed = pruneSessions();
        let client = sessions.get(id);
        if (client && generation < client.generation) throw new Error("Session superseded by a refreshed client");
        if (!client) {
            client = { peerId: `peer-${++peerSequence}`, name: assignName(preferredName, id), documentId: null, hue: state.hue ?? Math.floor(Math.random() * 360), lastSeen: Date.now(), generation };
            sessions.set(id, client);
            changed = true;
        }
        if (client.generation !== generation) {
            client.cursor = null;
            client.cursorSequence = 0;
            client.selection = null;
            client.selectionSequence = 0;
            client.editing = null;
            client.editingSequence = 0;
            client.shortcutSequence = 0;
            client.shortcutAt = undefined;
            client.clickSequence=0;client.clickTimes=[];
            cursorDirty = true;
        }
        client.generation = generation;
        client.wire = state.wire === 1;
        client.direct = state.direct === 1;
        if (client.wire) wireEnabled = true;
        if (state.documentId !== undefined && client.documentId !== state.documentId) {
            client.documentId = state.documentId;
            if (client.cursor?.surface === "document" && client.cursor.documentId !== client.documentId) { client.cursor = null; cursorDirty = true; }
            if (client.selection && client.selection.documentId !== client.documentId) { client.selection = null; cursorDirty = true; }
            if (client.editing && client.editing.documentId !== client.documentId) { client.editing = null; cursorDirty = true; }
            changed = true;
        }
        if (page !== undefined && JSON.stringify(client.page ?? null) !== JSON.stringify(page)) { client.page=page; changed=true; }
        client.lastSeen = Date.now();
        if (client.editing) client.editingSeen = Date.now();
        if (changed) {
            await broadcastPresence();
        }
        return snapshot(id);
    }, "Register a frontend, assign its name and update its viewed document.");
    await bindRpc("presenceRename", async (id, value, generation = 0, hue) => {
        validateSession(id);
        validateGeneration(generation);
        const name = normalizeName(value);
        if(hue!==undefined && (!Number.isInteger(hue) || hue<0 || hue>=360))throw Error('Invalid client hue');
        await expireSessions();
        const client = sessions.get(id);
        if (!client) {
            throw new Error("Session expired");
        }
        if (generation !== client.generation) throw new Error("Session superseded by a refreshed client");
        if (nameTaken(name, id)) {
            throw new Error("Display name is already in use");
        }
        if (client.name !== name || hue!==undefined && client.hue!==hue) {
            client.name = name;
            if(hue!==undefined)client.hue=hue;
            cursorDirty = true;
            await broadcastPresence();
        }
        return snapshot(id);
    }, "Atomically change this frontend's display name and optional cursor hue.");
    await bindRpc("presenceLeave", async (id, generation = 0) => {
        validateSession(id);
        validateGeneration(generation);
        const expired = pruneSessions();
        const left = sessions.get(id)?.generation === generation && sessions.delete(id);
        if (left) cursorDirty = true;
        if (expired || left) {
            await broadcastPresence();
        }
        return snapshot();
    }, "Remove a frontend session.");
};

plugin.lifecycle.onrunning = () => {
    sweepTimer = setInterval(() => {
        expireSessions().catch((error) => console.error("Presence cleanup failed:", error));
    }, 15000);
    startCursorTimer();
    return logger.info("Collaboration document presence is running.");
};

plugin.lifecycle.onunload = async () => {
    siyuan.server.private.ws.handler=null;
    for(const stream of streams){stream.closed=true;stream.port.close();}streams.clear();rpcMethods.clear();
    clearInterval(sweepTimer);
    clearInterval(cursorTimer);
    sessions.clear();
    await Promise.all(["getStatus", "presenceHeartbeat", "presenceRename", "presenceLeave", "cursorSnapshot", "cursorSync", "cursorDelta", "cursorUpdate", "selectionUpdate", "editingUpdate", "shortcut", "pointerClick", "setCursorTick"].map((name) => rpc.unbind(name)));
};
