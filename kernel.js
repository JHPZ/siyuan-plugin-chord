// Generated from src/kernel.js by npm run compile.
const { plugin, rpc, logger, storage } = siyuan;
const sessions = new Map();
let peerSequence = 0;
const SESSION_TIMEOUT = 90000;
let sweepTimer;
let cursorTimer;
let tick = 10;
let cursorDirty = false;
let settingsWrite = Promise.resolve();
const BLOCK_ID = /^\d{14}-[a-z0-9]{7}$/;

function normalizeCursor(value) {
    if (value === null) return null;
    if (!value || !["document", "tree"].includes(value.surface) || typeof value.blockId !== "string" || !BLOCK_ID.test(value.blockId) ||
        (value.surface === "document" ? typeof value.documentId !== "string" || !BLOCK_ID.test(value.documentId) : value.documentId !== null) ||
        ![value.x, value.y].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1)) {
        throw new Error("Invalid cursor anchor");
    }
    const cursor = { surface: value.surface, documentId: value.documentId, blockId: value.blockId, x: value.x, y: value.y };
    if (value.text !== undefined) {
        if (value.surface !== "document" || !value.text || !Number.isSafeInteger(value.text.offset) || value.text.offset < 0 || value.text.offset > 10000000 ||
            ![value.text.x, value.text.y].every((number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1)) throw new Error("Invalid cursor text anchor");
        cursor.text = { offset: value.text.offset, x: value.text.x, y: value.text.y };
    }
    return cursor;
}

function normalizeSelection(value) {
    if (value === null) return null;
    if (!value || typeof value.documentId !== "string" || !BLOCK_ID.test(value.documentId) || [value.anchor, value.focus].some((point) =>
        !point || typeof point.blockId !== "string" || !BLOCK_ID.test(point.blockId) || !Number.isSafeInteger(point.offset) || point.offset < 0 || point.offset > 10000000)) {
        throw new Error("Invalid text selection");
    }
    return { documentId: value.documentId, anchor: { blockId: value.anchor.blockId, offset: value.anchor.offset }, focus: { blockId: value.focus.blockId, offset: value.focus.offset } };
}

function cursorSnapshot() {
    return { tick, cursors: [...sessions.values()].filter((client) => client.cursor && Date.now() - client.lastSeen < SESSION_TIMEOUT)
        .map(({ name, hue, cursor }) => ({ name, hue, cursor })),
        selections: [...sessions.values()].filter((client) => client.selection && Date.now() - client.lastSeen < SESSION_TIMEOUT)
            .map(({ name, hue, selection }) => ({ name, hue, selection })) };
}

async function flushCursors() {
    for (const client of sessions.values()) {
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
        try { await rpc.broadcast("cursor-changed", [cursorSnapshot()]); }
        catch (error) { cursorDirty = true; throw error; }
    }
}

function startCursorTimer() {
    clearInterval(cursorTimer);
    cursorTimer = setInterval(() => flushCursors().catch((error) => console.error("Cursor broadcast failed:", error)), 1000 / tick);
}

// shortcut: 每个前端窗口是一名参与者，接入账号身份后再做跨窗口去重。
function snapshot(selfId) {
    const clients = [...sessions.values()].map(({ name, documentId, hue }) => ({ name, documentId, hue }));
    const result = { count: clients.length, clients };
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
    return rpc.broadcast("presence-changed", [snapshot()]);
}

async function expireSessions() {
    if (pruneSessions()) {
        await broadcastPresence();
    }
}

plugin.lifecycle.onload = async () => {
    try {
        const saved = await (await storage.get("cursor-settings.json")).json();
        if (Number.isInteger(saved.tick) && saved.tick >= 1 && saved.tick <= 30) tick = saved.tick;
    } catch { /* 首次安装没有设置文件，使用 10 tick/秒。 */ }
    await rpc.bind("cursorSnapshot", async () => cursorSnapshot(), "Read current cursor positions and tick rate.");
    await rpc.bind("setCursorTick", (value) => {
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
    await rpc.bind("cursorUpdate", async (id, generation, sequence, value) => {
        validateSession(id);
        validateGeneration(generation);
        if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid cursor sequence");
        const cursor = normalizeCursor(value);
        const client = sessions.get(id);
        if (!client || client.generation !== generation) throw new Error("Session expired or superseded");
        if (sequence <= (client.cursorSequence || 0)) return false;
        client.cursorSequence = sequence;
        if (JSON.stringify(client.cursor ?? null) !== JSON.stringify(cursor)) cursorDirty = true;
        client.cursor = cursor;
        return true;
    }, "Update a frontend's content-relative pointer position.");
    await rpc.bind("selectionUpdate", async (id, generation, sequence, value) => {
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
    await rpc.bind("getStatus", async () => {
        await expireSessions();
        return { name: plugin.name, version: plugin.version, platform: plugin.platform, onlineCount: sessions.size };
    }, "Return kernel metadata and the online frontend count.");
    await rpc.bind("presenceHeartbeat", async (id, state = {}) => {
        validateSession(id);
        if (!state || typeof state !== "object" || Array.isArray(state)) {
            throw new Error("Invalid presence state");
        }
        const preferredName = state.name === undefined || state.name === "" ? "" : normalizeName(state.name);
        const generation = state.generation === undefined ? 0 : state.generation;
        validateGeneration(generation);
        if (state.documentId !== undefined && state.documentId !== null &&
            (typeof state.documentId !== "string" || !/^\d{14}-[a-z0-9]{7}$/.test(state.documentId))) {
            throw new Error("Invalid document ID");
        }
        let changed = pruneSessions();
        let client = sessions.get(id);
        if (client && generation < client.generation) throw new Error("Session superseded by a refreshed client");
        if (!client) {
            client = { peerId: `peer-${++peerSequence}`, name: assignName(preferredName, id), documentId: null, hue: Math.floor(Math.random() * 360), lastSeen: Date.now(), generation };
            sessions.set(id, client);
            changed = true;
        }
        if (client.generation !== generation) {
            client.cursor = null;
            client.cursorSequence = 0;
            client.selection = null;
            client.selectionSequence = 0;
            cursorDirty = true;
        }
        client.generation = generation;
        if (state.documentId !== undefined && client.documentId !== state.documentId) {
            client.documentId = state.documentId;
            if (client.cursor?.surface === "document" && client.cursor.documentId !== client.documentId) { client.cursor = null; cursorDirty = true; }
            if (client.selection && client.selection.documentId !== client.documentId) { client.selection = null; cursorDirty = true; }
            changed = true;
        }
        client.lastSeen = Date.now();
        if (changed) {
            await broadcastPresence();
        }
        return snapshot(id);
    }, "Register a frontend, assign its name and update its viewed document.");
    await rpc.bind("presenceRename", async (id, value, generation = 0) => {
        validateSession(id);
        validateGeneration(generation);
        const name = normalizeName(value);
        await expireSessions();
        const client = sessions.get(id);
        if (!client) {
            throw new Error("Session expired");
        }
        if (generation !== client.generation) throw new Error("Session superseded by a refreshed client");
        if (nameTaken(name, id)) {
            throw new Error("Display name is already in use");
        }
        if (client.name !== name) {
            client.name = name;
            cursorDirty = true;
            await broadcastPresence();
        }
        return snapshot(id);
    }, "Change this frontend's display name.");
    await rpc.bind("presenceLeave", async (id, generation = 0) => {
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
    clearInterval(sweepTimer);
    clearInterval(cursorTimer);
    sessions.clear();
    await Promise.all(["getStatus", "presenceHeartbeat", "presenceRename", "presenceLeave", "cursorSnapshot", "cursorUpdate", "selectionUpdate", "setCursorTick"].map((name) => rpc.unbind(name)));
};
