// Generated from src/kernel.js by npm run compile.
const COLLAB_ID = /^\d{14}-[a-z0-9]{7}$/;
const PAGE_COMMANDS = ['fileTree', 'outline', 'bookmark', 'tag', 'inbox', 'backlinks', 'graphView', 'globalGraph', 'globalSearch', 'dataHistory', 'riffCard', 'mainMenu', 'recentDocs'];
const PAGE_CONTROLS = ['barCommand','barWorkspace','barPlugins','barMode','barRiffCard','statusHelp'];

function validDocumentSpace(space) {
    return space && (space.gap===undefined || space.gap && ['before','inside','after'].includes(space.gap.side) &&
        Number.isFinite(space.gap.ratio) && space.gap.ratio>=0 && space.gap.ratio<=1 &&
        (space.gap.y===undefined || Number.isFinite(space.gap.y) && space.gap.y>=0 && space.gap.y<=1)) && Number.isSafeInteger(space.offset) && space.offset >= 0 && space.offset <= 10000000 &&
        Number.isFinite(space.x) && space.x >= 0 && space.x <= 1 && Number.isFinite(space.y) && Math.abs(space.y) <= 1000;
}

function validRegion(region) {
    return region && typeof region.id==='string' && (region.kind==='document' ? COLLAB_ID.test(region.id) : region.kind==='dock' && /^[\w-]{1,160}$/.test(region.id));
}

function cleanRegion(region) {
    if(!validRegion(region))throw Error('Invalid region');
    return {kind:region.kind,id:region.id};
}

function validPage(page, depth = 0) {
    if (!page || depth > 2 || typeof page.title !== 'string' || page.title.length > 160) return false;
    if (page.kind === 'workspace') return true;
    if (['participants','chord-settings','chord-name'].includes(page.kind)) return true;
    if (page.kind === 'control') return PAGE_CONTROLS.includes(page.control);
    if (page.kind === 'dock') return typeof page.id === 'string' && /^[\w-]{1,160}$/.test(page.id);
    if (page.kind === 'settings') return typeof page.section === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(page.section);
    if (page.kind === 'document') return COLLAB_ID.test(page.id) && typeof page.id === 'string';
    if (page.kind === 'command') return PAGE_COMMANDS.includes(page.command);
    if (page.kind === 'asset') {
        if(typeof page.path!=='string' || page.path.length>=1024)return false;
        let path;
        try { path=decodeURIComponent(page.path); } catch { return false; }
        return path.startsWith('assets/') && !/[\\\u0000-\u001f]/.test(path) && !path.split('/').includes('..');
    }
    if (page.kind === 'custom') return typeof page.id === 'string' && /^[\w-]{1,160}$/.test(page.id) && typeof page.icon === 'string' && /^icon[\w-]{1,80}$/.test(page.icon);
    if (page.kind === 'dialog') return typeof page.key === 'string' && page.key.length <= 100 && validPage(page.base, depth + 1);
    return false;
}

function pageKey(page) {
    return JSON.stringify(page && [page.kind,page.section,page.id,page.command,page.control,page.path,page.key,page.base && pageKey(page.base)]);
}


function cleanPage(page) {
    if (!validPage(page)) throw new Error('Invalid page');
    const result={kind:page.kind,title:page.title};
    const fields={settings:['section'],document:['id'],dock:['id'],command:['command'],control:['control'],asset:['path'],custom:['id','icon'],dialog:['key']};
    for (const key of fields[page.kind] || []) result[key]=page[key];
    if (page.kind==='dialog') result.base=cleanPage(page.base);
    return result;
}
function validUIAnchor(value) {
    if(value?.version===3)return validComponentAnchor(value);
    if(!value || !Array.isArray(value.path) || value.path.length>12 || !value.path.every(index=>Number.isSafeInteger(index)&&index>=0&&index<=10000) || typeof value.tag!=='string' || !/^[a-z][a-z0-9-]{0,39}$/.test(value.tag))return false;
    if(value.version!==2)return ['settings','dialog','layout','toolbar','body'].includes(value.kind);
    if(!['file','document','id','dock','tab','tab-control','status','settings-nav','settings','dialog','panel','layout','toolbar','body'].includes(value.kind))return false;
    for(const field of ['id','key','value','label','classes'])if(value[field]!==undefined && (typeof value[field]!=='string' || value[field].length>512))return false;
    if(value.attribute!==undefined && !['id','data-type','data-name','data-id','data-node-id','data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.offset!==undefined && (!['file','document'].includes(value.kind) || !Number.isSafeInteger(value.offset) || value.offset<0 || value.offset>10000000))return false;
    if(value.kind==='file')return typeof value.id==='string' && COLLAB_ID.test(value.id) && typeof value.key==='string' && (value.key==='' || COLLAB_ID.test(value.key)) &&
        ['text','icon','toggle','switch','viewers','new','more-file','more-root'].includes(value.part) && (value.part==='text' ? value.offset!==undefined:value.offset===undefined);
    if(value.page!==undefined && !validPage(value.page))return false;
    if(value.kind==='document')return validPage(value.page) && value.page.kind==='document';
    if(value.kind==='status' && !['data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.kind==='tab')return validPage(value.page) && ['tab','label','icon','close'].includes(value.part);
    if(['id','dock','tab-control','status','settings-nav','panel'].includes(value.kind))return typeof value.id==='string' && value.id.length>0;
    return ['settings','layout','body'].includes(value.kind) ? validPage(value.page):true;
}

function cleanUIAnchor(value) {
    if(!validUIAnchor(value))throw Error('Invalid UI anchor');
    if(value.version===3)return cleanComponentAnchor(value);
    const result={kind:value.kind,path:[...value.path],tag:value.tag};
    for(const key of ['version','id','key','part','attribute','value','label','classes','offset'])if(value[key]!==undefined)result[key]=value[key];
    if(value.page!==undefined)result.page=cleanPage(value.page);
    return result;
}

function validComponentStep(step) {
    return step && typeof step.key==='string' && /^[a-f0-9]{16}$/.test(step.key) &&
        (step.nameKey===undefined || typeof step.nameKey==='string' && /^[a-f0-9]{16}$/.test(step.nameKey)) &&
        Number.isSafeInteger(step.count) && step.count>0 && step.count<=10000 &&
        Number.isSafeInteger(step.index) && step.index>=0 && step.index<step.count;
}

function validComponentRoute(route) {
    return Array.isArray(route) && route.length<=32 && route.every(validComponentStep);
}

function validComponentEdge(edge) {
    return edge && ['start','end'].includes(edge.side) && (edge.kind==='self' || edge.kind==='paint' || edge.kind==='image' || edge.kind==='list' || edge.kind==='list-first' || edge.kind==='list-last' || edge.kind==='frame' || edge.kind==='frame-box' || edge.kind==='field' || edge.kind==='field-viewport' || edge.kind==='range-thumb' || edge.kind==='range-track' || edge.kind==='switch-thumb' || edge.kind==='switch-track' || edge.kind==='switch-halo' || ['checkbox-face','checkbox-background','checkbox-check','checkbox-dash','color-swatch','color-fill'].includes(edge.kind) || ['scrollbar-x-thumb','scrollbar-y-thumb','scrollbar-x-before','scrollbar-y-before','scrollbar-x-after','scrollbar-y-after','scrollbar-corner','picker-box','picker-border','picker-viewport','picker-content'].includes(edge.kind) ||
        edge.kind==='child' && validComponentStep(edge.step) ||
        edge.kind==='text' && Number.isSafeInteger(edge.offset) && edge.offset>=0 && edge.offset<=10000000);
}

function validComponentAnchor(value) {
    const scope=value.scope;
    return value.kind==='component' && scope && ['document','dock','dialog','floating','tab','global','av','calendar','tree','control'].includes(scope.kind) &&
        typeof scope.key==='string' && /^[a-f0-9]{16}$/.test(scope.key) &&
        (scope.kind!=='av' || [scope.row,scope.column].every(value=>typeof value==='string' && /^[a-f0-9]{16}$/.test(value))) &&
        (scope.group===undefined || scope.kind==='av' && typeof scope.group==='string' && /^[a-f0-9]{16}$/.test(scope.group)) &&
        (scope.part===undefined || scope.kind==='av' && typeof scope.group==='string' && ['header','footer','field','row-control','header-control','row','header-row','footer-row','group-title','group'].includes(scope.part)) &&
        (scope.pane===undefined || typeof scope.pane==='string' && /^[a-f0-9]{16}$/.test(scope.pane)) &&
        validComponentRoute(value.route) && (value.frame===undefined || validComponentRoute(value.frame)) && (value.target===undefined || validComponentRoute(value.target)) &&
        (value.frames===undefined || value.frame===undefined && Array.isArray(value.frames) && value.frames.length>=2 && value.frames.length<=8 && value.frames.every(validComponentRoute)) &&
        ['x','y'].every(axis=>Array.isArray(value.edges?.[axis]) && value.edges[axis].length===2 && value.edges[axis].every(validComponentEdge)) &&
        (value.textHash===undefined || typeof value.textHash==='string' && /^[a-f0-9]{16}$/.test(value.textHash)) &&
        (value.imagePoint===undefined || value.imagePoint && [value.imagePoint.x,value.imagePoint.y].every(number=>Number.isFinite(number) && number>=0 && number<=1)) &&
        (value.pdf===undefined || value.graph===undefined && value.frame===undefined && value.frames===undefined && value.imagePoint===undefined && value.pdf &&
            typeof value.pdf.file==='string' && /^[a-f0-9]{16}$/.test(value.pdf.file) &&
            ['page','thumbnail'].includes(value.pdf.part) &&
            Number.isSafeInteger(value.pdf.page) && value.pdf.page>0 && value.pdf.page<=100000 &&
            [value.pdf.x,value.pdf.y].every(number=>Number.isFinite(number) && Math.abs(number)<=10000000) &&
            (value.pdf.mark===null || typeof value.pdf.mark==='string' && /^[a-f0-9]{16}$/.test(value.pdf.mark))) &&
        (value.graph===undefined || value.frame===undefined && value.frames===undefined && value.graph &&
            (value.graph.node===null || typeof value.graph.node==='string' && /^[a-f0-9]{16}$/.test(value.graph.node)) &&
            typeof value.graph.layout==='string' && /^[a-f0-9]{16}$/.test(value.graph.layout) &&
            [value.graph.x,value.graph.y].every(number=>Number.isFinite(number) && Math.abs(number)<=10000000));
}

function cleanComponentAnchor(value) {
    const step=s=>({key:s.key,count:s.count,index:s.index,...(s.nameKey ? {nameKey:s.nameKey}:{})});
    const edge=e=>({kind:e.kind,side:e.side,...(e.kind==='child' ? {step:step(e.step)}:e.kind==='text' ? {offset:e.offset}:{})});
    return {version:3,kind:'component',scope:{kind:value.scope.kind,key:value.scope.key,...(value.scope.pane ? {pane:value.scope.pane}:{}),...(value.scope.kind==='av' ? {row:value.scope.row,column:value.scope.column,...(value.scope.group ? {group:value.scope.group}:{}),...(value.scope.part ? {part:value.scope.part}:{})}:{})},
        route:value.route.map(step),...(value.frame ? {frame:value.frame.map(step)}:{}),...(value.target ? {target:value.target.map(step)}:{}),
        ...(value.frames ? {frames:value.frames.map(route=>route.map(step))}:{}),
        edges:{x:value.edges.x.map(edge),y:value.edges.y.map(edge)},...(value.textHash ? {textHash:value.textHash}:{}),
        ...(value.imagePoint ? {imagePoint:{x:value.imagePoint.x,y:value.imagePoint.y}}:{}),
        ...(value.graph ? {graph:{node:value.graph.node,layout:value.graph.layout,x:value.graph.x,y:value.graph.y}}:{}),
        ...(value.pdf ? {pdf:{file:value.pdf.file,page:value.pdf.page,part:value.pdf.part,x:value.pdf.x,y:value.pdf.y,mark:value.pdf.mark}}:{})};
}
function validShortcut(value) {
    return typeof value==='string' && value.length<=80 && /^(?:(?:Ctrl|Meta|Alt|Shift)\+){1,4}(?:[A-Z0-9]|F\d{1,2}|Arrow(?:Up|Down|Left|Right)|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|[+\-=,./;`\[\]\\])$/.test(value);
}

function validEditing(editing) {
    return editing && (editing.region===undefined || validRegion(editing.region)) &&
        [editing.documentId,editing.blockId].every(id=>typeof id==='string' && COLLAB_ID.test(id)) &&
        (editing.blockIds===undefined || Array.isArray(editing.blockIds) && editing.blockIds.length>0 && editing.blockIds.length<=10000 &&
            editing.blockIds.every(id=>typeof id==='string' && COLLAB_ID.test(id)) &&
            new Set(editing.blockIds).size===editing.blockIds.length && editing.blockIds.includes(editing.blockId));
}

// Version 1 field indices are append-only; reordering requires a new wire version.
const CHORD_WIRE_KEYS = 'x y kind id documentId blockId surface region page title state dragging screen space offset gap side ratio text ui version scope key route count index nameKey frame frames target edges step textHash imagePoint pdf file part mark graph node layout row column group pane tick cursors selections editing name hue cursor selection anchor focus blockIds wire'.split(' ');
const CHORD_WIRE_INDEX = new Map(CHORD_WIRE_KEYS.map((key, index) => [key, index]));

function wireKey(key) { return CHORD_WIRE_INDEX.has(key) ? CHORD_WIRE_INDEX.get(key) : key; }
function wireReadKey(key) {
    if (Number.isInteger(key) && key >= 0 && key < CHORD_WIRE_KEYS.length) return CHORD_WIRE_KEYS[key];
    if (typeof key === 'string' && key.length <= 160 && !['__proto__', 'constructor', 'prototype'].includes(key)) return key;
    throw Error('Invalid compact field');
}

function wirePack(value) {
    if (Array.isArray(value)) return [4, ...value.map(item => wirePack(item ?? null))];
    if (value && typeof value === 'object') return [3, ...Object.entries(value).filter(([, value]) => value !== undefined).flatMap(([key, value]) => [wireKey(key), wirePack(value)])];
    if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return value;
    throw Error('Invalid compact value');
}

function wireBudget() { return { nodes: 0 }; }
function wireCheck(budget, depth) {
    if (++budget.nodes > 4194304 || depth > 64) throw Error('Compact message too complex');
}

function wireUnpack(value, budget = wireBudget(), depth = 0) {
    wireCheck(budget, depth);
    if (!Array.isArray(value)) {
        if (value === null || typeof value === 'boolean' || typeof value === 'string' && value.length <= 2097152 || typeof value === 'number' && Number.isFinite(value)) return value;
        throw Error('Invalid compact value');
    }
    if (value[0] === 4) return value.slice(1).map(item => wireUnpack(item, budget, depth + 1));
    if (value[0] !== 3 || value.length % 2 !== 1) throw Error('Invalid compact object');
    const result = {};
    for (let index = 1; index < value.length; index += 2) {
        const key = wireReadKey(value[index]);
        if (Object.hasOwn(result, key)) throw Error('Duplicate compact field');
        result[key] = wireUnpack(value[index + 1], budget, depth + 1);
    }
    return result;
}

// Patches replace exact values; coordinates are never rounded or arithmetically accumulated.
function wireDiff(before, after) {
    if (before === after) return null;
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after) || Array.isArray(after) && before.length !== after.length) return [0, wirePack(after)];
    const patch = [1];
    for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) patch.push(wireKey(key), [2]);
    for (const [key, value] of Object.entries(after)) {
        const child = Object.hasOwn(before, key) ? wireDiff(before[key], value) : [0, wirePack(value)];
        if (child) patch.push(Array.isArray(after) ? Number(key) : wireKey(key), child);
    }
    return patch.length === 1 ? null : patch;
}

function wireApply(before, patch, budget = wireBudget(), depth = 0) {
    wireCheck(budget, depth);
    if (!Array.isArray(patch)) throw Error('Invalid compact patch');
    if (patch.length === 2 && patch[0] === 0) return wireUnpack(patch[1], budget, depth + 1);
    if (patch[0] !== 1 || patch.length % 2 !== 1 || !before || typeof before !== 'object') throw Error('Missing compact baseline');
    const array = Array.isArray(before), result = array ? before.slice() : { ...before }, seen = new Set();
    for (let index = 1; index < patch.length; index += 2) {
        const token = patch[index], child = patch[index + 1];
        const key = array ? token : wireReadKey(token);
        if (array && (!Number.isInteger(key) || key < 0 || key >= before.length) || seen.has(key)) throw Error('Invalid compact index');
        seen.add(key);
        if (Array.isArray(child) && child.length === 1 && child[0] === 2) {
            if (array || !Object.hasOwn(before, key)) throw Error('Invalid compact deletion');
            delete result[key];
        } else result[key] = wireApply(before[key], child, budget, depth + 1);
    }
    return result;
}

function wirePacket(epoch, revision, baseRevision, before, after) {
    return [1, epoch, revision, baseRevision, before === null ? [0, wirePack(after)] : wireDiff(before, after) || [1]];
}

function wireReceive(baseline, packet) {
    if (!Array.isArray(packet) || packet.length !== 5 || packet[0] !== 1 || typeof packet[1] !== 'string' || !/^[a-z0-9-]{1,64}$/.test(packet[1]) || !Number.isSafeInteger(packet[2]) || packet[2] < 1 ||
        packet[3] !== null && (!Number.isSafeInteger(packet[3]) || packet[3] < 1 || packet[3] >= packet[2])) throw Error('Invalid compact revision');
    const [, epoch, revision, baseRevision, patch] = packet;
    if (baseline?.epoch === epoch && revision <= baseline.revision) return baseline;
    if (baseRevision === null) {
        if (!Array.isArray(patch) || patch[0] !== 0) throw Error('Invalid compact snapshot');
    } else if (!baseline || baseline.epoch !== epoch || baseline.revision !== baseRevision) throw Object.assign(Error('Missing compact revision'), {code:'WIRE_BASELINE'});
    return { epoch, revision, value: wireApply(baseRevision === null ? null : baseline.value, patch) };
}

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
