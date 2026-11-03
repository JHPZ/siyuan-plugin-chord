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
            querySelector(selector) {
                const matches=child=>selector.includes('.') ? child.classList.contains(selector.split('.').at(-1)) : child.tagName===selector.toUpperCase();
                for(const child of node.children){if(matches(child))return child;const found=child.querySelector(selector);if(found)return found;}
                return null;
            },
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
            if(selector==='iframe' || selector.startsWith('.dock__item') || selector==='.collab-tick-form select')return [];
            if(selector.startsWith('.config') || selector.startsWith('.b3-dialog'))return [];
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
        window: { innerWidth:1280,innerHeight:720,addEventListener: (name, callback) => listen(windowListeners, name, callback), removeEventListener: (name, callback) => unlisten(windowListeners, name, callback) },
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
            assert.equal(name, "siyuan"); return { Plugin, Menu, Setting, showMessage: (...args) => messages.push(args), openTab: async (args) => {
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
    assert.equal(frontend.timers.size, 2);
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
    assert.equal([...first.timers.values()].filter((timer) => timer.delay < 1000).length, 0, 'idle frontend does not poll positions');
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
    assert.equal(kernel.methods.has('editClaim'),false);
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

test('editing activity is nonexclusive, validated, ordered and cleared independently of presence', async () => {
    const kernel=await createKernel(), heartbeat=kernel.methods.get('presenceHeartbeat'), update=kernel.methods.get('editingUpdate');
    const snapshot=kernel.methods.get('cursorSnapshot'), flushActivity=[...kernel.timers.values()].find(timer=>timer.delay===100).callback;
    const editing={documentId:'20261030165150-doc0001',blockId:'20261030165150-block01'};
    for(const id of ['editing-user-one','editing-user-two']) {
        await heartbeat(id,{generation:1,documentId:editing.documentId});
        assert.equal(await update(id,1,2,{...editing,secret:'never broadcast'}),true);
    }
    await flushActivity();
    assert.equal((await snapshot()).editing.length,2,'both participants can edit the same block');
    assert.ok(!JSON.stringify(await snapshot()).includes('secret'));
    assert.ok(!JSON.stringify(await snapshot()).includes('editing-user'));
    assert.equal(await update('editing-user-one',1,1,null),false);
    for(const value of [undefined,{}, {...editing,blockId:'bad'}, {...editing,documentId:123}]) {
        await assert.rejects(update('editing-user-one',1,3,value),/Invalid editing activity/);
    }
    await assert.rejects(update('editing-user-one',1,0,editing),/sequence/);
    const before=kernel.broadcasts.length;
    kernel.advance(10000);await update('editing-user-one',1,3,editing);await flushActivity();
    assert.equal(kernel.broadcasts.length,before,'renewal does not broadcast unchanged activity');
    kernel.advance(20000);await heartbeat('editing-user-two',{generation:1});await flushActivity();
    assert.equal((await snapshot()).editing.length,2,'existing heartbeat keeps idle editing without extra activity packets');
    await update('editing-user-two',1,3,null);
    await kernel.methods.get('presenceRename')('editing-user-one','Alice',1);
    assert.equal((await snapshot()).editing[0].name,'Alice');
    await heartbeat('editing-user-one',{generation:2});
    assert.equal((await snapshot()).editing.length,0);
    await assert.rejects(update('editing-user-one',1,4,editing),/superseded/);
    await update('editing-user-one',2,1,editing);
    await heartbeat('editing-user-one',{generation:2,documentId:'20261030165150-doc0002'});
    assert.equal((await snapshot()).editing.length,0);
    await update('editing-user-one',2,2,editing);await update('editing-user-one',2,3,null);
    assert.equal((await snapshot()).editing.length,0);
    await update('editing-user-one',2,4,editing);await kernel.methods.get('presenceLeave')('editing-user-one',2);
    assert.equal((await snapshot()).editing.length,0);
    await kernel.plugin.lifecycle.onunload();
    assert.equal(kernel.methods.size,0);
});

test('UI position and page protocol strips private fields and rejects executable or malformed routes',async()=>{
    const kernel=await createKernel(),heartbeat=kernel.methods.get('presenceHeartbeat'),snapshot=kernel.methods.get('cursorSnapshot'),update=kernel.methods.get('cursorUpdate');
    const page={kind:'settings',section:'editor',title:'设置 · 编辑器',secret:'password'};
    await heartbeat('page-test-user',{generation:1,page});
    const client=(await heartbeat('page-test-user',{generation:1})).clients[0];
    assert.equal(client.page.title,page.title);assert.equal(client.page.secret,undefined);
    assert.match(client.peerId,/^peer-/);
    const cursor={surface:'ui',documentId:null,blockId:null,page,ui:{kind:'settings',path:[0,2],tag:'button'},screen:{x:.2,y:.3},x:.4,y:.5};
    await update('page-test-user',1,1,cursor);
    assert.equal((await snapshot()).cursors[0].cursor.page.secret,undefined);
    for(const bad of [{...page,section:'x"] script'}, {...page,kind:'command',command:'syncNow'}, {...page,title:'x'.repeat(161)}, ...['assets/../conf','assets/%2e%2e/conf','assets/..\\conf','assets/%00file','assets/%zz'].map(path=>({kind:'asset',path,title:''}))]){
        await assert.rejects(heartbeat('page-test-user',{generation:1,page:bad}),/Invalid page/);
    }
    for(const bad of [{...cursor,ui:{...cursor.ui,path:[-1]}},{...cursor,screen:{x:NaN,y:0}},{...cursor,ui:{...cursor.ui,tag:'button"]'}}])await assert.rejects(update('page-test-user',1,2,bad),/Invalid UI cursor/);
    await kernel.plugin.lifecycle.onunload();
});

test('late heartbeat results cannot replace a newer participant page',async()=>{
    const frontend=await createFrontend(await createKernel()),plugin=frontend.plugin;
    const revision=plugin.presenceRevision;
    const client={name:'A',hue:120,documentId:null,page:{kind:'settings',section:'appearance',title:'设置 · 外观'}};
    plugin.updatePresence({count:1,clients:[client],revision:revision+2});
    plugin.updatePresence({count:0,clients:[],revision:revision+1});
    assert.equal(plugin.clients[0].page.section,'appearance');assert.equal(plugin.onlineCount,1);
    await plugin.onunload();
});

test('shortcut notices are validated, ordered, throttled and never execute a command',async()=>{
    const kernel=await createKernel(),heartbeat=kernel.methods.get('presenceHeartbeat'),send=kernel.methods.get('shortcut');
    await heartbeat('shortcut-user',{generation:1});
    assert.equal(await send('shortcut-user',1,1,'Ctrl+C'),true);
    assert.equal(await send('shortcut-user',1,1,'Ctrl+C'),false);
    assert.equal(await send('shortcut-user',1,2,'Ctrl+V'),false);
    kernel.advance(100);assert.equal(await send('shortcut-user',1,3,'Ctrl+Shift+Z'),true);
    for(const value of ['typed text','Ctrl+<script>','Ctrl+密码',null])await assert.rejects(send('shortcut-user',1,4,value),/Invalid shortcut/);
    const notices=kernel.broadcasts.filter(message=>message.name==='shortcut-shown');
    assert.deepEqual(notices.map(message=>message.args[0].keys),['Ctrl+C','Ctrl+Shift+Z']);
    assert.ok(!JSON.stringify(notices).includes('shortcut-user'));
    await heartbeat('shortcut-user',{generation:2});
    await assert.rejects(send('shortcut-user',1,4,'Ctrl+C'),/superseded/);
    assert.equal(await send('shortcut-user',2,1,'Ctrl+C'),true);
});

test('pointer bursts coalesce and idle timers send zero position updates',async()=>{
    let now=10000;
    const kernel=await createKernel(),frontend=await createFrontend(kernel,'zh-CN',{now:()=>now});
    const row=frontend.addRow('20261030165150-skkm1a3');
    row.closest=selector=>selector.startsWith('.sy__file') ? row : null;
    row.getBoundingClientRect=()=>({left:0,top:0,width:400,height:40});
    frontend.document.elementFromPoint=()=>row;
    for(let i=0;i<100;i++)frontend.listeners.get('pointermove')({pointerType:'mouse',clientX:i,clientY:20});
    assert.equal([...frontend.timers.values()].filter(timer=>timer.delay<1000).length,1);
    const scheduled=frontend.plugin.activityTimer,callback=frontend.timers.get(scheduled).callback;
    frontend.timers.delete(scheduled);await callback();
    assert.equal(frontend.plugin.cursorSequence,1);
    for(let i=0;i<100;i++)await [...frontend.timers.values()].find(timer=>timer.delay===1000).callback();
    assert.equal(frontend.plugin.cursorSequence,1,'idle display sweeper cannot send');
    now+=100;frontend.listeners.get('pointermove')({pointerType:'mouse',clientX:200,clientY:20});
    const trailing=frontend.plugin.activityTimer,run=frontend.timers.get(trailing).callback;frontend.timers.delete(trailing);await run();
    assert.equal(frontend.plugin.cursorSequence,2);
    await frontend.plugin.onunload();assert.equal(frontend.timers.size,0);
});

test('activity throttles at every preset and preserves the last movement during a slow send',async()=>{
    for(const tick of [3,10,30]) {
        let now=10000,release;
        const frontend=await createFrontend(await createKernel(),'zh-CN',{now:()=>now}),plugin=frontend.plugin;
        plugin.tick=tick;plugin.activitySentAt=now;
        const sent=[];
        plugin.sendCursor=async()=>{sent.push(plugin.pointer.x);if(sent.length===1)await new Promise(resolve=>release=resolve);};
        plugin.pointer={x:1};plugin.queueActivity();
        const first=plugin.activityTimer;
        assert.ok(Math.abs(frontend.timers.get(first).delay-1000/tick)<0.01);
        const run=frontend.timers.get(first).callback;
        frontend.timers.delete(first);now+=1000/tick;
        const sending=run();
        plugin.pointer={x:99};plugin.queueActivity();
        release();await sending;
        const trailing=plugin.activityTimer,callback=frontend.timers.get(trailing).callback;
        frontend.timers.delete(trailing);now+=1000/tick;await callback();
        assert.deepEqual(sent,[1,99]);
        await plugin.onunload();assert.equal(frontend.timers.size,0);
    }
});

test("settings form validates and saves the tick rate through the kernel", async () => {
    const kernel = await createKernel();
    const frontend = await createFrontend(kernel);
    assert.equal(frontend.plugin.displayName, "和弦");
    const form = frontend.plugin.setting.items[0].createActionElement();
    const [input, save, error] = form.children;
    assert.equal(input.value, "10");
    assert.deepEqual(input.children.map(option=>option.value),['3','10','30']);
    const submit = form.listeners.get("submit");
    input.value = "2.5";
    await submit({ preventDefault() {} });
    assert.equal(error.textContent, frontend.plugin.i18n.cursorTickFailed);
    input.value = "30";
    await submit({ preventDefault() {} });
    assert.equal(frontend.plugin.tick, 30);
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
    assert.equal(first.plugin.peopleRows.size,2);
    assert.equal([...first.plugin.peopleRows.values()][0].querySelector('strong').textContent,'<img src=x> · '+first.plugin.i18n.self);
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

test('presence never registers editing guards or lock RPCs, even when disconnected', async () => {
    const kernel = await createKernel(), frontend = await createFrontend(kernel);
    assert.equal(kernel.methods.has('editClaim'), false);
    assert.equal(kernel.methods.has('editSnapshot'), false);
    assert.equal(frontend.plugin.editing, undefined);
    assert.equal(frontend.plugin.history, undefined);
    const events = ['beforeinput', 'input', 'paste', 'cut', 'drop', 'dragstart', 'compositionstart', 'contextmenu'];
    const check = () => {
        for (const event of events) {
            assert.equal(frontend.listeners.has(event), false, event);
            assert.equal(frontend.windowListeners.has(event), false, event);
        }
        assert.deepEqual(frontend.commands.map(command => command.langKey), ['checkOnline']);
        frontend.plugin.openMenu();
        assert.deepEqual(frontend.menus.at(-1).items.map(item => item.icon), ['iconEmoji', 'iconEdit', 'iconSettings']);
    };
    check();
    kernel.methods.delete('presenceHeartbeat');
    kernel.methods.delete('cursorSnapshot');
    await frontend.plugin.refreshInBackground();
    await frontend.plugin.loadCursors();
    check();
    await frontend.plugin.onunload();
    assert.equal(frontend.listeners.size, 0);
    assert.equal(frontend.windowListeners.size, 0);
    await kernel.plugin.lifecycle.onunload();
    assert.equal(kernel.methods.size, 0);
    assert.equal(kernel.timers.size, 0);
});

test('stationary cursor broadcast retries after a rejected delivery', async () => {
    const kernel=await createKernel();await kernel.methods.get('presenceHeartbeat')('retry-client',{generation:1});
    await kernel.methods.get('cursorUpdate')('retry-client',1,1,{surface:'document',documentId:'20261030165150-doc0001',blockId:'20261030165150-block01',x:0.4,y:0.5});
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
        assert.equal(frontend.plugin.peopleRows.size,1);
        await frontend.commands[0].callback();
        assert.equal(frontend.plugin.peopleRows.size,1);
        assert.deepEqual(frontend.messages, []);
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
