const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const json = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const flush = () => new Promise((resolve) => setImmediate(resolve));

async function createKernel(options = {}) {
    let now = 100000;
    const methods = new Map();
    const timers = new Map();
    const subscribers = new Set();
    const broadcasts = [];
    const storage = options.storage || new Map();
    const plugin = { ...json("plugin.json"), platform: "windows", lifecycle: {} };
    const rpc = {
        bind: async (name, callback) => { methods.set(name, callback); },
        unbind: async (name) => { methods.delete(name); },
        broadcast: async (name, args) => {
            broadcasts.push({ name, args });
            for (const handlers of subscribers) {
                handlers.get(name)?.(...args);
            }
        },
    };
    vm.runInNewContext(readFileSync(path.join(root, "kernel.js"), "utf8"), {
        siyuan: { plugin, rpc, logger: { info: async () => {} }, storage: {
            get: async (name) => { if (!storage.has(name)) throw new Error("Not found"); return { json: async () => JSON.parse(storage.get(name)) }; },
            put: async (name, value) => { if (options.writeFails) throw new Error("Storage unavailable"); storage.set(name, value); },
        } },
        Date: class extends Date { static now() { return now; } },
        setInterval(callback, delay) { const key = {}; timers.set(key, { callback, delay }); return key; },
        clearInterval(key) { timers.delete(key); },
        console,
    });
    await plugin.lifecycle.onload();
    await plugin.lifecycle.onrunning();
    return { plugin, methods, timers, subscribers, broadcasts, storage, advance(ms) { now += ms; } };
}

async function createFrontend(kernel, locale = "zh-CN", options = {}) {
    const commands = [];
    const menus = [];
    const messages = [];
    const timers = new Map();
    const handlers = new Map();
    const events = new Map();
    const listeners = new Map();
    const windowListeners = new Map();
    const attrs = new Map();
    const frames = new Map();
    let nextFrame = 0;
    const storage = options.storage || new Map();
    const opened = [];
    let completeOpen;
    const rows = [];
    function listen(map, name, handler) {
        if (!map.has(name)) {
            const handlers = new Set();
            const dispatch = (...args) => { for (const callback of handlers) callback(...args); };
            dispatch.handlers = handlers;
            map.set(name, dispatch);
        }
        map.get(name).handlers.add(handler);
    }
    function unlisten(map, name, handler) {
        const dispatch = map.get(name);
        dispatch?.handlers.delete(handler);
        if (dispatch && !dispatch.handlers.size) map.delete(name);
    }
    function element(tag) {
        const attributes = new Map();
        const classes = new Set();
        const properties = new Map();
        const node = {
            tagName: tag.toUpperCase(), children: [], textContent: "", parentElement: null,
            style: { setProperty: (name, value) => properties.set(name, value), removeProperty: (name) => properties.delete(name) },
            classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
            setAttribute: (name, value) => attributes.set(name, value),
            getAttribute: (name) => attributes.get(name) ?? null,
            removeAttribute: (name) => attributes.delete(name),
            append(...nodes) { nodes.forEach((child) => { child.parentElement = node; node.children.push(child); }); },
            before(child) { child.parentElement = node.parentElement; node.parentElement.children.splice(node.parentElement.children.indexOf(node), 0, child); },
            after(child) { child.parentElement = node.parentElement; node.parentElement.children.splice(node.parentElement.children.indexOf(node) + 1, 0, child); },
            remove() { if (node.parentElement) node.parentElement.children.splice(node.parentElement.children.indexOf(node), 1); },
            querySelector(selector) { const className = selector.split('.').at(-1); return node.children.find((child) => child.classList.contains(className)) || null; },
            listeners: new Map(),
            addEventListener(name, callback) { node.listeners.set(name, callback); }, focus() {}, select() {},
            closest() { return null; },
            getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0 }; },
            contains(child) { return child === node || node.children.some((item) => item.contains(child)); },
        };
        Object.defineProperty(node, "className", { set(value) { classes.clear(); value.split(/\s+/).forEach((name) => classes.add(name)); }, get() { return [...classes].join(" "); } });
        return node;
    }
    const document = {
        body: element("body"), activeDocument: options.documentId || null,
        addEventListener: (name, callback) => listen(listeners, name, callback),
        removeEventListener: (name, callback) => unlisten(listeners, name, callback),
        elementFromPoint: options.hitTest || (() => null),
        querySelector: () => null,
        querySelectorAll(selector) {
            if (selector.startsWith(".protyle")) return document.activeDocument ? [{ closest: () => null, querySelector: () => null, getAttribute: () => document.activeDocument }] : [];
            if (selector === ".sy__file .collab-presence") return rows.filter((row) => row.classList.contains("collab-presence"));
            return rows;
        },
        createElement: element,
        createElementNS: (_, name) => element(name),
    };
    function addRow(id) {
        const row = element("li"); row.setAttribute("data-node-id", id);
        const toggle = element("span"); toggle.className = "b3-list-item__toggle";
        const icon = element("span"); icon.className = "b3-list-item__icon";
        const text = element("span"); text.className = "b3-list-item__text"; row.append(toggle, icon, text);
        rows.push(row); return row;
    }
    async function renderFrames() {
        for (let round = 0; frames.size && round < 5; round++) {
            const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback()); await flush();
        }
        assert.equal(frames.size, 0);
    }
    kernel.subscribers.add(handlers);
    const button = { setAttribute: (name, value) => attrs.set(name, value), getBoundingClientRect: () => ({ width: 24, right: 100, bottom: 40 }) };
    class Plugin {
        constructor(options) { Object.assign(this, options); }
        addCommand(command) { commands.push(command); }
        addTopBar(options) { button.options = options; return button; }
    }
    class Menu {
        constructor() { this.items = []; menus.push(this); }
        addItem(item) { this.items.push(item); }
        open(position) { this.position = position; }
    }
    class Setting {
        constructor() { this.items = []; }
        addItem(item) { this.items.push(item); }
    }
    const moduleObject = { exports: {} };
    const runtime = {
        module: moduleObject,
        Date: class extends Date { static now() { return options.now ? options.now() : Date.now(); } },
        console: { error() {} },
        document,
        window: { addEventListener: (name, callback) => listen(windowListeners, name, callback), removeEventListener: (name, callback) => unlisten(windowListeners, name, callback) },
        sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        MutationObserver: class { observe() {} disconnect() {} },
        queueMicrotask,
        requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); },
        setInterval(callback, delay) { const key = {}; timers.set(key, { callback, delay }); return key; },
        clearInterval(key) { timers.delete(key); },
        setTimeout(callback, delay) { const key = {}; timers.set(key, { callback, delay }); return key; },
        clearTimeout(key) { timers.delete(key); },
        require(name) {
            assert.equal(name, "siyuan"); return { Plugin, Menu, Setting, getAllEditor: () => options.editors || [], getActiveEditor: () => options.editors?.[0], fetchSyncPost: (...args) => options.api(...args), showMessage: (...args) => messages.push(args), openTab: async (args) => {
            opened.push(args);
            await options.beforeOpen?.();
            if (options.openFails) throw new Error("Document unavailable");
            completeOpen = () => {
                document.activeDocument = args.doc.id;
                events.get("loaded-protyle-static")?.();
            };
            if (!options.lateDocument) completeOpen();
            return {};
        } }; },
    };
    vm.runInNewContext(readFileSync(path.join(root, "index.js"), "utf8"), runtime);
    const call = new Proxy({}, { get: (_, name) => (...args) => {
        if (!kernel.methods.has(name)) { return Promise.reject(new Error("Kernel unavailable")); }
        return kernel.methods.get(name)(...args);
    } });
    const plugin = new moduleObject.exports({
        name: kernel.plugin.name,
        app: { appId: "test-frontend" },
        displayName: kernel.plugin.displayName[locale] || kernel.plugin.displayName.default,
        i18n: json(`i18n/${locale}.json`),
        kernel: { rpc: {
            bind: async (name, callback) => { handlers.set(name, callback); },
            unbind: async (name) => { handlers.delete(name); },
            call,
        } },
        eventBus: { on: (name, callback) => events.set(name, callback), off: (name) => events.delete(name) },
    });
    await plugin.onload();
    const layout = plugin.onLayoutReady();
    if (!options.deferLayout) await layout;
    await flush();
    return { plugin, commands, menus, messages, timers, handlers, events, button, attrs, document, rows, addRow, renderFrames, storage, frames, opened, layout, listeners, windowListeners, completeOpen: () => completeOpen() };
}

test("refresh reuses identity and late old-instance requests cannot overwrite it", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel);
    const other = await createFrontend(kernel);
    let current = first;
    for (let index = 0; index < 3; index++) {
        const old = current;
        current = await createFrontend(kernel, "zh-CN", { storage: old.storage });
        assert.equal(current.plugin.sessionId, first.plugin.sessionId);
        assert.equal(current.plugin.clientName, first.plugin.clientName);
        assert.equal(current.plugin.onlineCount, 2);
        await assert.rejects(old.plugin.refreshOnline(), /stale|superseded/i);
        await old.plugin.onunload();
        assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 2);
    }
    await other.plugin.onunload();
    await current.plugin.onunload();
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 0);
});

test("each client restores its own document before reporting or replacing its checkpoint", async () => {
    const kernel = await createKernel();
    const docA = "20261030165150-skkm1a3";
    const docB = "20261030181047-hq4mcpf";
    const first = await createFrontend(kernel, "zh-CN", { documentId: docA });
    const second = await createFrontend(kernel, "zh-CN", { documentId: docB });
    let finishOpen;
    const reloaded = await createFrontend(kernel, "zh-CN", {
        storage: first.storage, documentId: docB, deferLayout: true,
        beforeOpen: () => new Promise((resolve) => { finishOpen = resolve; }),
    });
    reloaded.events.get("loaded-protyle-static")();
    await reloaded.renderFrames();
    await reloaded.plugin.refreshOnline();
    assert.equal(first.storage.get(`${first.plugin.name}:document`), docA);
    assert.equal(second.plugin.clients.find((c) => c.name === first.plugin.clientName).documentId, docA);
    assert.equal(reloaded.opened[0].doc.id, docA);
    assert.equal(reloaded.opened[0].removeCurrentTab, false);
    finishOpen();
    await reloaded.layout;
    await reloaded.renderFrames();
    assert.equal(reloaded.document.activeDocument, docA);
    assert.equal(second.document.activeDocument, docB);
    assert.equal(reloaded.plugin.onlineCount, 2);
    reloaded.document.activeDocument = null;
    reloaded.events.get("destroy-protyle")();
    await reloaded.renderFrames();
    const empty = await createFrontend(kernel, "zh-CN", { storage: reloaded.storage });
    assert.equal(empty.opened.length, 0);
});

test("restoration failure allows presence and normal document changes to continue", async () => {
    const kernel = await createKernel();
    const storage = new Map([[`${kernel.plugin.name}:document`, "20261030165150-skkm1a3"]]);
    const frontend = await createFrontend(kernel, "zh-CN", { storage, openFails: true });
    assert.equal(frontend.plugin.onlineCount, 1);
    assert.equal(frontend.messages.at(-1)[0], frontend.plugin.i18n.restoreFailed);
    assert.equal(frontend.messages.at(-1)[2], "error");
    frontend.document.activeDocument = "20261030181047-hq4mcpf";
    await frontend.plugin.refreshOnline();
    assert.equal(storage.get(`${kernel.plugin.name}:document`), frontend.document.activeDocument);
});

test("restoration waits for editor content after openTab has returned", async () => {
    const kernel = await createKernel();
    const docA = "20261030165150-skkm1a3";
    const docB = "20261030181047-hq4mcpf";
    const storage = new Map([[`${kernel.plugin.name}:document`, docA]]);
    const frontend = await createFrontend(kernel, "zh-CN", { storage, documentId: docB, lateDocument: true, deferLayout: true });
    assert.equal(frontend.plugin.layoutReady, false);
    frontend.events.get("switch-protyle")();
    await frontend.plugin.refreshOnline();
    assert.equal(storage.get(`${kernel.plugin.name}:document`), docA);
    frontend.completeOpen();
    await frontend.layout;
    assert.equal(frontend.plugin.onlineCount, 1);
    assert.equal(frontend.document.activeDocument, docA);
    assert.equal(frontend.messages.length, 0);
    assert.equal(frontend.timers.size, 4);
    await frontend.plugin.onunload();
    assert.equal(frontend.timers.size, 0);
});

test("missing documents time out and unloading cancels a pending restoration", async () => {
    const kernel = await createKernel();
    const storage = new Map([[`${kernel.plugin.name}:document`, "20261030165150-skkm1a3"]]);
    const frontend = await createFrontend(kernel, "zh-CN", { storage, lateDocument: true, deferLayout: true });
    [...frontend.timers.values()].find((timer) => timer.delay === 5000).callback();
    await frontend.layout;
    assert.equal(frontend.plugin.onlineCount, 1);
    assert.equal(frontend.messages.at(-1)[0], frontend.plugin.i18n.restoreFailed);
    const stopped = await createFrontend(kernel, "zh-CN", {
        storage: new Map([[`${kernel.plugin.name}:document`, "20261030165150-skkm1a3"]]), lateDocument: true, deferLayout: true,
    });
    await stopped.plugin.onunload();
    await stopped.layout;
    assert.equal(stopped.timers.size, 0);
    assert.equal(stopped.messages.length, 0);
});

test("kernel validates generations and rejects stale renames without changing presence", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    const rename = kernel.methods.get("presenceRename");
    const leave = kernel.methods.get("presenceLeave");
    for (const generation of [-1, "1", 0.5, null, Number.MAX_SAFE_INTEGER + 1]) {
        await assert.rejects(heartbeat("session-one", { generation }), /Invalid session generation/);
        await assert.rejects(rename("session-one", "Alice", generation), /Invalid session generation/);
        await assert.rejects(leave("session-one", generation), /Invalid session generation/);
    }
    const first = await heartbeat("session-one", { generation: 1 });
    await heartbeat("session-one", { generation: 2 });
    await assert.rejects(rename("session-one", "Other name", 1), /superseded/);
    assert.equal((await heartbeat("session-one", { generation: 2 })).self.name, first.self.name);
    assert.equal((await leave("session-one", 1)).count, 1);
});

test("manifest and locale resources match the kernel project", () => {
    const manifest = json("plugin.json");
    assert.equal(manifest.name, path.basename(root));
    assert.equal(manifest.version, json("package.json").version);
    assert.ok(manifest.kernels.includes("all"));
    for (const asset of ["kernel.js", "index.js", "index.css", manifest.icon, ...Object.values(manifest.readme)]) {
        assert.ok(existsSync(path.join(root, asset)), asset);
    }
    assert.deepEqual(Object.keys(json("i18n/en.json")).sort(), Object.keys(json("i18n/zh-CN.json")).sort());
});

test("cursor updates are ordered, private, idle while online and cleared on session expiry", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    await heartbeat("session-cursor", { generation: 1, name: "Alice" });
    const update = kernel.methods.get("cursorUpdate");
    const snapshot = kernel.methods.get("cursorSnapshot");
    const anchor = { surface: "document", documentId: "20261030165150-skkm1a3", blockId: "20261030181047-hq4mcpf", x: 0.2, y: 0.4, text: { offset: 123, x: 0.5, y: 0.3 } };
    const flushCursors = () => [...kernel.timers.values()].find((timer) => timer.delay === 100).callback();
    await update("session-cursor", 1, 2, anchor);
    assert.equal(await update("session-cursor", 1, 1, { ...anchor, x: 0.9 }), false);
    assert.equal((await snapshot()).cursors[0].cursor.x, 0.2);
    await flushCursors();
    assert.equal(kernel.broadcasts.at(-1).name, "cursor-changed");
    assert.ok(!JSON.stringify(kernel.broadcasts).includes("session-cursor"));
    const count = kernel.broadcasts.length;
    await flushCursors();
    assert.equal(kernel.broadcasts.length, count);
    for (const cursor of [undefined, {}, { ...anchor, blockId: "<script>" }, { ...anchor, x: Infinity }, { ...anchor, y: -0.1 }, { ...anchor, text: { offset: -1, x: 0, y: 0 } }, { ...anchor, text: { offset: 1, x: "0", y: 0 } }, { ...anchor, surface: "tree" }]) {
        await assert.rejects(update("session-cursor", 1, 3, cursor), /Invalid cursor/);
    }
    await assert.rejects(update("session-cursor", 1, 0, anchor), /sequence/);
    await heartbeat("session-cursor", { generation: 2 });
    await assert.rejects(update("session-cursor", 1, 3, anchor), /superseded/);
    assert.equal((await snapshot()).cursors.length, 0);
    await update("session-cursor", 2, 1, anchor);
    kernel.advance(6000);
    await flushCursors();
    assert.equal((await snapshot()).cursors.length, 1, "a stationary online pointer must remain visible");
    const idleBroadcasts = kernel.broadcasts.length;
    for (let index = 0; index < 5; index++) {
        kernel.advance(20000);
        await heartbeat("session-cursor", { generation: 2 });
        await flushCursors();
    }
    assert.equal((await snapshot()).cursors.length, 1);
    assert.equal(kernel.broadcasts.length, idleBroadcasts, "heartbeats must not resend cursor snapshots");
    await update("session-cursor", 2, 2, anchor);
    await flushCursors();
    assert.equal(kernel.broadcasts.length, idleBroadcasts, "duplicate updates must not cause a broadcast");
    kernel.advance(90000);
    await flushCursors();
    assert.equal((await snapshot()).cursors.length, 0);
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 0);
    await heartbeat("session-cursor", { generation: 2 });
    await update("session-cursor", 2, 2, { surface: "tree", documentId: null, blockId: anchor.blockId, x: 0.5, y: 0.5 });
    await kernel.methods.get("presenceLeave")("session-cursor", 2);
    await flushCursors();
    assert.equal((await snapshot()).cursors.length, 0);
    await heartbeat("session-cursor", { generation: 2, documentId: anchor.documentId });
    await update("session-cursor", 2, 1, anchor);
    await heartbeat("session-cursor", { generation: 2, documentId: "20261030165150-doc0002" });
    assert.equal((await snapshot()).cursors.length, 0, "switching documents clears the previous document anchor");
});

test("tick settings persist, broadcast live and preserve the old rate on write failure", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel);
    const second = await createFrontend(kernel);
    assert.equal((await kernel.methods.get("cursorSnapshot")()).tick, 10);
    const setTick = kernel.methods.get("setCursorTick");
    for (const tick of [0, 31, 1.5, "10", null]) await assert.rejects(async () => setTick(tick), /Tick/);
    await setTick(20);
    assert.equal(first.plugin.tick, 20);
    assert.equal(second.plugin.tick, 20);
    assert.ok([...first.timers.values()].some((timer) => timer.delay === 50));
    assert.equal([...first.timers.values()].filter((timer) => timer.delay < 1000).length, 1);
    const restarted = await createKernel({ storage: kernel.storage });
    assert.equal((await restarted.methods.get("cursorSnapshot")()).tick, 20);
    const broken = await createKernel({ writeFails: true });
    await assert.rejects(broken.methods.get("setCursorTick")(30), /Storage unavailable/);
    assert.equal((await broken.methods.get("cursorSnapshot")()).tick, 10);
    await first.plugin.onunload();
    await second.plugin.onunload();
    assert.equal(first.listeners.size, 0);
    assert.equal(first.windowListeners.size, 0);
    assert.equal(first.frames.size, 0);
});

test("text selections share the cursor channel without claiming locks; validate, order, deduplicate and reset", async () => {
    const kernel=await createKernel();
    const heartbeat=kernel.methods.get('presenceHeartbeat'), update=kernel.methods.get('selectionUpdate'), snapshot=kernel.methods.get('cursorSnapshot');
    const selection={documentId:'20261030165150-doc0001',anchor:{blockId:'20261030165150-block01',offset:3},focus:{blockId:'20261030165150-block02',offset:12}};
    await heartbeat('selection-user-one',{generation:1});await heartbeat('selection-user-two',{generation:1});
    await update('selection-user-one',1,2,{...selection,unused:'private text'});
    await update('selection-user-two',1,1,selection);
    assert.equal(await update('selection-user-one',1,1,null),false);
    assert.equal((await snapshot()).selections.length,2);
    assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,0);
    await [...kernel.timers.values()].find(timer=>timer.delay===100).callback();
    const wire=JSON.stringify(kernel.broadcasts.at(-1));
    assert.ok(wire.includes('selections')&&!wire.includes('selection-user')&&!wire.includes('private text'));
    for(const value of [undefined,{}, {...selection,documentId:'bad'}, {...selection,anchor:{blockId:'bad',offset:0}}, {...selection,focus:{...selection.focus,offset:-1}}, {...selection,focus:{...selection.focus,offset:10000001}}, {...selection,anchor:{...selection.anchor,offset:'3'}}]) {
        await assert.rejects(update('selection-user-one',1,3,value),/Invalid text selection/);
    }
    await assert.rejects(update('selection-user-one',1,0,selection),/sequence/);
    await heartbeat('selection-user-one',{generation:2});
    assert.equal((await snapshot()).selections.length,1);
    await assert.rejects(update('selection-user-one',1,4,selection),/superseded/);
    await update('selection-user-one',2,1,selection);
    await heartbeat('selection-user-one',{generation:2,documentId:selection.documentId});
    assert.equal((await snapshot()).selections.length,2);
    await heartbeat('selection-user-one',{generation:2,documentId:'20261030165150-doc0002'});
    assert.equal((await snapshot()).selections.length,1);
    kernel.advance(6000);
    await [...kernel.timers.values()].find(timer=>timer.delay===100).callback();
    assert.equal((await snapshot()).selections.length,1, 'unchanged selections live with the session');
    const broadcasts = kernel.broadcasts.length;
    await update('selection-user-two',1,2,selection);
    await [...kernel.timers.values()].find(timer=>timer.delay===100).callback();
    assert.equal(kernel.broadcasts.length,broadcasts);
    kernel.advance(84000);
    await [...kernel.timers.values()].find(timer=>timer.delay===100).callback();
    assert.equal((await snapshot()).selections.length,0);
    await heartbeat('selection-user-one',{generation:2});
    await update('selection-user-one',2,2,selection);
    await update('selection-user-one',2,3,null);
    assert.equal((await snapshot()).selections.length,0);
});

test("editing automatically claims the selected block; copy stays available and Escape releases it", async () => {
    const kernel=await createKernel(), frontend=await createFrontend(kernel);
    const context={documentId:'20261030165150-doc0001',blocks:[{blockId:'20261030165150-block01',ancestors:[]}]};
    frontend.plugin.editing.context=()=>context;
    frontend.listeners.get('pointerdown')({button:0});frontend.listeners.get('selectionchange')();
    await flush();assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,0);
    const input=mutation();frontend.plugin.editing.guard(input);
    assert.equal(input.prevented,true);await flush();assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,1);
    const copy={...mutation('keydown','c'),ctrlKey:true};frontend.plugin.editing.guard(copy);assert.equal(copy.prevented,false);
    const target={closest:()=>null};
    const rightClick = {...mutation('click'),button:2,target};frontend.listeners.get('click')(rightClick);await flush();
    assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,1);
    frontend.listeners.get('click')({...mutation('click'),button:0,target});await flush();
    assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,1);
    const sequence=frontend.plugin.editing.sequence;
    frontend.listeners.get('click')({...mutation('click'),button:0,target});await flush();
    assert.equal(frontend.plugin.editing.sequence,sequence,'repeated clicks duplicated the claim');
    const permitted=mutation();frontend.plugin.editing.guard(permitted);assert.equal(permitted.prevented,false);
    frontend.plugin.editing.guard(mutation('keydown','Escape'));await flush();
    assert.equal((await kernel.methods.get('editSnapshot')()).locks.length,0);
    assert.equal(frontend.plugin.editing.editTarget,null);
    await frontend.plugin.onunload();assert.equal(frontend.listeners.size,0);
});

test("transient empty selection during click does not cancel an edit grant", async () => {
    const kernel = await createKernel(), frontend = await createFrontend(kernel);
    const edit = frontend.plugin.editing;
    const context = { documentId: editDoc, blocks: [editA] };
    frontend.document.activeDocument = editDoc;
    let selected = context, finish;
    edit.context = () => selected;
    const claim = kernel.methods.get("editClaim");
    kernel.methods.set("editClaim", async (...args) => {
        const state = await claim(...args);
        return args[4].length ? new Promise(resolve => { finish = () => resolve(state); }) : state;
    });
    const activated = edit.activate(context);
    await flush();
    const sequence = edit.sequence;
    selected = null; edit.handleSelection();
    selected = context; edit.handleSelection();
    assert.equal(edit.sequence, sequence, "temporary selection loss must not release the pending grant");
    finish();
    assert.equal(await activated, true);
    const input = mutation(); edit.guard(input);
    assert.equal(input.prevented, false);
    frontend.document.activeDocument = "20261030165150-doc0002";
    selected = null; frontend.events.get("switch-protyle")();
    await frontend.renderFrames();
    assert.equal(edit.editTarget, null, "a real document switch must still cancel editing");
    await frontend.plugin.onunload();
});

test("editing queued behind a previous save can be cancelled before its claim is sent", async () => {
    const f = await historyFixture();
    const edit = f.frontend.plugin.editing;
    await edit.activate({ documentId: editDoc, blocks: [editA] });
    let finish;
    f.setFlush(() => new Promise(resolve => { finish = resolve; }));
    const released = edit.release();
    const activated = edit.activate({ documentId: editDoc, blocks: [editB] });
    edit.release();
    await flush();
    finish();
    await released;
    assert.equal(await activated, false, "cancelled click must not acquire a stale lock after saving");
    assert.equal((await f.kernel.methods.get("editSnapshot")()).locks.length, 0);
    await f.frontend.plugin.onunload();
});

test("click reports a foreign lock or connection failure instead of silently ignoring it", async () => {
    const kernel = await createKernel(), first = await createFrontend(kernel), second = await createFrontend(kernel);
    const context = { documentId: editDoc, blocks: [editA] };
    first.plugin.editing.context = () => context;
    await second.plugin.editing.activate(context);
    await first.plugin.editing.handleClick({ button: 0 });
    assert.equal(first.messages.at(-1)[0], first.plugin.i18n.editLocked.replace("${name}", second.plugin.clientName));
    await second.plugin.editing.release();
    kernel.methods.set("editClaim", async () => { throw new Error("offline"); });
    await first.plugin.editing.handleClick({ button: 0 });
    assert.equal(first.messages.at(-1)[0], first.plugin.i18n.editUnavailable);
    await first.plugin.onunload(); await second.plugin.onunload();
});

test("settings form validates and saves the tick rate through the kernel", async () => {
    const kernel = await createKernel();
    const frontend = await createFrontend(kernel);
    assert.equal(frontend.plugin.displayName, "和弦");
    const form = frontend.plugin.setting.items[0].createActionElement();
    const [input, save, error] = form.children;
    assert.equal(input.value, "10");
    const submit = form.listeners.get("submit");
    input.value = "2.5";
    await submit({ preventDefault() {} });
    assert.equal(error.textContent, frontend.plugin.i18n.cursorTickFailed);
    input.value = "15";
    await submit({ preventDefault() {} });
    assert.equal(frontend.plugin.tick, 15);
    assert.equal(save.disabled, false);
    assert.equal(frontend.messages.at(-1)[0], frontend.plugin.i18n.cursorTickSaved);
});

test("pointer updates are throttled and leave clears the remote marker", async () => {
    const kernel = await createKernel();
    let now = Date.now();
    const frontend = await createFrontend(kernel, "zh-CN", { now: () => now });
    const row = frontend.addRow("20261030165150-skkm1a3");
    row.closest = (selector) => selector.startsWith(".sy__file") ? row : null;
    row.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 40 });
    frontend.document.elementFromPoint = () => row;
    frontend.listeners.get("pointermove")({ clientX: 100, clientY: 20, pointerType: "mouse" });
    await frontend.plugin.sendCursor();
    const firstSequence = frontend.plugin.cursorSequence;
    now += 6000;
    kernel.advance(6000);
    await frontend.plugin.sendCursor();
    assert.equal(frontend.plugin.cursorSequence, firstSequence, "no resend even after the old 1s and 5s deadlines");
    let snapshot = await kernel.methods.get("cursorSnapshot")();
    assert.equal(snapshot.cursors[0].cursor.x, 0.25);
    // 鼠标不动、列表滚动后，同一屏幕位置重新锚定到行内的新位置。
    row.getBoundingClientRect = () => ({ left: 0, top: -10, width: 400, height: 40 });
    frontend.listeners.get("scroll")();
    await frontend.plugin.sendCursor();
    snapshot = await kernel.methods.get("cursorSnapshot")();
    assert.equal(snapshot.cursors[0].cursor.y, 0.75);
    frontend.listeners.get("pointerout")({ relatedTarget: null });
    await frontend.plugin.sendCursor();
    assert.equal((await kernel.methods.get("cursorSnapshot")()).cursors.length, 0);
    assert.throws(() => frontend.plugin.updateCursors({ tick: 10, cursors: [{ name: "bad", hue: 0, cursor: { x: NaN } }] }), /Invalid cursor response/);
});

test("reconnection and long suspension resend unchanged anchors once", async () => {
    const kernel = await createKernel();
    let now = Date.now();
    const frontend = await createFrontend(kernel, "zh-CN", { now: () => now });
    const row = frontend.addRow("20261030165150-skkm1a3");
    row.closest = (selector) => selector.startsWith(".sy__file") ? row : null;
    row.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 40 });
    frontend.document.elementFromPoint = () => row;
    frontend.plugin.pointer = { x: 100, y: 20 };
    await frontend.plugin.sendCursor();
    const sequence = frontend.plugin.cursorSequence;
    await frontend.events.get("kernel-plugin-state-change")({ detail: { code: 2 } });
    await flush();
    await frontend.plugin.sendCursor();
    assert.equal(frontend.plugin.cursorSequence, sequence + 1);
    await frontend.plugin.sendCursor();
    assert.equal(frontend.plugin.cursorSequence, sequence + 1);
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    kernel.methods.set("presenceHeartbeat", async () => { throw new Error("offline"); });
    await frontend.plugin.refreshInBackground();
    assert.equal(frontend.plugin.lastCursorSignature, undefined);
    assert.equal(frontend.plugin.lastSelectionSignature, undefined);
    kernel.methods.set("presenceHeartbeat", heartbeat);
    await frontend.plugin.refreshOnline();
    await frontend.plugin.sendCursor();
    assert.equal(frontend.plugin.cursorSequence, sequence + 2);
    now += 90000;
    kernel.advance(90000);
    await frontend.plugin.refreshOnline();
    await frontend.plugin.sendCursor();
    assert.equal(frontend.plugin.cursorSequence, sequence + 3);
    assert.equal((await kernel.methods.get("cursorSnapshot")()).cursors.length, 1);
    frontend.plugin.updatePresence({ count: 0, clients: [] });
    assert.equal(frontend.plugin.lastCursorSignature, undefined, "an expired session must reannounce its cursor on rejoining");
    frontend.document.hidden = true;
    frontend.listeners.get("visibilitychange")();
    await frontend.plugin.sendCursor();
    assert.equal((await kernel.methods.get("cursorSnapshot")()).cursors.length, 0);
    await frontend.plugin.onunload();
});

test("remote glowing pointers follow local scrolling, stay text-only and exclude self", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel);
    const second = await createFrontend(kernel);
    const row = first.addRow("20261030165150-skkm1a3");
    let top = 80;
    row.getBoundingClientRect = () => ({ left: 10, top, width: 200, height: 40 });
    first.document.elementFromPoint = () => row;
    const cursor = { surface: "tree", documentId: null, blockId: "20261030165150-skkm1a3", x: 0.5, y: 0.5 };
    const update = kernel.methods.get("cursorUpdate");
    await update(first.plugin.sessionId, first.plugin.generation, 1, cursor);
    await update(second.plugin.sessionId, second.plugin.generation, 1, cursor);
    const flushCursors = () => [...kernel.timers.values()].find((timer) => timer.delay === 100).callback();
    await flushCursors();
    await first.renderFrames();
    assert.equal(first.plugin.cursorMarkers.size, 1);
    let marker = first.plugin.cursorMarkers.get(second.plugin.clientName);
    assert.equal(marker.style.transform, "translate3d(110px, 100px, 0)");
    assert.equal(marker.style.opacity, "1");
    marker.getBoundingClientRect = () => ({ left: 110, top: 100, right: 250, bottom: 140 });
    first.listeners.get("pointermove")({ clientX: 270, clientY: 145, pointerType: "mouse" });
    await first.renderFrames();
    assert.equal(marker.style.opacity, "0.3", "fade near the full name label, not just the arrow tip");
    first.listeners.get("pointermove")({ clientX: 300, clientY: 145, pointerType: "mouse" });
    await first.renderFrames();
    assert.equal(marker.style.opacity, "1", "restore when the local pointer moves away");
    first.listeners.get("pointermove")({ clientX: 120, clientY: 100, pointerType: "mouse" });
    await first.renderFrames();
    assert.equal(marker.style.opacity, "0.3");
    first.listeners.get("pointerout")({ relatedTarget: null });
    await first.renderFrames();
    assert.equal(marker.style.opacity, "1", "restore after the local pointer leaves the window");
    top = 20;
    first.listeners.get("scroll")();
    await first.renderFrames();
    assert.equal(marker.style.transform, "translate3d(110px, 40px, 0)");
    assert.equal(marker.style.transitionDuration, "0ms");
    const renamed = await kernel.methods.get("presenceRename")(second.plugin.sessionId, "<b>Alice</b>", second.plugin.generation);
    second.plugin.updatePresence(renamed);
    await flushCursors();
    await first.renderFrames();
    marker = first.plugin.cursorMarkers.get("<b>Alice</b>");
    assert.equal(marker.children[1].textContent, "<b>Alice</b>");
    first.plugin.presenceReceivedAt -= 6000;
    first.plugin.renderCursors(false);
    assert.equal(first.plugin.cursorMarkers.size, 1, "idle cursors use presence liveness");
    first.plugin.presenceReceivedAt -= 90000;
    first.plugin.renderCursors(false);
    assert.equal(first.plugin.cursorMarkers.size, 0);
    await first.plugin.onunload();
    assert.equal(first.document.body.children.length, 0);
});

const editDoc = "20261030165150-doc0001";
const editA = { blockId: "20261030165150-block01", ancestors: [] };
const editB = { blockId: "20261030165150-block02", ancestors: [] };

test("edit leases arbitrate concurrent claims and acquire selections atomically", async () => {
    const kernel = await createKernel();
    for (const id of ["edit-user-one", "edit-user-two"]) await kernel.methods.get("presenceHeartbeat")(id, { generation: 1 });
    const claim = kernel.methods.get("editClaim");
    const results = await Promise.all([claim("edit-user-one", 1, 1, editDoc, [editA]), claim("edit-user-two", 1, 1, editDoc, [editA])]);
    assert.equal(results.filter((result) => result.granted).length, 1);
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 1);
    const denied = await claim("edit-user-two", 1, 2, editDoc, [editA, editB]);
    assert.equal(denied.granted, false);
    assert.ok(!denied.locks.some((lock) => lock.blockId === editB.blockId));
    assert.ok(!JSON.stringify(denied).includes("edit-user-"));
    assert.equal((await claim("edit-user-two", 1, 3, editDoc, [editB])).granted, true);
    await claim("edit-user-one", 1, 2, null, []);
    assert.equal((await claim("edit-user-two", 1, 4, editDoc, [editA, editB])).granted, true);
});

test("edit locks cover ancestors and cannot be stolen with another document ID", async () => {
    const kernel = await createKernel();
    for (const id of ["edit-user-one", "edit-user-two"]) await kernel.methods.get("presenceHeartbeat")(id, { generation: 1 });
    const claim = kernel.methods.get("editClaim");
    await claim("edit-user-one", 1, 1, editDoc, [editA]);
    assert.equal((await claim("edit-user-two", 1, 1, editDoc, [{ ...editB, ancestors: [editA.blockId] }])).granted, false);
    assert.equal((await claim("edit-user-two", 1, 2, "20261030165150-doc0002", [editA])).granted, false);
    await claim("edit-user-one", 1, 2, editDoc, [{ ...editB, ancestors: [editA.blockId] }]);
    assert.equal((await claim("edit-user-two", 1, 3, editDoc, [editA])).granted, false);
});

test("edit leases expire, renew and reject late releases or previous generations", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat"), claim = kernel.methods.get("editClaim");
    await heartbeat("edit-user-one", { generation: 1 });
    await heartbeat("edit-user-two", { generation: 1 });
    await claim("edit-user-one", 1, 1, editDoc, [editA]);
    kernel.advance(12000);
    await claim("edit-user-one", 1, 2, editDoc, [editA]);
    kernel.advance(12000);
    assert.equal((await claim("edit-user-two", 1, 1, editDoc, [editA])).granted, false);
    kernel.advance(3000);
    assert.equal((await claim("edit-user-two", 1, 2, editDoc, [editA])).granted, true);
    assert.equal((await claim("edit-user-two", 1, 1, null, [])).stale, true);
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 1);
    await heartbeat("edit-user-two", { generation: 2 });
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 0);
    await claim("edit-user-two", 2, 1, editDoc, [editA]);
    await assert.rejects(claim("edit-user-two", 1, 99, null, []), /superseded/);
    await kernel.methods.get("presenceLeave")("edit-user-two", 2);
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 0);
});

test("edit claims validate every input and lock owner labels follow renames", async () => {
    const kernel = await createKernel();
    await kernel.methods.get("presenceHeartbeat")("edit-user-one", { generation: 1 });
    const claim = kernel.methods.get("editClaim");
    for (const blocks of [null, {}, [null], [{ blockId: "bad", ancestors: [] }], [{ ...editA, ancestors: ["bad"] }], Array(201).fill(editA)]) {
        await assert.rejects(claim("edit-user-one", 1, 1, editDoc, blocks), /Invalid edit claim/);
    }
    await assert.rejects(claim("edit-user-one", 1, 0, editDoc, [editA]), /Invalid edit claim/);
    await assert.rejects(claim("edit-user-one", 1, 1, null, [editA]), /Invalid edit claim/);
    await claim("edit-user-one", 1, 1, editDoc, [editA]);
    await kernel.methods.get("presenceRename")("edit-user-one", "Alice", 1);
    assert.equal(kernel.broadcasts.at(-1).name, "edit-locks-changed");
    assert.equal(kernel.broadcasts.at(-1).args[0].locks[0].name, "Alice");
});

test("viewing another document does not release an editor's leases", async () => {
    const kernel = await createKernel();
    await kernel.methods.get("presenceHeartbeat")("edit-user-one", { generation: 1, documentId: editDoc });
    await kernel.methods.get("editClaim")("edit-user-one", 1, 1, editDoc, [editA]);
    await kernel.methods.get("presenceHeartbeat")("edit-user-one", { generation: 1, documentId: "20261030165150-doc0002" });
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 1);
});

function mutation(type = "beforeinput", key = "a") {
    return { type, key, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
}

test("frontends stop pending or foreign edits, allow copy, and resume after release", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel), second = await createFrontend(kernel);
    const context = { documentId: editDoc, blocks: [editA] };
    first.plugin.editing.context = second.plugin.editing.context = () => context;
    await first.plugin.editing.activate(context);
    await second.plugin.editing.activate(context);
    const denied = mutation();
    second.plugin.editing.guard(denied);
    assert.equal(denied.prevented, true);
    assert.equal(denied.stopped, true);
    await flush();
    assert.ok(second.messages.at(-1)[0].includes(first.plugin.clientName));
    const copy = { ...mutation("keydown", "c"), ctrlKey: true };
    second.plugin.editing.guard(copy);
    assert.equal(copy.prevented, false);
    for (const type of ["paste", "cut", "drop", "compositionstart", "contextmenu"]) {
        const event = mutation(type);
        second.plugin.editing.guard(event);
        assert.equal(event.prevented, true, type);
    }
    await first.plugin.editing.release();
    const waiting = mutation();
    second.plugin.editing.guard(waiting);
    assert.equal(waiting.prevented, true, "must wait for the kernel grant");
    await flush();
    const accepted = mutation();
    second.plugin.editing.guard(accepted);
    assert.equal(accepted.prevented, false);
    await second.plugin.onunload();
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 0);
});

test("expired and disconnected edit permits fail closed; foreign undo is blocked", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel), second = await createFrontend(kernel);
    const contextA = { documentId: editDoc, blocks: [editA] }, contextB = { documentId: editDoc, blocks: [editB] };
    first.plugin.editing.context = () => contextA;
    second.plugin.editing.context = () => contextB;
    await first.plugin.editing.activate(contextA);
    await second.plugin.editing.activate(contextB);
    const undo = { ...mutation("keydown", "z"), ctrlKey: true };
    first.plugin.editing.guard(undo);
    assert.equal(undo.prevented, true);
    first.plugin.editing.leaseUntil = Date.now() - 1;
    kernel.methods.delete("editClaim");
    const expired = mutation();
    first.plugin.editing.guard(expired);
    assert.equal(expired.prevented, true);
    await flush();
    assert.equal(first.plugin.editing.ready, false);
    assert.equal(first.plugin.editing.held.length, 0);
});

test("selection updates cannot replace a pending boundary delete claim with a single-block claim", async () => {
    const kernel = await createKernel();
    const frontend = await createFrontend(kernel);
    const edit = frontend.plugin.editing;
    const own = { documentId: editDoc, blocks: [editB] };
    await edit.activate(own);
    let finish;
    const claim = kernel.methods.get("editClaim");
    kernel.methods.set("editClaim", async (...args) => {
        const state = await claim(...args);
        return new Promise((resolve) => { finish = () => resolve(state); });
    });
    edit.context = () => own;
    const pending = edit.claim({ documentId: editDoc, blocks: [editB, editA] });
    await flush();
    const sequence = edit.sequence;
    edit.syncSelection(); edit.syncSelection(true);
    assert.equal(edit.sequence, sequence);
    finish(); assert.equal(await pending, true);
    assert.equal(edit.held.length, 2);
    assert.equal(await edit.claim({ documentId: editDoc, blocks: [editB, editA] }), true);
});

test("late edit responses cannot resurrect a released lease and older broadcasts are ignored", async () => {
    const kernel = await createKernel();
    const frontend = await createFrontend(kernel);
    const edit = frontend.plugin.editing;
    let finish;
    const realClaim = kernel.methods.get("editClaim");
    kernel.methods.set("editClaim", async (...args) => {
        const result = await realClaim(...args);
        if (args[4].length) return new Promise((resolve) => { finish = () => resolve(result); });
        return result;
    });
    const pending = edit.claim({ documentId: editDoc, blocks: [editA] });
    await flush();
    const shared = edit.claim({ documentId: editDoc, blocks: [editA] });
    const releasing = edit.release();
    finish(); await releasing; assert.equal(await pending, false);assert.equal(await shared, false);
    assert.equal(edit.held.length, 0);
    assert.equal((await kernel.methods.get("editSnapshot")()).locks.length, 0);
    edit.update({ version: 20, ttl: 15000, locks: [] });
    edit.update({ version: 19, ttl: 15000, locks: [{ ...editA, documentId: editDoc, name: "Alice", hue: 10 }] });
    assert.equal(edit.locks.length, 0);
    assert.throws(() => edit.update({ version: 21, ttl: 15000, locks: [{}] }), /Invalid edit lock/);
});

test("sessions join, deduplicate heartbeats, leave and expire", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    const leave = kernel.methods.get("presenceLeave");
    assert.equal((await heartbeat("session-one")).count, 1);
    assert.equal((await heartbeat("session-one")).count, 1);
    assert.equal(kernel.broadcasts.length, 1);
    assert.equal((await heartbeat("session-two")).count, 2);
    kernel.advance(60000);
    assert.equal((await heartbeat("session-one")).count, 2);
    kernel.advance(30000);
    await [...kernel.timers.values()][0].callback();
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 1);
    assert.equal(kernel.broadcasts.at(-1).args[0].count, 1);
    assert.equal((await leave("session-one")).count, 0);
    const count = kernel.broadcasts.length;
    assert.equal((await leave("session-one")).count, 0);
    assert.equal(kernel.broadcasts.length, count);
    await kernel.plugin.lifecycle.onunload();
    assert.equal(kernel.methods.size, 0);
    assert.equal(kernel.timers.size, 0);
});

test("invalid session IDs cannot alter online presence", async () => {
    const kernel = await createKernel();
    for (const id of [null, 123, {}, "", "../outside", "x".repeat(81)]) {
        await assert.rejects(kernel.methods.get("presenceHeartbeat")(id), /Invalid presence session ID/);
        await assert.rejects(kernel.methods.get("presenceLeave")(id), /Invalid presence session ID/);
    }
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 0);
});

test("assigns unique alphabetic names and keeps session keys private", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    const first = await heartbeat("session-one");
    const second = await heartbeat("session-two", { name: first.self.name });
    assert.equal(first.self.name, "A");
    assert.equal(second.self.name, "B");
    for (let index = 2; index < 54; index++) {
        const name = (await heartbeat(`session-alpha-${index}`)).self.name;
        if (index < 26) assert.equal(name, String.fromCharCode(65 + index));
        if (index === 26) assert.equal(name, "AA");
        if (index === 51) assert.equal(name, "AZ");
        if (index === 52) assert.equal(name, "BA");
        if (index === 53) assert.equal(name, "BB");
    }
    await kernel.methods.get("presenceRename")("session-one", "Alice");
    assert.equal((await heartbeat("session-reused")).self.name, "A");
    assert.equal((await heartbeat("session-custom", { name: "Writer" })).self.name, "Writer");
    assert.notEqual(first.self.name, second.self.name);
    assert.ok(!JSON.stringify(kernel.broadcasts).includes("session-one"));
    assert.ok(!JSON.stringify(kernel.broadcasts).includes("session-two"));
});

test("rename broadcasts immediately, rejects duplicates and survives old preferred names", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    await heartbeat("session-one", { name: "Alice" });
    await heartbeat("session-two", { name: "Bob" });
    const rename = kernel.methods.get("presenceRename");
    const result = await rename("session-one", "  Client A  ");
    assert.equal(result.self.name, "Client A");
    assert.equal(kernel.broadcasts.at(-1).args[0].clients[0].name, "Client A");
    await assert.rejects(rename("session-two", "Client A"), /already in use/);
    for (const name of ["", " ", "x".repeat(25), "a\u202eb", null, 123]) {
        await assert.rejects(rename("session-one", name), /Invalid display name/);
    }
    const later = await heartbeat("session-one", { name: "Alice" });
    assert.equal(later.self.name, "Client A");
});

test("document updates are validated, broadcast and preserved for old clients", async () => {
    const kernel = await createKernel();
    const heartbeat = kernel.methods.get("presenceHeartbeat");
    const id = "20261030165150-skkm1a3";
    await heartbeat("session-one", { documentId: id });
    const count = kernel.broadcasts.length;
    await heartbeat("session-one", { documentId: id });
    assert.equal(kernel.broadcasts.length, count);
    assert.equal((await heartbeat("session-one")).clients[0].documentId, id);
    for (const documentId of ["../outside", "<img>", 123, {}]) {
        await assert.rejects(heartbeat("session-one", { documentId }), /Invalid document ID/);
    }
    await assert.rejects(heartbeat("session-one", { name: 0 }), /Invalid display name/);
    assert.equal((await heartbeat("session-one", { documentId: null })).clients[0].documentId, null);
});

test("document events update prefix viewer counts, safe menus and halos, then clean up", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel);
    const second = await createFrontend(kernel);
    const docA = "20261030165150-skkm1a3";
    const docB = "20261030181047-hq4mcpf";
    const rowA = first.addRow(docA);
    const rowB = first.addRow(docB);
    first.document.activeDocument = docA;
    first.events.get("switch-protyle")();
    await first.renderFrames();
    second.document.activeDocument = docB;
    await second.plugin.refreshOnline();
    await first.renderFrames();
    assert.ok(rowA.classList.contains("collab-presence"));
    assert.ok(rowB.classList.contains("collab-presence"));
    let count = rowA.querySelector(":scope > .collab-presence-users");
    assert.equal(count.tagName, "BUTTON");
    assert.equal(count.type, "button");
    assert.equal(count.textContent, "1");
    assert.equal(count.getAttribute("aria-haspopup"), "menu");
    assert.ok(count.getAttribute("aria-label").includes("1"));
    assert.equal(rowA.children[0].className, "b3-list-item__toggle");
    assert.equal(rowA.children[1], count);
    assert.equal(rowA.children[2].className, "b3-list-item__icon");
    first.plugin.renderTreePresence();
    assert.equal(rowA.children[1], count, "unchanged renders preserve keyboard focus");
    for (const type of ["pointerdown", "mousedown", "dblclick", "keydown"]) {
        let stopped = false;
        count.listeners.get(type)({ stopPropagation() { stopped = true; } });
        assert.ok(stopped, `${type} should not trigger tree navigation or dragging`);
    }
    second.document.activeDocument = docA;
    await second.plugin.refreshOnline();
    await first.renderFrames();
    assert.equal(rowA.querySelector(":scope > .collab-presence-users").textContent, "2");
    assert.equal(rowB.classList.contains("collab-presence"), false);
    const presence = await kernel.methods.get("presenceRename")(first.plugin.sessionId, "<img src=x>", first.plugin.generation);
    first.plugin.updatePresence(presence);
    await first.renderFrames();
    count = rowA.querySelector(":scope > .collab-presence-users");
    assert.equal(count.textContent, "2");
    let stopped = false, prevented = false;
    count.listeners.get("click")({ stopPropagation() { stopped = true; }, preventDefault() { prevented = true; } });
    assert.ok(stopped && prevented);
    assert.equal(first.menus.at(-1).items.length, 2);
    assert.equal(first.menus.at(-1).items[0].label, "&lt;img src=x&gt;");
    assert.equal(first.menus.at(-1).items[1].label, second.plugin.clientName);
    first.plugin.openMenu();
    assert.ok(first.menus.at(-1).items[1].label.includes("&lt;img src=x&gt;"));
    assert.ok(!first.menus.at(-1).items[1].label.includes("<img"));
    await kernel.methods.get("presenceHeartbeat")("session-third", { documentId: docA });
    await first.renderFrames();
    count = rowA.querySelector(":scope > .collab-presence-users");
    assert.equal(count.textContent, "3");
    assert.equal(count.children.length, 0, "names are only shown in the menu");
    // Some themes omit the document emoji; fall back to the text without moving the toggle.
    rowB.querySelector(":scope > .b3-list-item__icon").remove();
    second.document.activeDocument = docB;
    await second.plugin.refreshOnline();
    await first.renderFrames();
    assert.equal(rowB.children[1].className, "collab-presence-users");
    assert.equal(rowB.children[2].className, "b3-list-item__text");
    first.document.activeDocument = null;
    first.events.get("destroy-protyle")();
    await first.renderFrames();
    assert.equal(first.plugin.clients.find((client) => client.name === first.plugin.clientName).documentId, null);
    await first.plugin.onunload();
    assert.equal(rowA.classList.contains("collab-presence"), false);
    assert.equal(rowA.querySelector(":scope > .collab-presence-users"), null);
    assert.equal(first.frames.size, 0);
});

test("two frontends receive broadcasts and clean up on unload", async () => {
    const kernel = await createKernel();
    const first = await createFrontend(kernel);
    const second = await createFrontend(kernel);
    assert.notEqual(first.plugin.sessionId, second.plugin.sessionId);
    assert.equal(first.plugin.onlineCount, 2);
    assert.equal(second.plugin.onlineCount, 2);
    assert.match(first.attrs.get("aria-label"), /2/);
    await second.plugin.onunload();
    assert.equal(first.plugin.onlineCount, 1);
    assert.equal(second.timers.size, 0);
    assert.equal(second.handlers.size, 0);
    assert.equal(second.events.size, 0);
    await first.plugin.onunload();
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 0);
    await first.plugin.refreshInBackground();
    assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 0);
});

async function historyFixture(kernel = null, blocks = null) {
    kernel ||= await createKernel();
    blocks ||= new Map([[editA.blockId, { text: 'A0', parent_id: editDoc, root_id: editDoc }],
        [editB.blockId, { text: 'B0', parent_id: editDoc, root_id: editDoc }]]);
    let nativeCalls = 0, posts = 0, mode = 'ok', flush = async () => {}, beforeApi = async () => {}, sqlBlocks = null;
    const original = { add() {}, undo() { nativeCalls++; }, redo() { nativeCalls++; }, renderLocal() {} };
    const p = { block: { rootID: editDoc }, id: Math.random().toString(), undo: { ...original },
        wysiwyg: { element: { querySelector(selector) {
            const id = selector.match(/data-node-id="([^"]+)"/)[1], block = blocks.get(id);
            return block && { parentElement: { closest: () => ({ getAttribute: () => block.parent_id }) },
                previousElementSibling: block.previous_id ? { hasAttribute: () => true, getAttribute: () => block.previous_id } : null };
        } } },
        element: { isConnected: true, closest: () => null, contains: () => true } };
    const editor = { protyle: p, flushPendingTransactions: () => flush(), reload() {} };
    const api = async (route, body) => {
        await beforeApi(route, body);
        if (route === '/api/sqlite/flushTransaction') {
            if (mode === 'index-failed') return { code: -1 };
            sqlBlocks = new Map([...blocks].map(([id, block]) => [id, { ...block }]));
            return { code: 0 };
        }
        if (route === '/api/query/sql') return { code: 0, data: [...body.stmt.matchAll(/'(\d{14}-[a-z0-9]{7})'/g)]
            .map((match) => {
                const block = (sqlBlocks || blocks).get(match[1]);
                return block ? { id: match[1], root_id: block.root_id, parent_id: block.parent_id } : null;
            }).filter(Boolean) };
        if (route === '/api/block/getBlockDOM') return { code: 0, data: { dom: blocks.get(body.id)?.text } };
        if (route === '/api/attr/getBlockAttrs') return { code: 0, data: blocks.get(body.id)?.attrs || {} };
        if (route === '/api/block/getBlockSiblingID') return { code: 0, data: { parent: blocks.get(body.id)?.parent_id, previous: blocks.get(body.id)?.previous_id || '' } };
        if (route === '/api/transactions') {
            posts++;
            if (mode === 'denied') return { code: -1 };
            for (const op of body.transactions[0].doOperations) {
                if (op.action === 'delete') blocks.delete(op.id);
                else if (op.action === 'setAttrs') Object.assign(blocks.get(op.id).attrs ||= {}, JSON.parse(op.data));
                else if (op.action === 'move') {
                    const moving = blocks.get(op.id);
                    const following = [...blocks.values()].find(block => block.parent_id === moving.parent_id && block.previous_id === op.id);
                    if (following) following.previous_id = moving.previous_id || '';
                    const parent = op.parentID || blocks.get(op.previousID)?.parent_id;
                    const previous = op.previousID || '';
                    const next = [...blocks.entries()].find(([id, block]) => id !== op.id && block.parent_id === parent && (block.previous_id || '') === previous);
                    if (next) next[1].previous_id = op.id;
                    moving.parent_id = parent; moving.previous_id = previous;
                }
                else blocks.set(op.id, { text: op.data, parent_id: op.parentID || blocks.get(op.id)?.parent_id || editDoc,
                    previous_id: op.previousID || blocks.get(op.id)?.previous_id || '', root_id: editDoc });
            }
            if (mode === 'lost') throw new Error('Connection lost after commit');
            if (mode === 'malformed') return {};
            return { code: 0, data: [{ doOperations: body.transactions[0].doOperations }] };
        }
        throw new Error('Unexpected API ' + route);
    };
    const frontend = await createFrontend(kernel, 'zh-CN', { editors: [editor], api });
    const history = frontend.plugin.history;
    const realState = history.state.bind(history);
    history.canonical = (_, html) => html;
    history.state = (_, ops) => ops.some(op => ['move', 'setAttrs'].includes(op.action)) ? realState(_, ops) : new Map(ops.map((op) => {
        if (!['update','insert','delete'].includes(op.action)) throw new Error('historyUnsupported');
        return [op.id, op.action === 'delete' ? null : op.data];
    }));
    const change = (id, text) => {
        const previous = blocks.get(id).text;
        p.undo.add([{ action: 'update', id, data: text }], [{ action: 'update', id, data: previous }], p);
        blocks.get(id).text = text;
    };
    return { kernel, blocks, frontend, history, editor, p, original, change, posts: () => posts, nativeCalls: () => nativeCalls,
        freezeIndex() { sqlBlocks = new Map([...blocks].map(([id, block]) => [id, { ...block }])); },
        setMode(value) { mode = value; }, setFlush(value) { flush = value; }, setBeforeApi(value) { beforeApi = value; } };
}

test('history records exact conflict reasons without consuming or overwriting the entry', async () => {
    for (const [reason, mutate] of [
        ['historyReasonContent', f => { f.blocks.get(editA.blockId).text = 'External'; }],
        ['historyReasonMissing', f => { f.blocks.delete(editA.blockId); }],
        ['historyReasonDocument', f => { f.blocks.get(editA.blockId).root_id = '20261103120000-other01'; }],
        ['historyReasonPosition', (f, entry) => {
            entry.locations.set(editA.blockId, { parent: editDoc, previous: '' });
            f.blocks.get(editA.blockId).previous_id = editB.blockId;
        }],
    ]) {
        const f = await historyFixture(); f.change(editA.blockId, 'A1');
        const entry = f.history.stack(editDoc).undo.at(-1); mutate(f, entry);
        assert.equal(await f.p.undo.undo(), false);
        assert.equal(entry.lastAttempt.key, reason);
        assert.equal(entry.lastAttempt.blockId, editA.blockId);
        assert.equal(entry.lastAttempt.direction, 'undo');
        assert.equal(entry.lastAttempt.success, false);
        assert.equal(f.history.stack(editDoc).undo.at(-1), entry);
        assert.equal(f.posts(), 0); assert.equal(f.nativeCalls(), 0);
    }
});

test('history list metadata survives unsupported operations and successful undo/redo updates attempts', async () => {
    const f = await historyFixture(); f.change(editA.blockId, 'A1');
    const stack = f.history.stack(editDoc), entry = stack.undo.at(-1);
    assert.deepEqual([...entry.actions], ['update']);
    assert.deepEqual([...entry.blockIds], [editA.blockId]);
    assert.equal(await f.p.undo.undo(), true);
    assert.equal(entry.lastAttempt.success, true); assert.equal(entry.lastAttempt.direction, 'undo');
    assert.equal(await f.p.undo.redo(), true);
    assert.equal(entry.lastAttempt.success, true); assert.equal(entry.lastAttempt.direction, 'redo');
    f.p.undo.add([{ action: 'fold', id: editA.blockId }], [{ action: 'fold', id: editA.blockId }], f.p);
    const unsupported = stack.undo.at(-1);
    assert.equal(unsupported.unsupported, true); assert.equal(unsupported.forward, undefined);
    assert.deepEqual([...unsupported.actions], ['other']);
    assert.deepEqual([...unsupported.blockIds], [editA.blockId]);
});

test('attribute undo preserves unrelated edits, verifies the changed keys and requires matching inverse coverage', async () => {
    const f = await historyFixture(), id = editA.blockId;
    const change = (forward, backward) => f.p.undo.add([{action:'setAttrs',id,data:JSON.stringify(forward)}], [{action:'setAttrs',id,data:JSON.stringify(backward)}], f.p);
    f.blocks.get(id).attrs = { name:'new', memo:'external note' };
    change({name:'new'}, {name:'old'});
    assert.equal(await f.p.undo.undo(), true);
    assert.deepEqual(f.blocks.get(id).attrs, {name:'old',memo:'external note'});
    f.blocks.get(id).text = 'external text';
    assert.equal(await f.p.undo.redo(), true);
    assert.equal(f.blocks.get(id).text, 'external text');
    f.blocks.get(id).attrs.name = 'external name';
    assert.equal(await f.p.undo.undo(), false);
    assert.equal(f.history.stack(editDoc).undo.at(-1).lastAttempt.key, 'historyReasonAttributes');
    change({name:'x'}, {memo:'wrong inverse'});
    assert.equal(f.history.stack(editDoc).undo.at(-1).unsupported, true);
    assert.equal(f.nativeCalls(), 0);
});

test('compound history uses verified projections and checks the committed result before allowing another replay', async () => {
    for (const changed of [false,true]) {
        const f=await historyFixture();f.change(editA.blockId,'A1');
        const entry=f.history.stack(editDoc).undo.at(-1);
        entry.replay={before:{expected:new Map([[editA.blockId,'A0']]),locations:new Map()},
            after:{expected:entry.expected,locations:new Map()},parents:new Map()};
        entry.structural=true;
        f.history.state=()=>{throw Error('Must use the verified projection');};
        if(changed)f.setBeforeApi(async route=>{if(route==='/api/sqlite/flushTransaction' && f.posts())f.blocks.get(editA.blockId).text='Unexpected after commit';});
        assert.equal(await f.p.undo.undo(), !changed);
        assert.equal(f.posts(),1);
        if(changed){
            assert.equal(entry.uncertain,true);
            assert.equal(await f.p.undo.redo(),false);
            assert.equal(f.posts(),1);
        }else{
            assert.equal(await f.p.undo.redo(),true);
            assert.equal(f.blocks.get(editA.blockId).text,'A1');
        }
    }
});

test('history dialog keeps keyboard focus after editor rendering moves focus away', async () => {
    const f = await historyFixture(); f.change(editA.blockId, 'A1');
    const focused = [], stack = f.history.stack(editDoc);
    f.history.view = { dialog: { element: { contains: () => true } },
        undo: { focus: () => focused.push('undo') }, redo: { focus: () => focused.push('redo') },
        render() { this.undo.disabled = !stack.undo.length; this.redo.disabled = !stack.redo.length; } };
    assert.equal(await f.p.undo.undo(), true);
    assert.deepEqual(focused, ['redo']);
    assert.equal(await f.p.undo.redo(), true);
    assert.deepEqual(focused, ['redo', 'undo']);
});

test('an operation flushes pending deletion once before acquiring its block group', async () => {
    const f = await historyFixture(), editing = f.frontend.plugin.editing;
    await editing.activate({ documentId: editDoc, blocks: [editA, editB] });
    let saves = 0;
    f.setFlush(async () => { saves++; });
    assert.equal(await editing.runOperation({ documentId: editDoc, current: () => true,
        prepare: async () => ({ documentId: editDoc, blocks: [editA, editB] }),
        validate: async () => {}, execute: async () => { assert.equal(saves, 1); },
    }), true);
    assert.equal(saves, 2, 'keep the save barrier after execution');
});

test('three-block history reads run together and keep locks until every read settles on failure', async () => {
    for (const fail of [false, true]) {
        const f = await historyFixture(), third = '20261103120000-block03';
        f.blocks.set(third, { text: 'C0', parent_id: editDoc, root_id: editDoc });
        const ids = [editA.blockId, editB.blockId, third];
        const backward = ids.map(id => ({ action: 'update', id, data: f.blocks.get(id).text }));
        const forward = ids.map(id => ({ action: 'update', id, data: f.blocks.get(id).text + 'x' }));
        for (const op of forward) f.blocks.get(op.id).text = op.data;
        f.p.undo.add(forward, backward, f.p);
        const reads = []; let finish;
        const gate = new Promise(resolve => { finish = resolve; });
        f.setBeforeApi(async (route, body) => {
            if (route !== '/api/block/getBlockDOM') return;
            reads.push(body.id);
            if (fail && body.id === ids[0]) throw Error('Read failed');
            await gate;
        });
        const pending = f.p.undo.undo();
        try {
            await flush();
            assert.equal(reads.length, 3, 'all three reads must start before waiting for one');
            assert.equal(f.posts(), 0);
            assert.equal((await f.kernel.methods.get('editSnapshot')()).locks.length, 3);
        } finally { finish(); await pending; }
        assert.equal(f.posts(), fail ? 0 : 1);
        assert.equal(f.history.stack(editDoc).undo.length, fail ? 1 : 0);
        assert.equal(f.blocks.get(third).text, fail ? 'C0x' : 'C0');
    }
});

test('Ctrl+Z immediately after deleting across three blocks waits for that deletion then restores all three', async () => {
    const f = await historyFixture(), third = { blockId: '20261103120000-block03', ancestors: [] };
    const editing = f.frontend.plugin.editing;
    f.blocks.set(third.blockId, { text: 'C0', parent_id: editDoc, root_id: editDoc, previous_id: editB.blockId });
    f.blocks.get(editB.blockId).previous_id = editA.blockId;
    f.freezeIndex();
    await editing.activate({ documentId: editDoc, blocks: [editA, editB, third] });
    let finish, saved = false;
    const deletion = new Promise(resolve => { finish = resolve; });
    editing.inputBarrier = deletion;
    f.setFlush(async () => {
        await deletion;
        if (saved) return;
        saved = true;
        f.blocks.get(editA.blockId).text = 'A';
        f.blocks.delete(editB.blockId); f.blocks.delete(third.blockId);
        f.p.undo.add([{ action: 'update', id: editA.blockId, data: 'A' },
            { action: 'delete', id: editB.blockId }, { action: 'delete', id: third.blockId }],
        [{ action: 'update', id: editA.blockId, data: 'A0' },
            { action: 'insert', id: editB.blockId, previousID: editA.blockId, data: 'B0' },
            { action: 'insert', id: third.blockId, previousID: editB.blockId, data: 'C0' }], f.p);
    });
    editing.guard({ ...mutation('keydown', 'z'), ctrlKey: true, target: { closest: () => null } });
    const undo = f.history.active.promise;
    await flush(); assert.equal(f.posts(), 0);
    const siblings = []; let finishLocations;
    const locations = new Promise(resolve => { finishLocations = resolve; });
    f.setBeforeApi(async (route, body) => {
        if (route === '/api/block/getBlockSiblingID' && f.posts() === 1) {
            siblings.push(body.id); await locations;
        }
    });
    editing.inputBarrier = null; finish();
    try {
        await flush();
        assert.equal(f.posts(), 1);
        assert.equal(siblings.length, 3, 'restored block positions must be read together');
        assert.equal((await f.kernel.methods.get('editSnapshot')()).locks.length, 3);
    } finally { finishLocations(); await undo; }
    assert.equal(await undo, true);
    assert.deepEqual([editA, editB, third].map(block => f.blocks.get(block.blockId).text), ['A0', 'B0', 'C0']);
    assert.equal(f.posts(), 1); assert.equal(f.nativeCalls(), 0);
    assert.equal(await f.p.undo.redo(), true);
    assert.equal(f.blocks.get(editA.blockId).text, 'A');
    assert.equal(f.blocks.has(editB.blockId), false); assert.equal(f.blocks.has(third.blockId), false);
});

test('history bounds block reads and rejects circular restoration anchors', async () => {
    const f = await historyFixture();
    let active = 0, peak = 0;
    await f.history.readBlocks(Array.from({ length: 21 }, (_, i) => i), async () => {
        peak = Math.max(peak, ++active); await flush(); active--;
    });
    assert.equal(peak, 8); assert.equal(active, 0);
    const ids = ['20261103120000-gone001', '20261103120000-gone002'];
    await assert.rejects(f.history.context(editDoc, {
        forward: ids.map(id => ({ action: 'delete', id })),
        backward: ids.map((id, i) => ({ action: 'insert', id, previousID: ids[1 - i], data: '' })),
        expected: new Map(ids.map(id => [id, null])),
    }), /historyChanged/);
});

test('undo waits for SQL indexing; a failed index barrier never writes or consumes history', async () => {
    const f = await historyFixture(); f.change(editA.blockId, 'A1');
    let finish, reads = 0;
    const indexing = new Promise(resolve => { finish = resolve; });
    f.setBeforeApi(async route => {
        if (route === '/api/sqlite/flushTransaction') await indexing;
        if (route === '/api/query/sql') reads++;
    });
    f.setMode('index-failed');
    const pending = f.p.undo.undo();
    try { await flush(); assert.equal(reads, 0); assert.equal(f.posts(), 0); }
    finally { finish(); await pending; }
    assert.equal(await pending, false);
    assert.equal(f.history.stack(editDoc).undo.length, 1); assert.equal(f.posts(), 0);
    f.setMode('ok'); assert.equal(await f.p.undo.undo(), true);
});

test('a move committed before the undo claim must be indexed before post-claim validation', async () => {
    const f = await historyFixture(); f.change(editA.blockId, 'A1'); f.freezeIndex();
    const claim = f.kernel.methods.get('editClaim');
    f.kernel.methods.set('editClaim', async (...args) => {
        const state = await claim(...args);
        if (args[4].length) f.blocks.get(editA.blockId).root_id = '20261103120000-doc0002';
        return state;
    });
    assert.equal(await f.p.undo.undo(), false);
    assert.equal(f.posts(), 0); assert.equal(f.history.stack(editDoc).undo.length, 1);
});

test('history entry selection happens after the index barrier has settled', async () => {
    const f = await historyFixture(); let recorded = false;
    f.setBeforeApi(async route => {
        if (route === '/api/sqlite/flushTransaction' && !recorded) {
            recorded = true; f.change(editA.blockId, 'A1');
        }
    });
    assert.equal(await f.p.undo.undo(), true);
    assert.equal(f.posts(), 1); assert.equal(f.blocks.get(editA.blockId).text, 'A0');
});

test('personal undo changes only its own block while another client edits a different block; redo works in browsing mode', async () => {
    const a = await historyFixture(), b = await historyFixture(a.kernel, a.blocks);
    a.change(editA.blockId, 'A1');b.change(editB.blockId, 'B1');
    await b.frontend.plugin.editing.activate({ documentId: editDoc, blocks: [editB] });
    assert.equal(await a.p.undo.undo(), true);
    assert.equal(a.blocks.get(editA.blockId).text, 'A0');assert.equal(a.blocks.get(editB.blockId).text, 'B1');
    assert.equal(a.frontend.plugin.editing.editTarget, null);
    assert.equal(await a.p.undo.redo(), true);assert.equal(a.blocks.get(editA.blockId).text, 'A1');
    assert.equal(a.nativeCalls(), 0);assert.equal(b.nativeCalls(), 0);
    assert.equal((await a.kernel.methods.get('editSnapshot')()).locks[0].name, b.frontend.plugin.clientName);
});

test('personal history merges continuous typing, respects gesture boundaries and clears redo after a new edit', async () => {
    const f = await historyFixture();
    f.change(editA.blockId, 'A1');f.change(editA.blockId, 'A2');
    assert.equal(f.history.stack(editDoc).undo.length, 1);
    assert.equal(await f.p.undo.undo(), true);assert.equal(f.blocks.get(editA.blockId).text, 'A0');
    assert.equal(await f.p.undo.redo(), true);assert.equal(f.blocks.get(editA.blockId).text, 'A2');
    f.history.breakGroup();f.change(editA.blockId, 'A3');
    assert.equal(f.history.stack(editDoc).undo.length, 2);
    await f.p.undo.undo();f.change(editB.blockId, 'B1');
    assert.equal(f.history.stack(editDoc).redo.length, 0);
});

test('paragraph split and empty-block deletion undo and redo preserve unrelated content', async () => {
    const f = await historyFixture(), id = '20261030165150-new0001';
    const insert = { action: 'insert', id, previousID: editA.blockId, data: '' };
    const remove = { action: 'delete', id };
    f.blocks.get(editA.blockId).text = 'A';
    f.blocks.set(id, { text: '', parent_id: editDoc, root_id: editDoc, previous_id: editA.blockId });
    f.p.undo.add([{ action: 'update', id: editA.blockId, data: 'A' }, insert],
        [remove, { action: 'update', id: editA.blockId, data: 'A0' }], f.p);
    assert.equal(await f.p.undo.undo(), true);assert.equal(f.blocks.has(id), false);
    assert.equal(f.blocks.get(editA.blockId).text, 'A0');
    assert.equal(await f.p.undo.redo(), true);assert.equal(f.blocks.get(id).text, '');
    f.blocks.delete(id);f.p.undo.add([remove], [insert], f.p);
    assert.equal(await f.p.undo.undo(), true);assert.equal(f.blocks.has(id), true);
    assert.equal(await f.p.undo.redo(), true);assert.equal(f.blocks.has(id), false);
    assert.equal(f.blocks.get(editB.blockId).text, 'B0');assert.equal(f.nativeCalls(), 0);
});

test('moving a structural undo target within the document blocks replay without consuming its history', async () => {
    const f = await historyFixture(), id = '20261030165150-new0001';
    f.blocks.set(id, { text: '', parent_id: editDoc, root_id: editDoc, previous_id: editA.blockId });
    f.p.undo.add([{ action: 'insert', id, previousID: editA.blockId, data: '' }], [{ action: 'delete', id }], f.p);
    f.blocks.get(id).previous_id = editB.blockId;
    assert.equal(await f.p.undo.undo(), false);assert.equal(f.posts(), 0);
    assert.equal(f.history.stack(editDoc).undo.length, 1);assert.equal(f.blocks.has(id), true);
});

test('Ctrl+Z and history beforeinput bypass click activation; form controls retain native undo', async () => {
    const f = await historyFixture();f.change(editA.blockId, 'A1');
    const event = { ...mutation('keydown', 'z'), ctrlKey: true, target: { closest: () => null } };
    f.frontend.plugin.editing.guard(event);
    assert.equal(event.prevented, true);await f.history.active.promise;
    assert.equal(f.blocks.get(editA.blockId).text, 'A0');
    const redo = { ...mutation('beforeinput'), inputType: 'historyRedo', target: event.target };
    f.frontend.plugin.editing.guard(redo);await f.history.active.promise;
    assert.equal(f.blocks.get(editA.blockId).text, 'A1');
    const form = { ...mutation('keydown', 'z'), ctrlKey: true, target: { closest: (selector) => selector === 'input, textarea, select' ? {} : null } };
    assert.equal(f.history.handle(form), false);
});

test('empty and unsupported personal history never falls back to another client’s shared undo', async () => {
    const f = await historyFixture();
    assert.equal(await f.p.undo.undo(), false);
    f.p.undo.add([{ action: 'move', id: editA.blockId }], [{ action: 'move', id: editA.blockId }], f.p);
    assert.equal(await f.p.undo.undo(), false);
    assert.equal(f.nativeCalls(), 0);assert.equal(f.posts(), 0);
    assert.equal(f.frontend.messages.at(-1)[0], f.frontend.plugin.i18n.historyUnsupported);
});

async function moveFixture() {
    const f = await historyFixture(), ids = [editA.blockId, editB.blockId, '20261103140000-block03', '20261103140000-block04'];
    ids.forEach((id, i) => f.blocks.set(id, { text: 'Text ' + i, root_id: editDoc, parent_id: editDoc, previous_id: ids[i - 1] || '' }));
    const backward = ids.slice(0, 3).map((id, i) => ({ action: 'move', id, parentID: editDoc, previousID: ids[i - 1] || '' }));
    const forward = ids.slice(0, 3).map((id, i) => ({ action: 'move', id, parentID: editDoc, previousID: i ? ids[i - 1] : ids[3] }));
    const locations = new Map(ids.map((id, i) => [id, { parent: editDoc, previous: ids[i - 1] || '' }]));
    return { ...f, ids, plan: { editor: f.editor, forward, backward, locations },
        order: () => { const order = []; let previous = ''; for (let i = 0; i < ids.length; i++) {
            const next = ids.find(id => f.blocks.get(id).previous_id === previous && !order.includes(id));
            if (!next) break; order.push(next); previous = next;
        } return order; } };
}

test('three-block move, personal undo and redo preserve order and later foreign text', async () => {
    const f = await moveFixture();
    assert.equal(await f.history.move(f.plan), true);
    assert.deepEqual(f.order(), [f.ids[3], ...f.ids.slice(0, 3)]);
    assert.equal(f.history.stack(editDoc).undo.at(-1).unsupported, undefined);
    f.blocks.get(f.ids[1]).text = 'Another client edited this';
    assert.equal(await f.p.undo.undo(), true); assert.deepEqual(f.order(), f.ids);
    assert.equal(await f.p.undo.redo(), true); assert.deepEqual(f.order(), [f.ids[3], ...f.ids.slice(0, 3)]);
    assert.equal(f.blocks.get(f.ids[1]).text, 'Another client edited this'); assert.equal(f.nativeCalls(), 0);
});

test('a drag waits for one group grant; immediate undo runs after the move commits', async () => {
    const f = await moveFixture(), real = f.kernel.methods.get('editClaim'); let finish;
    f.kernel.methods.set('editClaim', async (...args) => {
        const result = await real(...args);
        if (args[4].length && !finish) return new Promise(resolve => { finish = () => resolve(result); });
        return result;
    });
    const moving = f.history.move(f.plan); f.p.undo.undo();
    await flush(); assert.equal(f.posts(), 0);
    assert.equal((await f.kernel.methods.get('editSnapshot')()).locks.length, 4);
    finish(); await moving;
    for (let i = 0; i < 12; i++) await flush();
    assert.deepEqual(f.order(), f.ids); assert.equal(f.posts(), 2);
});

test('foreign locks, changed drop positions and cancelling a pending drag never partially move blocks', async () => {
    for (const cause of ['lock', 'position', 'cancel']) {
        const f = await moveFixture();
        if (cause === 'lock') {
            const other = await historyFixture(f.kernel, f.blocks);
            await other.frontend.plugin.editing.activate({ documentId: editDoc, blocks: [{ blockId: f.ids[3], ancestors: [] }] });
        } else if (cause === 'position') f.blocks.get(f.ids[3]).previous_id = f.ids[0];
        const moving = f.history.move(f.plan);
        if (cause === 'cancel') f.frontend.plugin.editing.release();
        assert.equal(await moving, false, cause); assert.equal(f.posts(), 0, cause);
        assert.equal(f.history.stack(editDoc).undo.length, 0); assert.equal(f.history.active, null);
    }
});

test('move rejection, lost acknowledgement and render failure keep accurate history and write state', async () => {
    for (const mode of ['denied', 'lost', 'malformed', 'render']) {
        const f = await moveFixture();
        if (mode === 'render') f.p.undo.renderLocal = () => { throw Error('Detached editor'); };
        else f.setMode(mode);
        assert.equal(await f.history.move(f.plan), mode === 'render');
        assert.equal(f.history.stack(editDoc).undo.length, mode === 'render' ? 1 : 0);
        assert.equal(!!f.frontend.plugin.editing.uncertain, ['lost', 'malformed'].includes(mode));
        assert.equal(f.history.active, null);
    }
});

test('foreign modification or a move to another document blocks undo without consuming the personal entry', async () => {
    for (const changed of ['text', 'root_id']) {
        const f = await historyFixture();f.change(editA.blockId, 'A1');
        f.blocks.get(editA.blockId)[changed] = changed === 'text' ? 'Other user' : '20261030165150-doc0002';
        assert.equal(await f.p.undo.undo(), false);assert.equal(f.posts(), 0);
        assert.equal(f.history.stack(editDoc).undo.length, 1);
        assert.ok(f.frontend.messages.at(-1)[0].includes('目标块'));
    }
});

test('conflicting ownership retains the entry and one retry succeeds after release', async () => {
    const a = await historyFixture(), b = await historyFixture(a.kernel, a.blocks);
    a.change(editA.blockId, 'A1');
    await b.frontend.plugin.editing.activate({ documentId: editDoc, blocks: [editA] });
    assert.equal(await a.p.undo.undo(), false);assert.equal(a.posts(), 0);
    assert.ok(a.frontend.messages.at(-1)[0].includes(b.frontend.plugin.clientName));
    await b.frontend.plugin.editing.release();
    assert.equal(await a.p.undo.undo(), true);assert.equal(a.posts(), 1);
});

test('rejected submission can retry; lost acknowledgment pauses retries to prevent duplicate application', async () => {
    const f = await historyFixture();f.change(editA.blockId, 'A1');f.setMode('denied');
    assert.equal(await f.p.undo.undo(), false);assert.equal(f.history.stack(editDoc).undo.length, 1);
    f.setMode('ok');assert.equal(await f.p.undo.undo(), true);
    const g = await historyFixture();g.change(editA.blockId, 'A1');g.setMode('lost');
    assert.equal(await g.p.undo.undo(), false);assert.equal(g.history.stack(editDoc).undo[0].uncertain, true);
    g.setMode('ok');assert.equal(await g.p.undo.undo(), false);assert.equal(g.posts(), 1);
});

test('cancel while waiting for a lease prevents a late undo; stop restores native hooks', async () => {
    const f = await historyFixture();f.change(editA.blockId, 'A1');
    const real = f.kernel.methods.get('editClaim');let finish;
    f.kernel.methods.set('editClaim', async (...args) => {
        const result = await real(...args);
        if (args[4].length) return new Promise((resolve) => { finish = () => resolve(result); });
        return result;
    });
    const pending = f.p.undo.undo();await flush();
    const releasing = f.frontend.plugin.editing.release();finish();await pending;await releasing;
    assert.equal(f.posts(), 0);assert.equal(f.history.stack(editDoc).undo.length, 1);
    await f.frontend.plugin.onunload();
    for (const key of ['add','undo','redo']) assert.equal(f.p.undo[key], f.original[key]);
});

test('rapid deliberate undo presses are serialized; key autorepeat does not accumulate a delayed burst', async () => {
    const f = await historyFixture();
    for (let i = 1; i <= 3; i++) { f.history.breakGroup();f.change(editA.blockId, 'A' + i); }
    let finish;f.setFlush(() => new Promise((resolve) => { finish = resolve; }));
    const pending = f.p.undo.undo();f.p.undo.undo();f.p.undo.undo();
    for (let i = 0; i < 5; i++) f.history.handle({ ...mutation('keydown','z'), ctrlKey: true, repeat: true, target: { closest: () => null } });
    assert.equal(f.history.queue.length, 2);
    await flush();f.setFlush(async () => {});finish();await pending;
    for (let i = 0; i < 15; i++) await flush();
    assert.equal(f.blocks.get(editA.blockId).text, 'A0');assert.equal(f.posts(), 3);
});

test('release retains and renews the lease until pending input is committed; the next block claim waits', async () => {
    const f = await historyFixture(), editing = f.frontend.plugin.editing;
    await editing.activate({ documentId: editDoc, blocks: [editA] });
    let finish;const saved = new Promise((resolve) => { finish = resolve; });f.setFlush(() => saved);
    const released = editing.release();
    const next = editing.activate({ documentId: editDoc, blocks: [editB] });
    editing.syncSelection(true);await flush();
    assert.equal((await f.kernel.methods.get('editSnapshot')()).locks[0].blockId, editA.blockId);
    finish();await released;assert.equal(await next, true);
    assert.equal((await f.kernel.methods.get('editSnapshot')()).locks[0].blockId, editB.blockId);
});

test('a failed input flush retains the lease and blocks a replacement claim until saving succeeds', async () => {
    const f = await historyFixture(), editing = f.frontend.plugin.editing;
    await editing.activate({ documentId: editDoc, blocks: [editA] });
    f.setFlush(async () => { throw new Error('Unsaved input'); });await editing.release();
    assert.equal((await f.kernel.methods.get('editSnapshot')()).locks[0].blockId, editA.blockId);
    assert.equal(await editing.activate({ documentId: editDoc, blocks: [editB] }), false);
    f.setFlush(async () => {});
    assert.equal(await editing.activate({ documentId: editDoc, blocks: [editB] }), true);
});

test('switching document or unloading never hands over an unsaved block', async () => {
    for (const action of ['switch', 'unload']) {
        const a = await historyFixture(), b = await historyFixture(a.kernel, a.blocks);
        const context = {documentId: editDoc, blocks: [editA]};
        await a.frontend.plugin.editing.activate(context);
        let finish;const saving = new Promise(resolve => { finish = resolve; });a.setFlush(() => saving);
        const closing = action === 'unload' ? a.frontend.plugin.onunload() : a.frontend.plugin.editing.release();
        if(action === 'switch') {
            a.frontend.document.activeDocument = '20261103120000-doc0002';
            await a.frontend.plugin.refreshOnline();
        }
        await flush();
        assert.equal(await b.frontend.plugin.editing.activate(context), false, action);
        a.kernel.advance(12000);await a.frontend.plugin.editing.renew();a.kernel.advance(5000);
        assert.equal(await b.frontend.plugin.editing.activate(context), false, 'save must keep renewing even during unload');
        finish();await closing;
        assert.equal(await b.frontend.plugin.editing.activate(context), true);
    }
});

test('a denied multi-block replacement preserves all existing leases', async () => {
    const a=await historyFixture(), b=await historyFixture(a.kernel,a.blocks);
    await a.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]});
    await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editB]});
    assert.equal(await a.frontend.plugin.editing.claim({documentId:editDoc,blocks:[editA,editB]}),false);
    const locks=(await a.kernel.methods.get('editSnapshot')()).locks;
    assert.equal(locks.length,2);
    assert.equal(locks.find(lock=>lock.blockId===editA.blockId).peerId,a.frontend.plugin.peerId);
    assert.equal(locks.find(lock=>lock.blockId===editB.blockId).peerId,b.frontend.plugin.peerId);
});

test('saving during unload keeps the session alive beyond the presence timeout', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing;
    await edit.activate({documentId:editDoc,blocks:[editA]});
    let finish;const saving=new Promise(resolve=>{finish=resolve;});a.setFlush(()=>saving);
    const unloading=a.frontend.plugin.onunload();await flush();
    for(let i=0;i<10;i++) {
        a.kernel.advance(12000);await edit.renew();
        assert.equal((await a.kernel.methods.get('getStatus')()).onlineCount,1);
        assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,1);
    }
    finish();await unloading;assert.equal((await a.kernel.methods.get('getStatus')()).onlineCount,0);
});

test('normal block changes wait for saving, including when no explicit release was requested', async () => {
    const a=await historyFixture(), b=await historyFixture(a.kernel,a.blocks), edit=a.frontend.plugin.editing;
    await edit.activate({documentId:editDoc,blocks:[editA]});
    let finish;const saving=new Promise(resolve=>{finish=resolve;});a.setFlush(()=>saving);
    const next=edit.activate({documentId:editDoc,blocks:[editB]});await flush();
    assert.equal(edit.phase,'saving');assert.equal(edit.held.length,0);
    assert.equal(await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]}),false);
    finish();assert.equal(await next,true);
    assert.equal(await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]}),true);
});

test('multi-block operation validates after acquiring every block and retains leases through execution and exit', async () => {
    const a=await historyFixture(), b=await historyFixture(a.kernel,a.blocks), edit=a.frontend.plugin.editing;
    const order=[];let finish;const transaction=new Promise(resolve=>{finish=resolve;});
    const pending=edit.runOperation({documentId:editDoc,current:()=>true,
        prepare:async()=>{order.push('prepare');return {documentId:editDoc,blocks:[editA,editB]};},
        validate:async()=>{assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,2);order.push('validate');},
        execute:async()=>{order.push('execute');await transaction;order.push('committed');},
    });
    await flush();assert.equal(edit.phase,'executing');
    const released=edit.release();await flush();
    assert.equal(await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editB]}),false);
    assert.equal(await edit.claim({documentId:editDoc,blocks:[editA]}),false);
    finish();assert.equal(await pending,true);await released;
    assert.deepEqual(order,['prepare','validate','execute','committed']);
    assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,0);
});

test('cancelled, invalid or conflicted multi-block operations never execute a partial write', async () => {
    for(const reason of ['cancel','validation','conflict']) {
        const a=await historyFixture(), b=await historyFixture(a.kernel,a.blocks), edit=a.frontend.plugin.editing;
        if(reason==='conflict')await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editB]});
        let writes=0,finish;const prepared=new Promise(resolve=>{finish=resolve;});
        const pending=edit.runOperation({documentId:editDoc,current:()=>true,
            prepare:async()=>{await prepared;return {documentId:editDoc,blocks:[editA,editB]};},
            validate:async()=>{if(reason==='validation')throw Error('Changed');},execute:async()=>{writes++;},
        });
        const release=reason==='cancel'?edit.release():null;
        finish();if(reason==='validation')await assert.rejects(pending,/Changed/);else assert.equal(await pending,false);
        await release;assert.equal(writes,0);assert.equal(edit.operation,null);
        assert.ok((await a.kernel.methods.get('editSnapshot')()).locks.every(lock=>lock.peerId!==a.frontend.plugin.peerId));
    }
});

test('unload waits for an already submitted personal undo before leaving presence', async () => {
    const a=await historyFixture(), b=await historyFixture(a.kernel,a.blocks);a.change(editA.blockId,'A1');
    const original=a.frontend.plugin.editing.runOperation.bind(a.frontend.plugin.editing);
    let finish;const response=new Promise(resolve=>{finish=resolve;});
    a.frontend.plugin.editing.runOperation=plan=>original({...plan,execute:async context=>{await plan.execute(context);await response;}});
    const undo=a.p.undo.undo();await flush();
    const unloading=a.frontend.plugin.onunload();await flush();
    assert.equal(await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]}),false);
    assert.equal((await a.kernel.methods.get('getStatus')()).onlineCount,2);
    finish();await undo;await unloading;
    assert.equal((await a.kernel.methods.get('getStatus')()).onlineCount,1);
    assert.equal(await b.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]}),true);
});

test('failed saves do not unregister the session on unload', async () => {
    const a=await historyFixture();await a.frontend.plugin.editing.activate({documentId:editDoc,blocks:[editA]});
    a.setFlush(async()=>{throw Error('Save failed');});await a.frontend.plugin.onunload();
    assert.equal((await a.kernel.methods.get('getStatus')()).onlineCount,1);
    assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,1);
});

test('all editor flushes must settle before a failed save can be retried', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing;
    let finish;const slow=new Promise(resolve=>{finish=resolve;});
    const editors=[{flushPendingTransactions:async()=>{throw Error('Failed');}}, {flushPendingTransactions:()=>slow}];
    edit.adapter.editors=()=>editors;
    await edit.activate({documentId:editDoc,blocks:[editA]});
    let settled=false;const releasing=edit.release().then(()=>{settled=true;});await flush();
    assert.equal(settled,false);assert.equal(edit.phase,'saving');
    finish();await releasing;assert.equal(edit.phase,'blocked');assert.equal(edit.failedFlush.length,2);
});

test('closed editors detach undo hooks without keeping editor references', async () => {
    const editors=[],kernel=await createKernel(),f=await createFrontend(kernel,'zh-CN',{editors});
    for(let i=0;i<30;i++) {
        const original={add(){},undo(){},redo(){},renderLocal(){}};
        const editor={protyle:{undo:{...original},element:{isConnected:true}}};
        editors.push(editor);f.plugin.history.attach();assert.equal(f.plugin.history.patches.size,1);
        editor.protyle.element.isConnected=false;editors.pop();f.plugin.history.attach();
        assert.equal(f.plugin.history.patches.size,0);assert.equal(editor.protyle.undo.add,original.add);
    }
});

test('a response from before kernel reconnection cannot revive editing', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing,real=a.kernel.methods.get('editClaim');
    let finish;
    a.kernel.methods.set('editClaim',async(...args)=>{
        const response=await real(...args);
        if(args[4].length)return new Promise(resolve=>{finish=()=>resolve(response);});return response;
    });
    const pending=edit.activate({documentId:editDoc,blocks:[editA]});await flush();
    await edit.load(true);finish();assert.equal(await pending,false);
    assert.equal(edit.held.length,0);assert.equal(edit.lease,null);
    await edit.release();assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,0);
});

test('uncertain commits freeze further edits and do not release or resubmit', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing;a.change(editA.blockId,'A1');a.setMode('lost');
    assert.equal(await a.p.undo.undo(),false);assert.equal(edit.uncertain,true);
    assert.equal(await edit.activate({documentId:editDoc,blocks:[editB]}),false);
    assert.equal(await edit.release(),false);
    await assert.rejects(edit.runOperation({}),/historyUncertain/);
    assert.equal(a.posts(),1);assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,1);
});

test('committed multi-block operations still report success when only release fails', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing,real=a.kernel.methods.get('editClaim');let writes=0;
    a.kernel.methods.set('editClaim',(...args)=>{if(!args[4].length)throw Error('Release offline');return real(...args);});
    assert.equal(await edit.runOperation({documentId:editDoc,current:()=>true,
        prepare:async()=>({documentId:editDoc,blocks:[editA,editB]}),validate:async()=>{},execute:async()=>{writes++;},
    }),true);
    assert.equal(writes,1);assert.equal(edit.phase,'blocked');assert.equal(edit.held.length,0);
    assert.equal(a.frontend.messages.at(-1)[0],a.frontend.plugin.i18n.editReleaseFailed);
});

test('duplicate context entries are normalized locally and ambiguous RPC groups are rejected', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing;
    assert.equal(await edit.activate({documentId:editDoc,blocks:[editA,editA,editB]}),true);
    assert.equal(edit.held.length,2);
    await assert.rejects(a.kernel.methods.get('editClaim')(a.frontend.plugin.sessionId,1,100,editDoc,[editA,editA]),/Invalid edit claim/);
    await assert.rejects(a.kernel.methods.get('editClaim')(a.frontend.plugin.sessionId,1,101,editDoc,[{...editA,ancestors:[editA.blockId]}]),/Invalid edit claim/);
});

test('renaming cannot turn an owned lease into a foreign lock', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing,context={documentId:editDoc,blocks:[editA]};
    await edit.activate(context);
    a.frontend.plugin.clientName='Temporarily stale name';
    assert.equal(edit.conflict(context),undefined);
    assert.equal(edit.owns(context),true);
});

test('an operation cannot silently switch to a different document during preparation', async () => {
    const a=await historyFixture(),edit=a.frontend.plugin.editing;let writes=0;
    await assert.rejects(edit.runOperation({documentId:editDoc,current:()=>true,
        prepare:async()=>({documentId:'20261103120000-doc0002',blocks:[editA]}),
        validate:async()=>{},execute:async()=>{writes++;},
    }),/historyUnsupported/);
    assert.equal(writes,0);assert.equal((await a.kernel.methods.get('editSnapshot')()).locks.length,0);
});

test('stationary cursor broadcast retries after a rejected delivery', async () => {
    const kernel=await createKernel();await kernel.methods.get('presenceHeartbeat')('retry-client',{generation:1});
    await kernel.methods.get('cursorUpdate')('retry-client',1,1,{surface:'document',documentId:editDoc,blockId:editA.blockId,x:0.4,y:0.5});
    let attempts=0;kernel.subscribers.add(new Map([['cursor-changed',()=>{if(++attempts===1)throw Error('Injected failure');}]]));
    const timer=[...kernel.timers.values()].find(timer=>timer.delay===100);
    await timer.callback();await timer.callback();await timer.callback();assert.equal(attempts,2);
});

for (const locale of ["en", "zh-CN"]) {
    test(`menu and command query current presence (${locale})`, async () => {
        const kernel = await createKernel();
        const frontend = await createFrontend(kernel, locale);
        assert.equal(frontend.messages.length, 0);
        frontend.button.options.callback();
        assert.equal(frontend.menus[0].items[0].label, frontend.plugin.i18n.checkOnline);
        await frontend.menus[0].items[0].click();
        await frontend.commands[0].callback();
        assert.deepEqual(frontend.messages, [
            [frontend.plugin.onlineText(1), 5000, "info"],
            [frontend.plugin.onlineText(1), 5000, "info"],
        ]);
    });
    test(`disconnect shows an error and kernel restart reconnects (${locale})`, async () => {
        const kernel = await createKernel();
        const frontend = await createFrontend(kernel, locale);
        const heartbeat = kernel.methods.get("presenceHeartbeat");
        kernel.methods.delete("presenceHeartbeat");
        await [...frontend.timers.values()][0].callback();
        assert.equal(frontend.plugin.onlineCount, null);
        await frontend.plugin.checkOnline();
        assert.deepEqual(frontend.messages.at(-1), [frontend.plugin.i18n.kernelFailed, 7000, "error"]);
        kernel.methods.set("presenceHeartbeat", heartbeat);
        frontend.events.get("kernel-plugin-state-change")({ detail: { code: 2 } });
        await flush();
        assert.equal(frontend.plugin.onlineCount, 1);
        assert.equal((await kernel.methods.get("getStatus")()).onlineCount, 1);
    });
}
