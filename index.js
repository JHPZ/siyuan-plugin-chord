// Generated from src/frontend by npm run compile.
const { Plugin, Menu, Dialog, Setting, showMessage, openTab, getAllEditor, getActiveEditor, fetchSyncPost } = require("siyuan");
const PRESENCE_TIMEOUT = 90000;
const DOCUMENT_ID = /^\d{14}-[a-z0-9]{7}$/;
const TREE_ROW = '.sy__file li[data-type="navigation-file"][data-node-id]';
const EDITOR_EVENTS = ["switch-protyle", "loaded-protyle-static", "destroy-protyle", "click-editorcontent"];

function escapeHTML(text) {
    return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function characterAt(root, offset) {
    const walker = document.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
        if (offset < node.textContent.length) return { node, offset };
        offset -= node.textContent.length;
    }
    return null;
}

function characterRect(node, offset) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    const rect = range.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
}

function cursorTextRoot(block) {
    return block.querySelector('[contenteditable="true"]') || block;
}

function captureCursor(point) {
    if (!point || document.hidden) return null;
    const hit = document.elementFromPoint(point.x, point.y);
    if (!hit) return null;
    const row = hit.closest(TREE_ROW);
    const block = row || hit.closest('.protyle-wysiwyg [data-node-id]');
    if (!block || block.closest(".fn__none")) return null;
    const blockId = block.getAttribute("data-node-id");
    const editor = block.closest(".protyle");
    const documentId = row ? null : editor?.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id");
    if (!DOCUMENT_ID.test(blockId) || (!row && !DOCUMENT_ID.test(documentId))) return null;
    const rect = block.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const cursor = { surface: row ? "tree" : "document", documentId, blockId, x: clamp((point.x - rect.left) / rect.width), y: clamp((point.y - rect.top) / rect.height) };
    if (row) return cursor;
    const caret = document.caretPositionFromPoint?.(point.x, point.y);
    const range = caret ? null : document.caretRangeFromPoint?.(point.x, point.y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    const root = cursorTextRoot(block);
    if (node?.nodeType !== 3 || !root.contains(node)) return cursor;
    // 锚定鼠标下的字符，避免不同窗口宽度导致整段比例定位漂移。
    for (const index of [offset - 1, offset]) {
        if (index < 0 || index >= node.textContent.length) continue;
        const character = characterRect(node, index);
        if (!character || point.x < character.left || point.x > character.right || point.y < character.top || point.y > character.bottom) continue;
        const prefix = document.createRange();
        prefix.selectNodeContents(root);
        prefix.setEnd(node, index);
        cursor.text = { offset: prefix.toString().length, x: clamp((point.x - character.left) / character.width), y: clamp((point.y - character.top) / character.height) };
        break;
    }
    return cursor;
}

function resolveCursor(cursor) {
    let blocks;
    if (cursor.surface === "tree") {
        blocks = document.querySelectorAll(`${TREE_ROW}[data-node-id="${cursor.blockId}"]`);
    } else {
        blocks = [...document.querySelectorAll(".protyle:not(.fn__none)")]
            .filter((editor) => !editor.closest(".fn__none") && editor.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id") === cursor.documentId)
            .flatMap((editor) => [...editor.querySelectorAll(`.protyle-wysiwyg [data-node-id="${cursor.blockId}"]`)]);
    }
    for (const block of blocks) {
        if (block.closest(".fn__none")) continue;
        let rect = block.getBoundingClientRect();
        let relative = cursor;
        if (cursor.text) {
            const character = characterAt(cursorTextRoot(block), cursor.text.offset);
            rect = character && characterRect(character.node, character.offset);
            relative = cursor.text;
        }
        if (!rect?.width || !rect.height) continue;
        const x = rect.left + rect.width * relative.x;
        const y = rect.top + rect.height * relative.y;
        const hit = document.elementFromPoint(x, y);
        if (hit && block.contains(hit)) return { x, y };
    }
    return null;
}

function validCursor(cursor) {
    return cursor && ["document", "tree"].includes(cursor.surface) && typeof cursor.blockId === "string" && DOCUMENT_ID.test(cursor.blockId) &&
        (cursor.surface === "document" ? typeof cursor.documentId === "string" && DOCUMENT_ID.test(cursor.documentId) : cursor.documentId === null) &&
        [cursor.x, cursor.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
        (cursor.text === undefined || (cursor.surface === "document" && cursor.text && Number.isSafeInteger(cursor.text.offset) && cursor.text.offset >= 0 && cursor.text.offset <= 10000000 &&
            [cursor.text.x, cursor.text.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)));
}

function validSelection(selection) {
    return selection && typeof selection.documentId === "string" && DOCUMENT_ID.test(selection.documentId) &&
        [selection.anchor, selection.focus].every((point) => point && typeof point.blockId === "string" && DOCUMENT_ID.test(point.blockId) &&
            Number.isSafeInteger(point.offset) && point.offset >= 0 && point.offset <= 10000000);
}

function captureSelection() {
    const selection = document.getSelection?.();
    if (document.hidden || (document.hasFocus && !document.hasFocus()) || !selection?.rangeCount || selection.isCollapsed) return null;
    const endpoints = [[selection.anchorNode, selection.anchorOffset], [selection.focusNode, selection.focusOffset]].map(([node, offset]) => {
        const block = (node.nodeType === 3 ? node.parentElement : node)?.closest?.('.protyle-wysiwyg [data-node-id]');
        if (!block || block.closest('.fn__none')) return null;
        const root = cursorTextRoot(block);
        if (!root.contains(node)) return null;
        const range = document.createRange();range.selectNodeContents(root);range.setEnd(node, offset);
        return { block, blockId: block.getAttribute('data-node-id'), offset: range.toString().length };
    });
    if (endpoints.some((point) => !point)) return null;
    const [anchor, focus] = endpoints;
    const editor = anchor.block.closest('.protyle');
    if (focus.block.closest('.protyle') !== editor) return null;
    const value = { documentId: editor?.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id'),
        anchor: { blockId: anchor.blockId, offset: anchor.offset }, focus: { blockId: focus.blockId, offset: focus.offset } };
    return validSelection(value) ? value : null;
}

function selectionPosition(block, offset) {
    const root = cursorTextRoot(block), walker = document.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
        if (offset <= node.textContent.length) return { node, offset };
        offset -= node.textContent.length;
    }
    return offset === 0 && !root.textContent.length ? { node: root, offset: 0 } : null;
}

function resolveSelection(selection) {
    const ranges = [];
    for (const editor of document.querySelectorAll('.protyle:not(.fn__none)')) {
        if (editor.closest('.fn__none') || editor.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id') !== selection.documentId) continue;
        const points = [selection.anchor, selection.focus].map((point) => {
            const block = editor.querySelector(`.protyle-wysiwyg [data-node-id="${point.blockId}"]`);
            return block && !block.closest('.fn__none') ? selectionPosition(block, point.offset) : null;
        });
        if (points.some((point) => !point)) continue;
        const [anchor, focus] = points;
        const start = document.createRange(), end = document.createRange();
        start.setStart(anchor.node, anchor.offset);start.collapse(true);
        end.setStart(focus.node, focus.offset);end.collapse(true);
        if (start.compareBoundaryPoints(0, end) <= 0) start.setEnd(focus.node, focus.offset);
        else { start.setStart(focus.node, focus.offset);start.setEnd(anchor.node, anchor.offset); }
        ranges.push(start);
    }
    return ranges;
}

module.exports = class CollaborationPlugin extends Plugin {
    async onload() {
        this.stopped = false;
        this.layoutReady = false;
        this.sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        this.generation = 1;
        this.onlineCount = null;
        this.clients = [];
        this.clientName = "";
        this.tick = 10;
        this.remoteCursors = [];
        this.remoteSelections = [];
        this.selectionHighlights = new Set();
        this.selectionSequence = 0;
        this.lastSelectionSignature = "null";
        this.cursorMarkers = new Map();
        this.cursorSequence = 0;
        this.lastCursorSignature = "null";
        try {
            const id = sessionStorage.getItem(`${this.name}:session-id`);
            const generation = Number(sessionStorage.getItem(`${this.name}:generation`));
            if (/^[a-z0-9-]{8,80}$/.test(id || "") && Number.isSafeInteger(generation) && generation >= 0 && generation < Number.MAX_SAFE_INTEGER) {
                this.sessionId = id;
                this.generation = generation + 1;
            }
            sessionStorage.setItem(`${this.name}:session-id`, this.sessionId);
            sessionStorage.setItem(`${this.name}:generation`, String(this.generation));
            this.clientName = sessionStorage.getItem(`${this.name}:display-name`) || "";
            this.resumeDocument = sessionStorage.getItem(`${this.name}:document`);
        } catch {}
        this.handlePresence = (presence) => this.updatePresence(presence);
        this.handleCursors = (state) => this.updateCursors(state);
        this.history = new PersonalHistory(this);
        this.handleDocument = () => { this.history.attach(); this.scheduleDocumentReport(); };
        this.handleKernelState = ({ detail }) => {
            if (detail.code === 2) {
                this.lastCursorSignature = this.lastSelectionSignature = undefined;
                this.refreshInBackground();
                this.loadCursors();
                this.editing?.load(true);
            }
        };
        this.editing = new EditLocks(this);
        await this.editing.bind();
        await this.kernel.rpc.bind("presence-changed", this.handlePresence);
        await this.kernel.rpc.bind("cursor-changed", this.handleCursors);
        this.eventBus.on("kernel-plugin-state-change", this.handleKernelState);
        for (const event of EDITOR_EVENTS) {
            this.eventBus.on(event, this.handleDocument);
        }
        this.addCommand({ langKey: "checkOnline", callback: () => this.checkOnline() });
        this.addCommand({ langKey: "historyList", callback: () => this.history.open(getActiveEditor()) });
        this.initSettings();
    }

    async onLayoutReady() {
        if (this.layoutStarted || this.stopped) return;
        this.layoutStarted = true;
        this.history.attach();
        this.topBar = this.addTopBar({ icon: "iconEmoji", title: this.i18n.pluginName, position: "right", callback: () => this.openMenu() });
        this.observeLayout();
        // 思源先恢复共享布局；本窗口的记录只能在恢复自己的文档后更新。
        try {
            if (DOCUMENT_ID.test(this.resumeDocument || "") && this.currentDocument() !== this.resumeDocument) {
                const restored = new Promise((resolve, reject) => {
                    this.finishRestore = () => {
                        if (this.stopped || this.currentDocument() === this.resumeDocument) resolve();
                    };
                    this.restoreTimer = setTimeout(() => reject(new Error("Document unavailable")), 5000);
                });
                await Promise.all([
                    restored,
                    Promise.resolve(openTab({ app: this.app, doc: { id: this.resumeDocument }, keepCursor: false, removeCurrentTab: false }))
                        .then(() => this.finishRestore?.()),
                ]);
            }
        } catch (error) {
            console.error(`[${this.name}] Document restoration failed:`, error);
            if (!this.stopped) showMessage(this.i18n.restoreFailed, 7000, "error");
        } finally {
            clearTimeout(this.restoreTimer);
            this.finishRestore = null;
        }
        if (this.stopped) return;
        this.layoutReady = true;
        await this.refreshInBackground();
        if (this.stopped) return;
        this.heartbeatTimer = setInterval(() => this.refreshInBackground(), 20000);
        this.startTracking();
        await this.loadCursors();
        await this.editing.start();
    }

    showEditMessage(message) {
        if (!this.stopped) showMessage(escapeHTML(message), 3000, "info");
    }

    onlineText(count) {
        return this.i18n.onlineCount.replace("${count}", String(count));
    }

    rememberName(name) {
        this.clientName = name;
        try { sessionStorage.setItem(`${this.name}:display-name`, name); } catch {}
    }

    updatePresence(presence) {
        if (this.stopped) return;
        const clients = presence?.clients || [];
        if (!presence || !Number.isSafeInteger(presence.count) || presence.count < 0 || !Array.isArray(clients) || clients.some((client) =>
            !client || typeof client.name !== "string" || [...client.name].length > 24 ||
            !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 ||
            (client.documentId !== null && !DOCUMENT_ID.test(client.documentId)))) {
            throw new Error("Invalid presence response");
        }
        if (this.clientName && !clients.some((client) => client.name === this.clientName)) {
            this.lastCursorSignature = this.lastSelectionSignature = undefined;
        }
        this.onlineCount = presence.count;
        this.clients = clients;
        this.presenceReceivedAt = Date.now();
        if (presence.self && typeof presence.self.name === "string") {
            this.peerId = presence.self.peerId;
            this.rememberName(presence.self.name);
        }
        this.topBar?.setAttribute("aria-label", `${this.i18n.pluginName} · ${this.clientName} · ${this.onlineText(presence.count)}`);
        this.scheduleTreeRender();
        this.scheduleCursorRender(false);
    }

    currentDocument() {
        const activeWindow = document.querySelector(".layout__wnd--active");
        const editors = (activeWindow || document).querySelectorAll(".protyle:not(.fn__none)");
        const editor = [...editors].find((element) => !element.closest(".fn__none"));
        const id = editor?.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id") || editor?.getAttribute("data-node-id");
        return id && DOCUMENT_ID.test(id) ? id : null;
    }

    async refreshOnline() {
        if (this.stopped || !this.layoutReady) return;
        if (Date.now() - this.presenceReceivedAt >= PRESENCE_TIMEOUT) {
            this.lastCursorSignature = this.lastSelectionSignature = undefined;
        }
        const documentId = this.currentDocument();
        try { sessionStorage.setItem(`${this.name}:document`, documentId || ""); } catch {}
        const presence = await this.kernel.rpc.call.presenceHeartbeat(this.sessionId, { name: this.clientName, documentId, generation: this.generation });
        this.updatePresence(presence);
        return presence;
    }

    refreshInBackground() {
        return this.refreshOnline().catch(() => {
            if (!this.stopped) {
                this.onlineCount = null;
                this.clients = [];
                this.lastCursorSignature = this.lastSelectionSignature = undefined;
                this.topBar?.setAttribute("aria-label", this.i18n.kernelFailed);
                this.scheduleTreeRender();
                this.remoteCursors = [];
                this.remoteSelections = [];
                this.scheduleCursorRender(false);
            }
        });
    }

    scheduleDocumentReport() {
        this.finishRestore?.();
        this.editing?.syncSelection();
        this.scheduleCursorRender(false);
        if (this.stopped || !this.layoutReady || this.documentFrame) return;
        this.documentFrame = requestAnimationFrame(() => {
            this.documentFrame = 0;
            const id = this.currentDocument();
            if (!this.stopped && id !== this.reportedDocument) {
                this.reportedDocument = id;
                this.refreshInBackground();
            }
        });
    }

    scheduleTreeRender() {
        if (this.stopped || this.treeFrame) return;
        this.treeFrame = requestAnimationFrame(() => {
            this.treeFrame = 0;
            if (!this.stopped) this.renderTreePresence();
        });
    }

    observeLayout() {
        this.domObserver = new MutationObserver((records) => {
            for (const record of records) {
                if (record.target.closest?.(".collab-cursor-layer")) continue;
                if (record.type === "attributes") {
                    if (record.target.matches(".protyle") || record.target.classList.contains("layout__wnd--active") ||
                        (record.oldValue || "").includes("layout__wnd--active")) this.scheduleDocumentReport();
                    continue;
                }
                const elements = [...record.addedNodes, ...record.removedNodes].filter((node) => node.nodeType === 1 && !node.classList.contains("collab-presence-users"));
                if (!elements.length) continue;
                if (record.target.closest(".sy__file") || elements.some((node) => node.matches(".sy__file") || node.querySelector(".sy__file"))) this.scheduleTreeRender();
                if ((record.target.closest(".layout-tab-container") && !record.target.closest(".protyle")) ||
                    elements.some((node) => node.matches(".protyle") || node.querySelector(".protyle"))) this.scheduleDocumentReport();
                this.scheduleCursorRender(false);
            }
        });
        this.domObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-node-id"], attributeOldValue: true });
    }

    initSettings() {
        this.setting = new Setting({});
        this.setting.addItem({
            title: this.i18n.cursorTick,
            description: this.i18n.cursorTickTip,
            createActionElement: () => {
                const form = document.createElement("form");
                form.className = "collab-tick-form";
                const input = document.createElement("input");
                input.className = "b3-text-field";
                input.type = "number";
                input.min = "1";
                input.max = "30";
                input.step = "1";
                input.required = true;
                input.value = String(this.tick);
                input.setAttribute("aria-label", this.i18n.cursorTick);
                const save = document.createElement("button");
                save.type = "submit";
                save.className = "b3-button";
                save.textContent = this.i18n.save;
                const error = document.createElement("span");
                error.className = "ft__error";
                error.setAttribute("role", "alert");
                form.append(input, save, error);
                form.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    const tick = Number(input.value);
                    if (!Number.isInteger(tick) || tick < 1 || tick > 30) {
                        error.textContent = this.i18n.cursorTickFailed;
                        return;
                    }
                    save.disabled = true;
                    error.textContent = "";
                    try {
                        this.updateCursors(await this.kernel.rpc.call.setCursorTick(tick));
                        if (!this.stopped) showMessage(this.i18n.cursorTickSaved, 3000, "info");
                    } catch {
                        error.textContent = this.i18n.cursorTickFailed;
                    } finally {
                        save.disabled = false;
                    }
                });
                return form;
            },
        });
    }

    async loadCursors() {
        try { this.updateCursors(await this.kernel.rpc.call.cursorSnapshot()); } catch {}
    }

    async onDataChanged() {
        await this.loadCursors();
    }

    updateCursors(state) {
        if (this.stopped) return;
        if (!state || !Number.isInteger(state.tick) || state.tick < 1 || state.tick > 30 || !Array.isArray(state.cursors) || state.cursors.some((client) =>
            !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 || !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validCursor(client.cursor))) throw new Error("Invalid cursor response");
        const selections = state.selections || [];
        if (!Array.isArray(selections) || selections.some((client) => !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 ||
            !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validSelection(client.selection))) throw new Error("Invalid selection response");
        if (this.tick !== state.tick) {
            this.tick = state.tick;
            if (this.trackingStarted) this.startCursorTimer();
        }
        this.remoteCursors = state.cursors;
        this.remoteSelections = selections;
        this.scheduleCursorRender(true);
    }

    startTracking() {
        this.trackingStarted = true;
        this.cursorLayer = document.createElement("div");
        this.cursorLayer.className = "collab-cursor-layer";
        this.cursorLayer.setAttribute("aria-hidden", "true");
        document.body.append(this.cursorLayer);
        this.selectionStyle = document.createElement('style');
        this.cursorLayer.append(this.selectionStyle);
        this.handlePointer = (event) => {
            if (!event.pointerType || event.pointerType === "mouse" || event.pointerType === "pen") {
                this.pointer = { x: event.clientX, y: event.clientY };
                this.scheduleCursorRender(true);
            }
        };
        this.handlePointerLeave = () => {
            this.pointer = null;
            this.scheduleCursorRender(true);
        };
        this.handlePointerOut = (event) => { if (!event.relatedTarget) this.handlePointerLeave(); };
        this.handleCursorLayout = () => this.scheduleCursorRender(false);
        this.handleVisibility = () => {
            if (document.hidden) this.handlePointerLeave();
            else { this.refreshInBackground(); this.loadCursors(); }
            this.scheduleCursorRender(false);
        };
        document.addEventListener("pointermove", this.handlePointer, { passive: true });
        document.addEventListener("pointerout", this.handlePointerOut, { passive: true });
        document.addEventListener("scroll", this.handleCursorLayout, { capture: true, passive: true });
        document.addEventListener("visibilitychange", this.handleVisibility);
        window.addEventListener("blur", this.handlePointerLeave);
        window.addEventListener("resize", this.handleCursorLayout);
        this.startCursorTimer();
    }

    startCursorTimer() {
        clearInterval(this.cursorTimer);
        this.cursorTimer = setInterval(() => {
            if (Date.now() - this.presenceReceivedAt >= PRESENCE_TIMEOUT) this.scheduleCursorRender(false);
            return Promise.allSettled([this.sendCursor(), this.sendSelection()]);
        }, 1000 / this.tick);
    }

    async sendCursor() {
        if (this.stopped || !this.layoutReady || this.cursorSending) return;
        const cursor = captureCursor(this.pointer);
        const signature = JSON.stringify(cursor);
        if (signature === this.lastCursorSignature) return;
        this.cursorSending = true;
        try {
            await this.kernel.rpc.call.cursorUpdate(this.sessionId, this.generation, ++this.cursorSequence, cursor);
            this.lastCursorSignature = signature;
        } catch {
            this.remoteCursors = [];
            this.scheduleCursorRender(false);
        } finally {
            this.cursorSending = false;
        }
    }

    async sendSelection() {
        if (this.stopped || !this.layoutReady || this.selectionSending) return;
        const selection = captureSelection(), signature = JSON.stringify(selection);
        if (signature === this.lastSelectionSignature) return;
        this.selectionSending = true;
        try {
            await this.kernel.rpc.call.selectionUpdate(this.sessionId, this.generation, ++this.selectionSequence, selection);
            this.lastSelectionSignature = signature;
        } catch {
            this.remoteSelections = [];
            this.scheduleCursorRender(false);
        } finally { this.selectionSending = false; }
    }

    scheduleCursorRender(animate) {
        this.editing?.scheduleRender();
        if (this.stopped || !this.cursorLayer) return;
        this.animateCursorFrame = this.cursorFrame ? this.animateCursorFrame && animate : animate;
        if (this.cursorFrame) return;
        this.cursorFrame = requestAnimationFrame(() => {
            this.cursorFrame = 0;
            this.renderCursors(this.animateCursorFrame);
        });
    }

    renderCursors(animate) {
        const visible = new Set();
        if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) {
            for (const client of this.remoteCursors) {
                if (client.name === this.clientName || !this.clients.some((person) => person.name === client.name)) continue;
                const point = resolveCursor(client.cursor);
                if (!point) continue;
                visible.add(client.name);
                let marker = this.cursorMarkers.get(client.name);
                if (!marker) {
                    marker = document.createElement("div");
                    marker.className = "collab-cursor";
                    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    arrow.setAttribute("viewBox", "0 0 22 22");
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute("d", "M2 2L19 8.5L12 12L8.5 19Z");
                    arrow.append(path);
                    const label = document.createElement("span");
                    label.textContent = client.name;
                    marker.append(arrow, label);
                    this.cursorLayer.append(marker);
                    this.cursorMarkers.set(client.name, marker);
                }
                marker.style.setProperty("--collab-cursor-hue", String(client.hue));
                marker.style.transitionDuration = animate ? `${Math.min(120, 1000 / this.tick)}ms` : "0ms";
                marker.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
                const rect = marker.getBoundingClientRect();
                const nearby = this.pointer && this.pointer.x >= rect.left - 32 && this.pointer.x <= rect.right + 32 &&
                    this.pointer.y >= rect.top - 32 && this.pointer.y <= rect.bottom + 32;
                marker.style.opacity = nearby ? "0.3" : "1";
            }
        }
        for (const [name, marker] of this.cursorMarkers) {
            if (!visible.has(name)) {
                marker.remove();
                this.cursorMarkers.delete(name);
            }
        }
        this.renderSelections();
    }

    renderSelections() {
        if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
        for (const key of this.selectionHighlights) CSS.highlights.delete(key);
        this.selectionHighlights.clear();
        const rules = [];
        if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) for (const client of this.remoteSelections) {
            if (client.name === this.clientName || !this.clients.some((person) => person.name === client.name)) continue;
            const ranges = resolveSelection(client.selection);
            if (!ranges.length) continue;
            const key = `siyuan-collab-selection-${this.selectionHighlights.size}`;
            CSS.highlights.set(key, new Highlight(...ranges));
            this.selectionHighlights.add(key);
            rules.push(`::highlight(${key}) { background-color: hsl(${client.hue} 80% 55% / 0.28); }`);
        }
        this.selectionStyle.textContent = rules.join('\n');
    }

    clearRow(row) {
        row.classList.remove("collab-presence");
        row.style.removeProperty("--collab-presence-hue");
        row.removeAttribute("data-collab-presence");
        row.querySelector(":scope > .collab-presence-users")?.remove();
    }

    renderTreePresence() {
        const byDocument = new Map();
        for (const client of this.clients) {
            if (!client.documentId) continue;
            if (!byDocument.has(client.documentId)) byDocument.set(client.documentId, []);
            byDocument.get(client.documentId).push(client);
        }
        for (const row of document.querySelectorAll(`${TREE_ROW}, .sy__file .collab-presence`)) {
            const viewers = byDocument.get(row.getAttribute("data-node-id"));
            if (!viewers?.length) {
                if (row.classList.contains("collab-presence")) this.clearRow(row);
                continue;
            }
            const signature = JSON.stringify(viewers);
            if (row.getAttribute("data-collab-presence") === signature) continue;
            this.clearRow(row);
            const group = document.createElement("button");
            group.type = "button";
            group.className = "collab-presence-users";
            group.textContent = String(viewers.length);
            const description = this.i18n.viewers.replace("${count}", String(viewers.length));
            group.setAttribute("aria-label", description);
            group.setAttribute("aria-haspopup", "menu");
            group.title = description;
            for (const type of ["pointerdown", "mousedown", "dblclick", "keydown"]) {
                group.addEventListener(type, (event) => event.stopPropagation());
            }
            group.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const menu = new Menu(`${this.name}-viewers`);
                for (const client of viewers) menu.addItem({ label: escapeHTML(client.name) });
                const rect = group.getBoundingClientRect();
                menu.open({ x: rect.left, y: rect.bottom });
            });
            const icon = row.querySelector(":scope > .b3-list-item__icon") || row.querySelector(":scope > .b3-list-item__text");
            if (icon) icon.before(group); else row.append(group);
            row.classList.add("collab-presence");
            row.style.setProperty("--collab-presence-hue", String(viewers[0].hue));
            row.setAttribute("data-collab-presence", signature);
        }
    }

    openMenu() {
        const menu = new Menu(`${this.name}-presence`);
        menu.addItem({ icon: "iconEmoji", label: this.i18n.checkOnline, click: () => this.checkOnline() });
        menu.addItem({ icon: "iconEdit", label: `${this.i18n.renameSelf} (${escapeHTML(this.clientName || this.i18n.connecting)})`, click: () => this.openRenameDialog() });
        menu.addItem({ icon: "iconSettings", label: this.i18n.cursorSettings, click: () => this.openSetting() });
        menu.addItem({ icon: "iconUndo", label: this.i18n.undoMine, click: () => this.history.request(getActiveEditor(), "undo") });
        menu.addItem({ icon: "iconRedo", label: this.i18n.redoMine, click: () => this.history.request(getActiveEditor(), "redo") });
        menu.addItem({ icon: "iconList", label: this.i18n.historyList, click: () => this.history.open(getActiveEditor()) });
        let rect = this.topBar.getBoundingClientRect();
        if (rect.width === 0) rect = document.getElementById("barMore")?.getBoundingClientRect() || rect;
        menu.open({ x: rect.right, y: rect.bottom, isLeft: true });
    }

    openRenameDialog() {
        if (this.renameDialog) return;
        const dialog = new Dialog({ title: this.i18n.renameSelf, content: '<div class="b3-dialog__content"></div>', width: "360px", destroyCallback: () => { this.renameDialog = null; } });
        this.renameDialog = dialog;
        const form = document.createElement("form");
        form.className = "collab-name-form";
        const label = document.createElement("label");
        label.textContent = this.i18n.nameLabel;
        const input = document.createElement("input");
        input.className = "b3-text-field fn__block";
        input.value = this.clientName;
        input.maxLength = 24;
        input.required = true;
        input.autocomplete = "off";
        label.append(input);
        const error = document.createElement("div");
        error.className = "ft__error";
        error.setAttribute("role", "alert");
        const actions = document.createElement("div");
        actions.className = "collab-name-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "b3-button b3-button--cancel";
        cancel.textContent = this.i18n.cancel;
        cancel.addEventListener("click", () => dialog.destroy());
        const save = document.createElement("button");
        save.type = "submit";
        save.className = "b3-button";
        save.textContent = this.i18n.save;
        actions.append(cancel, save);
        form.append(label, error, actions);
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            save.disabled = true;
            error.textContent = "";
            try {
                await this.refreshOnline();
                if (this.stopped) return;
                const presence = await this.kernel.rpc.call.presenceRename(this.sessionId, input.value, this.generation);
                this.updatePresence(presence);
                dialog.destroy();
            } catch {
                error.textContent = this.i18n.renameFailed;
                save.disabled = false;
                input.focus();
            }
        });
        dialog.element.querySelector(".b3-dialog__content").append(form);
        input.focus();
        input.select();
    }

    async checkOnline() {
        try {
            const presence = await this.refreshOnline();
            if (!this.stopped && presence) showMessage(this.onlineText(presence.count), 5000, "info");
        } catch (error) {
            if (!this.stopped) {
                console.error(`[${this.name}] Presence check failed:`, error);
                showMessage(this.i18n.kernelFailed, 7000, "error");
            }
        }
    }

    async onunload() {
        this.stopped = true;
        const historyStopped = this.history?.stop();
        this.finishRestore?.();
        clearTimeout(this.restoreTimer);
        clearInterval(this.heartbeatTimer);
        clearInterval(this.cursorTimer);
        cancelAnimationFrame(this.cursorFrame);
        this.cursorLayer?.remove();
        this.cursorMarkers.clear();
        if (typeof CSS !== 'undefined' && CSS.highlights) for (const key of this.selectionHighlights) CSS.highlights.delete(key);
        document.removeEventListener("pointermove", this.handlePointer);
        document.removeEventListener("pointerout", this.handlePointerOut);
        document.removeEventListener("scroll", this.handleCursorLayout, true);
        document.removeEventListener("visibilitychange", this.handleVisibility);
        window.removeEventListener("blur", this.handlePointerLeave);
        window.removeEventListener("resize", this.handleCursorLayout);
        cancelAnimationFrame(this.treeFrame);
        cancelAnimationFrame(this.documentFrame);
        this.domObserver?.disconnect();
        const editingStopped = this.editing?.stop();
        this.renameDialog?.destroy();
        document.querySelectorAll(".sy__file .collab-presence").forEach((row) => this.clearRow(row));
        this.eventBus.off("kernel-plugin-state-change", this.handleKernelState);
        for (const event of EDITOR_EVENTS) this.eventBus.off(event, this.handleDocument);
        const saved = await editingStopped;
        await historyStopped;
        await Promise.allSettled([this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors)]);
        if (saved) await this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation).catch(() => {});
    }
};

// SiYuan DOM and completion contracts stay here; coordination does not infer timing from DOM events.
class SiyuanEditorAdapter {
    dropPlan(event) {
        const type = Array.from(event.dataTransfer?.types || []).find(type => type.startsWith('application/siyuan-gutter'));
        if (!type) return null;
        const ids = type.slice('application/siyuan-gutter'.length).split('\u200b')[2]?.split(',');
        const scope = event.target?.closest?.('.protyle')?.querySelector('.protyle-wysiwyg');
        const editor = typeof getAllEditor === 'function' && getAllEditor().find(editor => editor.protyle?.wysiwyg?.element === scope);
        const p = editor?.protyle;
        if (!p || p.disabled || p.lite || !ids?.length || ids.length > 100 || new Set(ids).size !== ids.length ||
            ids.some(id => !EDIT_BLOCK_ID.test(id)) || event.ctrlKey || event.altKey || event.shiftKey) throw new Error('editMoveUnsupported');
        const source = ids.map(id => scope.querySelector(`[data-node-id="${id}"]`));
        if (source.some(node => !node)) throw new Error('editMoveSameDocument');
        const targets = [...scope.querySelectorAll('.dragover__top, .dragover__bottom')];
        const target = targets.length === 1 ? targets[0] : null;
        if (target && source.some(node => node.contains(target))) return { noop: true };
        // Horizontal drops create containers; leave those untouched until their inverse is supported.
        if (!target?.hasAttribute('data-node-id') || scope.querySelector('.dragover__left, .dragover__right') ||
            source.some(node => node.contains(target) || source.some(other => other !== node && other.contains(node))) ||
            source.some(node => node.matches('[fold="1"], [data-type="NodeAttributeView"], [data-type="NodeBlockQueryEmbed"]'))) throw new Error('editMoveUnsupported');
        const parent = target.parentElement;
        const accepts = container => container === scope ||
            ['NodeBlockquote', 'NodeSuperBlock', 'NodeList'].includes(container.getAttribute('data-type'));
        if (source.some(node => !accepts(parent) || !accepts(node.parentElement) ||
            (parent.getAttribute('data-type') === 'NodeList' ? node.getAttribute('data-type') !== 'NodeListItem' ||
                node.getAttribute('data-subtype') !== parent.getAttribute('data-subtype') : node.getAttribute('data-type') === 'NodeListItem') ||
            (node.parentElement !== parent && ![...node.parentElement.children].some(sibling => sibling.hasAttribute('data-node-id') && !source.includes(sibling))))) {
            throw new Error('editMoveUnsupported');
        }
        const siblings = [...parent.children].filter(node => node.hasAttribute('data-node-id'));
        const ordered = [...scope.querySelectorAll('[data-node-id]')].filter(node => source.includes(node));
        const remaining = siblings.filter(node => !source.includes(node));
        const index = remaining.indexOf(target) + (target.classList.contains('dragover__bottom') ? 1 : 0);
        const result = [...remaining.slice(0, index), ...ordered, ...remaining.slice(index)];
        if (result.every((node, i) => node === siblings[i])) return { noop: true };
        const parentID = parent.closest('[data-node-id]')?.getAttribute('data-node-id') || p.block.rootID;
        const locations = new Map([...ordered, target].map(node => {
            let previous = node.previousElementSibling;
            while (previous && !previous.hasAttribute('data-node-id')) previous = previous.previousElementSibling;
            return [node.getAttribute('data-node-id'), {
                parent: node.parentElement.closest('[data-node-id]')?.getAttribute('data-node-id') || p.block.rootID,
                previous: previous?.getAttribute('data-node-id') || ''
            }];
        }));
        let previousID = remaining[index - 1]?.getAttribute('data-node-id') || '';
        const forward = ordered.map(node => {
            const id = node.getAttribute('data-node-id'), op = { action: 'move', id, parentID, previousID };
            previousID = id; return op;
        });
        const backward = ordered.map(node => {
            const id = node.getAttribute('data-node-id');
            return { action: 'move', id, parentID: locations.get(id).parent, previousID: locations.get(id).previous };
        });
        return { editor, forward, backward, locations };
    }

    clearDrop(event) {
        event.target?.closest?.('.protyle')?.querySelectorAll('.dragover__top, .dragover__bottom, .dragover__left, .dragover__right')
            .forEach(node => node.classList.remove('dragover__top', 'dragover__bottom', 'dragover__left', 'dragover__right'));
        document.querySelector('.drag-tip')?.remove();
        requestAnimationFrame(() => document.querySelector('.drag-tip')?.remove());
    }

    editors(documentId) {
        return typeof getAllEditor === 'function' ? getAllEditor().filter(editor => editor.protyle?.block?.rootID === documentId) : [];
    }

    context(event, pointer = false, intent = "selection") {
        const target = event?.target?.nodeType === 3 ? event.target.parentElement : event?.target;
        const selection = document.getSelection?.();
        const node = selection?.anchorNode;
        const anchor = node?.nodeType === 3 ? node.parentElement : node;
        const toolbar = target?.closest?.(".protyle-toolbar");
        const scope = (toolbar ? anchor : target || anchor)?.closest?.(".protyle-wysiwyg");
        if (!scope || scope.closest(".fn__none")) return null;
        const editor = scope.closest(".protyle");
        const documentId = editor?.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id");
        if (!EDIT_BLOCK_ID.test(documentId || "")) return null;
        let blocks;
        const range = !pointer && selection?.rangeCount && scope.contains(anchor) ? selection.getRangeAt(0) : null;
        if (pointer) {
            blocks = [target.closest("[data-node-id]")];
        } else {
            blocks = [...scope.querySelectorAll(".protyle-wysiwyg--select")];
            if (!blocks.length) {
                blocks = range && !range.collapsed ? [...scope.querySelectorAll("[data-node-id]")].filter((block) =>
                    !block.querySelector("[data-node-id]") && range.intersectsNode(block)) : [anchor?.closest?.("[data-node-id]") || target?.closest?.("[data-node-id]")];
                if (range && !range.collapsed && blocks.length > 1 && intent === "selection" && range.endOffset === 0) {
                    // 双击空行可能选到下一块的起点；只有实际修改跨块选区时才申请边界块。
                    let end = range.endContainer;
                    while (end && end !== scope && !end.previousSibling) end = end.parentNode;
                    blocks = blocks.filter((block) => block !== end);
                }
            }
        }
        blocks = blocks.filter((block) => block && scope.contains(block));
        const key = event?.key;
        const inputType = event?.inputType || "";
        const backward = key === "Backspace" || inputType === "deleteContentBackward";
        const forward = key === "Delete" || inputType === "deleteContentForward";
        if (range?.collapsed && blocks.length === 1 && (backward || forward)) {
            const boundary = range.cloneRange();
            boundary.selectNodeContents(cursorTextRoot(blocks[0]));
            if (backward) boundary.setEnd(range.startContainer, range.startOffset); else boundary.setStart(range.endContainer, range.endOffset);
            if (!boundary.toString().length) {
                const leaves = [...scope.querySelectorAll("[data-node-id]")].filter((block) => !block.querySelector("[data-node-id]"));
                const sibling = leaves[leaves.indexOf(blocks[0]) + (backward ? -1 : 1)];
                if (sibling) blocks.push(sibling);
            }
        }
        if (!blocks.length) return null;
        const paths = blocks.map((block) => {
            const ancestors = [];
            let parent = block.parentElement;
            while (parent && parent !== scope) {
                const id = parent.getAttribute("data-node-id");
                if (EDIT_BLOCK_ID.test(id || "")) ancestors.push(id);
                parent = parent.parentElement;
            }
            return { blockId: block.getAttribute("data-node-id"), ancestors };
        });
        if (paths.some((block) => !EDIT_BLOCK_ID.test(block.blockId || ""))) return null;
        return { documentId, blocks: paths };
    }

    content(block) {
        if (!block) return null;
        const copy = block.cloneNode(true);
        copy.removeAttribute('updated');
        copy.querySelectorAll('[updated]').forEach(node => node.removeAttribute('updated'));
        copy.querySelectorAll('wbr').forEach(node => node.remove());
        return copy.outerHTML;
    }

    async complete(documentId) {
        const editors = this.editors(documentId);
        if (!editors.length) throw new Error('editUnavailable');
        await this.flush(editors);
    }

    async flush(editors) {
        const results = await Promise.allSettled(editors.map(editor => Promise.resolve().then(() => editor.flushPendingTransactions())));
        const failed = results.find(result => result.status === 'rejected');
        if (failed) throw failed.reason;
    }

    async replay(operation, receiver, documentId) {
        const editors = this.editors(documentId);
        if (!editors.length || editors.some(editor => typeof editor.flushPendingTransactions !== 'function')) throw new Error('editUnavailable');
        if (operation.text !== undefined) {
            const scope = receiver.closest?.('.protyle-wysiwyg');
            // execCommand skips the native text keydown that exits Escape's block selection mode.
            if (receiver.closest?.('.protyle-wysiwyg--select-mode')) {
                scope.querySelectorAll('.protyle-wysiwyg--select-mode, .protyle-wysiwyg--select').forEach(node => {
                    node.classList.remove('protyle-wysiwyg--select-mode', 'protyle-wysiwyg--select');
                    node.removeAttribute('select-start'); node.removeAttribute('select-end');
                });
            }
            const block = receiver.closest?.('[data-node-id]');
            const wysiwyg = editors.find(editor => editor.protyle.wysiwyg?.element.contains(receiver))?.protyle.wysiwyg;
            // execCommand skips native keydown; renderLocal clears the snapshot needed by the first input undo.
            if (block && wysiwyg?.lastHTMLs && wysiwyg.lastHTMLs[block.getAttribute('data-node-id')] === undefined) {
                wysiwyg.lastHTMLs[block.getAttribute('data-node-id')] = block.outerHTML;
            }
            if (!document.execCommand('insertText', false, operation.text)) throw new Error('editUnavailable');
        } else {
            // SiYuan matches structural hotkeys by legacy keyCode as well as key.
            const keyCode = { Enter: 13, Backspace: 8, Delete: 46 }[operation.key];
            if (!keyCode) throw new Error('editUnavailable');
            const event = new KeyboardEvent('keydown', { key: operation.key, code: operation.key, keyCode, bubbles: true, cancelable: true });
            if (receiver.dispatchEvent(event)) {
                // Synthetic keydown has no browser default action for ordinary character deletion.
                const command = { Backspace: 'delete', Delete: 'forwardDelete' }[operation.key];
                if (!command || !document.execCommand(command, false)) throw new Error('editUnavailable');
            }
        }
        // Drain the editor's tracked input tasks and transaction queue before the next operation.
        await this.complete(documentId);
    }
}

const EDIT_BLOCK_ID = /^\d{14}-[a-z0-9]{7}$/;

// One owner for lease changes, save barriers and explicit multi-block operations.
class EditCoordinator {
    constructor(plugin, adapter) {
        this.plugin = plugin;
        this.adapter = adapter;
        this.sequence = 0;
        this.revision = 0;
        this.epoch = 0;
        this.phase = 'browsing';
        this.editTarget = null;
        this.held = [];
        this.desired = [];
        this.jobs = [];
        this.lease = null;
        this.mayHold = false;
        this.leaseUntil = 0;
    }

    normalize(context) {
        if (!context || !EDIT_BLOCK_ID.test(context.documentId || '') || !Array.isArray(context.blocks) ||
            !context.blocks.length || context.blocks.length > 200) throw new Error('Invalid edit context');
        const blocks = new Map();
        for (const block of context.blocks) {
            if (!block || !EDIT_BLOCK_ID.test(block.blockId || '') || !Array.isArray(block.ancestors) || block.ancestors.length > 32 ||
                block.ancestors.some(id => !EDIT_BLOCK_ID.test(id || '') || id === block.blockId)) throw new Error('Invalid edit context');
            const normalized = { blockId: block.blockId, ancestors: [...new Set(block.ancestors)] };
            if (blocks.has(block.blockId) && JSON.stringify(blocks.get(block.blockId)) !== JSON.stringify(normalized)) throw new Error('Invalid edit context');
            blocks.set(block.blockId, normalized);
        }
        return { documentId: context.documentId, blocks: [...blocks.values()] };
    }

    key(context) {
        return JSON.stringify({ documentId: context.documentId, blocks: [...context.blocks].sort((a, b) => a.blockId.localeCompare(b.blockId)) });
    }

    enqueue(run) {
        const promise = new Promise((resolve, reject) => this.jobs.push({ run, resolve, reject }));
        this.pump();
        return promise;
    }

    async pump() {
        if (this.running) return;
        this.running = true;
        while (this.jobs.length) {
            const job = this.jobs.shift();
            try { job.resolve(await job.run()); } catch (error) { job.reject(error); }
        }
        this.running = false;
    }

    revoke() { this.held = []; this.leaseUntil = 0; }

    invalidate() {
        ++this.epoch; ++this.revision;
        if (this.operation) this.operation.cancelled = true;
        if (this.lease) this.failedFlush ||= this.lease.editors;
        this.lease = null; this.signature = ''; this.ready = false;
        this.revoke(); this.phase = 'blocked';
    }

    owns(context) {
        return this.ready && this.phase === 'editing' && this.leaseUntil > Date.now() && !this.conflict(context) &&
            context.blocks.every(block => this.held.some(held => held.blockId === block.blockId || block.ancestors.includes(held.blockId)));
    }

    async send(context) {
        if (this.renewing) await this.renewing;
        this.rpcPending = true;
        if (context) this.mayHold = true;
        const sequence = ++this.sequence, epoch = this.epoch;
        try {
            const state = await this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence,
                context?.documentId || null, context?.blocks || []);
            if (epoch !== this.epoch) throw new Error('editUnavailable');
            if (typeof state?.granted !== 'boolean') throw new Error('Invalid edit response');
            this.update(state);
            if (!context && state.granted) this.mayHold = false;
            return state;
        } finally { this.rpcPending = false; }
    }

    renew() {
        if (!this.lease || this.renewing || this.rpcPending) return this.renewing;
        const lease = this.lease, started = Date.now(), sequence = ++this.sequence, epoch = this.epoch;
        this.renewing = this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence,
            lease.context.documentId, lease.context.blocks).then(state => {
                if (epoch !== this.epoch) return;
                this.update(state);
                if (this.lease !== lease) return;
                if (!state.granted || lease.until <= started) throw new Error('editUnavailable');
                lease.until = started + state.ttl - 1000;
                if (this.phase === 'editing') this.leaseUntil = lease.until;
            }).catch(() => {
                if (epoch !== this.epoch) return;
                this.revoke(); this.ready = false; this.phase = 'blocked';
                if (this.operation) this.operation.cancelled = true;
            }).finally(() => { this.renewing = null; });
        return this.renewing;
    }

    async save(documentId) {
        this.phase = 'saving';
        this.revoke();
        this.flushContext = this.lease?.context;
        const editors = this.failedFlush || this.adapter.editors(documentId);
        // Retain the acquired editor even if it disappeared from getAllEditor during a close.
        const all = [...new Set([...editors, ...(this.lease?.editors || [])])];
        const flushing = (async () => {
            await this.inputBarrier;
            await this.adapter.flush(all);
        })();
        this.flushing = flushing;
        try { await flushing; this.failedFlush = null; }
        catch (error) {
            this.failedFlush = all; this.ready = false; this.phase = 'blocked';
            this.plugin.showEditMessage(this.plugin.i18n.editFlushFailed);
            throw error;
        } finally { if (this.flushing === flushing) { this.flushing = null; this.flushContext = null; } }
    }

    async acquire(context, current) {
        if (!current()) return false;
        this.phase = 'acquiring';
        const started = Date.now();
        const state = await this.send(context);
        if (state.granted) this.lease = { context, until: started + state.ttl - 1000, editors: this.adapter.editors(context.documentId) };
        if (!current()) return false;
        this.ready = true;
        if (!state.granted || this.lease.until <= Date.now()) { this.phase = 'blocked'; return false; }
        this.held = context.blocks; this.leaseUntil = this.lease.until; this.phase = 'editing';
        return true;
    }

    claim(context, force = false) {
        if (this.closing || this.stopped || this.operation || this.uncertain) return Promise.resolve(false);
        context = this.normalize(context);
        const signature = this.key(context);
        if (signature === this.signature) {
            if (this.pending) return this.pending;
            if (this.owns(context)) return force ? Promise.resolve(this.renew()).then(() => this.owns(context)) : Promise.resolve(true);
        }
        const revision = ++this.revision;
        this.signature = signature; this.desired = context.blocks; this.desiredDocumentId = context.documentId;
        this.revoke();
        const request = this.enqueue(async () => {
            const current = () => revision === this.revision && !this.closing && !this.stopped && !this.operation;
            if (!current()) return false;
            try {
                if (this.lease || this.failedFlush || this.inputBarrier) await this.save(this.lease?.context.documentId || context.documentId);
                return await this.acquire(context, current);
            }
            catch { this.ready = false; this.revoke(); this.phase = 'blocked'; return false; }
        });
        this.pending = request;
        request.finally(() => { if (this.pending === request) this.pending = null; });
        return request;
    }

    async relinquish() {
        if (this.uncertain) throw new Error('historyUncertain');
        if (this.lease || this.failedFlush || this.inputBarrier) await this.save(this.lease?.context.documentId);
        // Also invalidate an in-flight grant whose caller cancelled its intent.
        if (this.lease || this.mayHold) {
            const state = await this.send(null);
            if (!state.granted) throw new Error('editUnavailable');
        }
        this.lease = null; this.revoke(); this.phase = 'browsing';
    }

    release() {
        ++this.revision;
        if (this.operation) this.operation.cancelled = true;
        this.editTarget = null;
        this.signature = ''; this.desired = []; this.desiredDocumentId = null; this.revoke();
        return this.enqueue(async () => {
            try { await this.relinquish(); return true; }
            catch { this.phase = 'blocked'; return false; }
        });
    }

    // prepare/validate may read; only execute may write. All affected blocks belong to one claim.
    runOperation(plan) {
        if (this.uncertain) return Promise.reject(new Error('historyUncertain'));
        if (this.closing || this.stopped || this.operation) return Promise.reject(new Error('historyBusy'));
        ++this.revision;
        this.operation = plan;
        this.editTarget = null; this.signature = ''; this.desired = [];
        this.revoke();
        const current = () => !plan.cancelled && !this.closing && plan.current();
        return this.enqueue(async () => {
            let completed = false;
            try {
                await this.save(plan.documentId);
                if (!current()) return false;
                const prepared = await plan.prepare();
                if (!prepared || !current()) return false;
                const context = this.normalize(prepared);
                if (context.documentId !== plan.documentId) throw new Error('historyUnsupported');
                if (!await this.acquire(context, current)) {
                    if (current()) {
                        const conflict = this.conflict(context);
                        this.plugin.showEditMessage(conflict ? this.plugin.i18n.historyLocked.replace('${name}', conflict.name) : this.plugin.i18n.editUnavailable);
                    }
                    return false;
                }
                this.phase = 'validating'; this.revoke();
                await plan.validate(context);
                if (!current() || !this.ready || !this.lease || this.lease.until <= Date.now() || this.conflict(context)) return false;
                this.phase = 'executing';
                try { await plan.execute(context); }
                catch (error) {
                    if (error.commitUnknown) { this.uncertain = true; this.phase = 'blocked'; this.ready = false; }
                    throw error;
                }
                completed = true;
                return true;
            } finally {
                try { await this.relinquish(); }
                catch (error) {
                    this.revoke(); this.phase = 'blocked';
                    if (!completed) throw error;
                    this.plugin.showEditMessage(this.plugin.i18n.editReleaseFailed);
                }
                finally { this.operation = null; }
            }
        });
    }

    async close() {
        this.closing = true;
        const saved = await this.release();
        clearInterval(this.renewTimer);
        return saved;
    }
}

class EditLockView {
    constructor(plugin) { this.plugin = plugin; this.markers = new Map(); }
    schedule(locks) {
        this.locks = locks;
        if (this.stopped || this.frame || !this.plugin.cursorLayer) return;
        this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(this.locks); });
    }

    render(locks) {
        const visible = new Set();
        if (!document.hidden) for (const lock of locks) {
            for (const block of document.querySelectorAll(`.protyle-wysiwyg [data-node-id="${lock.blockId}"]`)) {
                const editor = block.closest(".protyle");
                if (block.closest(".fn__none") || editor?.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id") !== lock.documentId) continue;
                const rect = block.getBoundingClientRect();
                const clip = (block.closest(".protyle-content") || editor).getBoundingClientRect();
                const left = Math.max(rect.left, clip.left, 0), top = Math.max(rect.top, clip.top, 0);
                const right = Math.min(rect.right, clip.right, window.innerWidth), bottom = Math.min(rect.bottom, clip.bottom, window.innerHeight);
                if (right <= left || bottom <= top) continue;
                visible.add(block);
                let marker = this.markers.get(block);
                if (!marker) {
                    marker = document.createElement("div");
                    marker.className = "collab-edit-lock";
                    const label = document.createElement("span");
                    marker.append(label);
                    this.plugin.cursorLayer.append(marker);
                    this.markers.set(block, marker);
                }
                marker.firstElementChild.textContent = this.plugin.i18n.editOwner.replace("${name}", lock.name);
                marker.classList.toggle("collab-edit-lock--inset", top - 22 < Math.max(clip.top, 0));
                marker.style.setProperty("--collab-lock-hue", String(lock.hue));
                marker.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                marker.style.width = `${right - left}px`;
                marker.style.height = `${bottom - top}px`;
            }
        }
        for (const [block, marker] of this.markers) if (!visible.has(block)) { marker.remove(); this.markers.delete(block); }
    }


    stop() {
        this.stopped = true;
        cancelAnimationFrame(this.frame);
        for (const marker of this.markers.values()) marker.remove();
        this.markers.clear();
    }
}

// shortcut: 锁由内核裁定，编辑拦截只覆盖启用本插件的前端；强制约束 API 写入需要内核事务钩子。
class EditLocks extends EditCoordinator {
    constructor(plugin) {
        super(plugin, new SiyuanEditorAdapter());
        this.version = -1;
        this.locks = [];
        this.view = new EditLockView(plugin);
        this.markers = this.view.markers;
        this.handleState = (state) => this.update(state);
    }

    async bind() {
        await this.plugin.kernel.rpc.bind("edit-locks-changed", this.handleState);
    }

    async start() {
        this.handleSelection = () => {
            const selection = document.getSelection?.();
            if (this.deferredEdit?.executing || this.inputBarrier) return;
            const range = selection?.rangeCount && selection.getRangeAt(0);
            if (this.deferredEdit && (!range || range.startContainer !== this.deferredEdit.range.startContainer ||
                range.startOffset !== this.deferredEdit.range.startOffset || range.endContainer !== this.deferredEdit.range.endContainer ||
                range.endOffset !== this.deferredEdit.range.endOffset)) this.cancelDeferred();
            this.syncSelection(); this.scheduleRender();
        };
        this.handlePointer = (event) => {
            this.cancelDeferred();
            this.plugin.history?.breakGroup();
            if (event.button !== 0) return;
            if (this.plugin.history?.view?.dialog?.element.contains(event.target)) return;
            if (event.target?.closest?.('[data-type="undo"], [data-type="redo"]')) return;
            if (event.target?.closest?.('.protyle-gutters, .protyle-gutter')) return;
            const context = this.context(event, true);
            if (!event.target?.closest?.('.protyle-toolbar') && (!context || context.documentId !== this.editTarget?.documentId ||
                context.blocks[0].blockId !== this.editTarget?.blockId)) this.release();
        };
        this.handleClick = async (event) => {
            if (event.button !== 0 || event.target?.closest?.('.protyle-toolbar, [data-type="undo"], [data-type="redo"]')) return;
            if (this.operation) return;
            const pointed = this.context(event, true), selected = this.context(event);
            const context = selected && (!pointed || (selected.documentId === pointed.documentId &&
                selected.blocks.some((block) => block.blockId === pointed.blocks[0].blockId))) ? selected : pointed;
            if (!context) return;
            const request = this.activate(context), target = this.editTarget;
            if (await request || this.stopped || this.editTarget !== target || this.signature !== this.key(context)) return;
            this.reportClaimFailure(context, request);
        };
        this.handleGuard = (event) => this.guard(event);
        this.handleBlur = () => this.release();
        this.handleVisibility = () => { if (document.hidden) this.release(); };
        document.addEventListener("pointerdown", this.handlePointer, true);
        document.addEventListener("click", this.handleClick, true);
        document.addEventListener("selectionchange", this.handleSelection);
        document.addEventListener("input", this.handleSelection, true);
        document.addEventListener("visibilitychange", this.handleVisibility);
        this.guardedEvents = ["keydown", "beforeinput", "paste", "cut", "drop", "dragstart", "compositionstart", "contextmenu", "click"];
        for (const type of this.guardedEvents) document.addEventListener(type, this.handleGuard, true);
        window.addEventListener("blur", this.handleBlur);
        window.addEventListener("focus", this.handleSelection);
        this.timer = setInterval(async () => {
            if (this.polling) return;
            this.polling = true;
            try { await this.load(); this.syncSelection(); } finally { this.polling = false; }
        }, 3000);
        this.renewTimer = setInterval(() => this.renew(), 3000);
        await this.load();
    }

    async load(reset = false) {
        if (reset) { this.version = -1; this.invalidate(); }
        try {
            const state = await this.plugin.kernel.rpc.call.editSnapshot();
            if (this.stopped) return;
            this.update(state);
            this.ready = true;
        } catch {
            this.ready = false;
            this.held = [];
            this.leaseUntil = 0;
            this.locks = [];
            this.scheduleRender();
        }
    }

    update(state) {
        if (!state || !Number.isSafeInteger(state.version) || state.version < 0 || state.ttl !== 15000 || !Array.isArray(state.locks) || state.locks.some((lock) =>
            !lock || !EDIT_BLOCK_ID.test(lock.documentId) || !EDIT_BLOCK_ID.test(lock.blockId) || !Array.isArray(lock.ancestors) || lock.ancestors.length > 32 ||
            lock.ancestors.some((id) => typeof id !== "string" || !EDIT_BLOCK_ID.test(id)) || typeof lock.name !== "string" || !lock.name || [...lock.name].length > 24 ||
            (lock.peerId !== undefined && (typeof lock.peerId !== 'string' || !/^peer-\d+$/.test(lock.peerId))) ||
            !Number.isInteger(lock.hue) || lock.hue < 0 || lock.hue >= 360)) throw new Error("Invalid edit lock state");
        if (this.stopped) return;
        if (state.version < this.version) return;
        this.version = state.version;
        this.locks = state.locks;
        this.scheduleRender();
    }

    context(event, pointer = false, intent = "selection") {
        return this.adapter.context(event, pointer, intent);
    }

    syncSelection(force = false) {
        if (this.stopped) return;
        if (force) this.renew();
        if (this.flushing || this.operation || this.inputBarrier) return;
        const focused = !document.hidden && (!document.hasFocus || document.hasFocus());
        const context = focused && this.context();
        if (!this.editTarget) return;
        if (!focused || (context?.documentId || this.plugin.currentDocument()) !== this.editTarget.documentId) { this.release(); return; }
        if (this.deferredEdit) return;
        // 编辑器重绘会短暂清空选区；仍在同一文档时保留点击意图。
        if (!context) return;
        // 退格申请包含相邻块；普通 selectionchange 不能用单块申请覆盖尚未完成的申请。
        if (context && this.pending && context.documentId === this.desiredDocumentId &&
            context.blocks[0].blockId === this.desired[0]?.blockId && context.blocks.every((block) =>
                this.desired.some((desired) => desired.blockId === block.blockId))) return;
        this.editTarget.blockId = context.blocks[0].blockId;
        this.claim(context);
    }

    activate(context) {
        this.editTarget = { documentId: context.documentId, blockId: context.blocks[0].blockId };
        return this.claim(context);
    }

    reportClaimFailure(context, request) {
        if (this.failedRequest === request) return;
        this.failedRequest = request;
        const conflict = this.conflict(context);
        this.plugin.showEditMessage(conflict ? this.plugin.i18n.editLocked.replace("${name}", conflict.name) :
            this.uncertain ? this.plugin.i18n.historyUncertain : this.failedFlush ? this.plugin.i18n.editFlushFailed : this.plugin.i18n.editUnavailable);
    }

    conflict(context) {
        return this.locks.find((lock) => (lock.peerId ? lock.peerId !== this.plugin.peerId : lock.name !== this.plugin.clientName) && context.blocks.some((block) =>
            block.blockId === lock.blockId || block.ancestors.includes(lock.blockId) || lock.ancestors.includes(block.blockId)));
    }

    release(cancelHistory = true) {
        if (cancelHistory) this.plugin.history?.cancel();
        this.cancelDeferred();
        return super.release();
    }

    cancelDeferred() {
        if (!this.deferredEdit) return;
        this.deferredEdit = null;
        this.plugin.showEditMessage(this.plugin.i18n.editInputCancelled);
    }

    async deferEdit(operation, context, target) {
        if (this.deferredEdit) {
            const last = this.deferredEdit.operations.at(-1);
            if (operation.text !== undefined && last?.text !== undefined && !(this.deferredEdit.executing && this.deferredEdit.operations.length === 1)) last.text += operation.text;
            else if (!operation.repeat) this.deferredEdit.operations.push(operation);
            return;
        }
        const selection = document.getSelection?.();
        if (!selection?.rangeCount) return;
        const active = document.activeElement, editTarget = this.editTarget;
        const scope = target?.closest?.(".protyle-wysiwyg");
        if (!scope) return;
        const intent = { range: selection.getRangeAt(0).cloneRange(), operations: [operation] };
        this.deferredEdit = intent;
        try {
            if (this.inputBarrier) {
                await this.inputBarrier;
                if (this.deferredEdit !== intent || !selection.rangeCount) return;
                intent.range = selection.getRangeAt(0).cloneRange();
            }
            while (this.deferredEdit === intent && intent.operations.length) {
                const next = intent.operations[0];
                context = this.context({ target: scope, key: next.key }, false, "mutation");
                if (!context) return;
                const range = intent.range;
                const contents = context.blocks.map((block) => scope.querySelector(`[data-node-id="${block.blockId}"]`))
                    .map((block) => [block, this.adapter.content(block)]);
                const request = this.claim(context), granted = await request;
                if (this.deferredEdit !== intent) return;
                if (!granted) {
                    intent.failed = true;
                    this.reportClaimFailure(context, request);
                    return;
                }
                const current = document.getSelection?.(), actual = current?.rangeCount && current.getRangeAt(0);
                if (this.stopped || document.hidden || (document.hasFocus && !document.hasFocus()) ||
                    this.editTarget !== editTarget || document.activeElement !== active || !scope.isConnected || !actual ||
                    actual.startContainer !== range.startContainer || actual.startOffset !== range.startOffset ||
                    actual.endContainer !== range.endContainer || actual.endOffset !== range.endOffset ||
                    contents.some(([block, html]) => !block?.isConnected || this.adapter.content(block) !== html) ||
                    JSON.stringify(this.context({ target: scope, key: next.key }, false, "mutation")) !== JSON.stringify(context) ||
                    !this.ready || this.leaseUntil <= Date.now() || this.conflict(context)) return;
                intent.replaying = true;
                intent.executing = true;
                try {
                    const node = current.anchorNode;
                    const element = node.nodeType === 3 ? node.parentElement : node;
                    const receiver = element.closest('[contenteditable="true"]') || element.querySelector('[contenteditable="true"]') || element;
                    const completed = this.adapter.replay(next, receiver, context.documentId);
                    intent.replaying = false;
                    this.inputBarrier = completed;
                    await completed;
                    intent.operations.shift();
                } finally { intent.replaying = false; intent.executing = false; this.inputBarrier = null; }
                if (this.deferredEdit !== intent) return;
                if (!current.rangeCount) return;
                intent.range = current.getRangeAt(0).cloneRange();
            }
        } catch {
            intent.failed = true;
            this.plugin.showEditMessage(this.plugin.i18n.editUnavailable);
        } finally {
            if (this.deferredEdit === intent) {
                if (intent.operations.length && !intent.failed) this.cancelDeferred(); else this.deferredEdit = null;
                if (!intent.failed) this.syncSelection();
            }
        }
    }

    guard(event) {
        if (this.plugin.history?.active?.replaying) return;
        if (this.plugin.history?.handle(event)) { this.cancelDeferred(); return; }
        if (event.type === 'dragstart' && event.target?.closest?.('.protyle-gutters, .protyle-gutter, .protyle-action')) return;
        if (event.type === 'drop' && Array.from(event.dataTransfer?.types || []).some(type => type.startsWith('application/siyuan-gutter'))) {
            event.preventDefault(); event.stopImmediatePropagation(); this.cancelDeferred();
            try {
                if (this.operation || this.plugin.history?.active) throw new Error('historyBusy');
                const plan = this.adapter.dropPlan(event);
                if (plan && !plan.noop) this.plugin.history.move(plan);
            } catch (error) { this.plugin.showEditMessage(this.plugin.i18n[error.message] || this.plugin.i18n.editUnavailable); }
            finally { this.adapter.clearDrop(event); }
            return;
        }

        if (event.type === "keydown") {
            const key = event.key || "";
            if (key === 'Escape') { this.release(); return; }
            if (event.ctrlKey || event.metaKey) {
                if (!this.deferredEdit?.replaying) this.cancelDeferred();
                if (!["b", "i", "u", "v", "x", "z", "y", "k", "enter", "backspace", "delete"].includes(key.toLowerCase())) return;
            } else if (key.length !== 1 && !["Backspace", "Delete", "Enter", "Tab", "Process", "Dead", "Unidentified"].includes(key)) {
                if (!this.deferredEdit?.replaying) this.cancelDeferred();
                return;
            }
        } else if (event.type !== "beforeinput" && !this.deferredEdit?.replaying) this.cancelDeferred();
        const toolbar = event.target?.closest?.(".protyle-toolbar");
        if (event.type === "click" && !toolbar && !event.target.closest?.('.protyle-action--task, input[type="checkbox"]')) return;
        const moving = this.plugin.history?.active;
        if (moving?.kind === 'move' && !moving.cancelled &&
            (event.target === document.body || moving.editor.protyle.element.contains(event.target))) {
            // Native dragend briefly clears selection/focus; retain input against the pending move.
            event.preventDefault(); event.stopImmediatePropagation();
            const text = !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey &&
                (event.type === 'keydown' && event.key?.length === 1 ? event.key :
                    event.type === 'beforeinput' && event.inputType === 'insertText' ? event.data : null);
            if (!this.plugin.history.queue.length && typeof text === 'string' && moving.input.length + text.length <= 10000) moving.input += text;
            else this.plugin.showEditMessage(this.plugin.i18n.historyBusy);
            return;
        }
        const context = this.context(event, !toolbar && ["drop", "dragstart", "contextmenu", "click"].includes(event.type), "mutation");
        if (!context) return;
        if (this.uncertain) {
            event.preventDefault(); event.stopImmediatePropagation();
            this.plugin.showEditMessage(this.plugin.i18n.historyUncertain);
            return;
        }
        if (this.operation || this.plugin.history?.active) {
            event.preventDefault();event.stopImmediatePropagation();
            this.plugin.showEditMessage(this.plugin.i18n.historyBusy);
            return;
        }
        if (this.editTarget?.documentId !== context.documentId) {
            if (['contextmenu', 'dragstart'].includes(event.type)) {
                event.preventDefault(); event.stopImmediatePropagation(); return;
            }
            this.cancelDeferred();
            this.editTarget = { documentId: context.documentId, blockId: context.blocks[0].blockId };
        }
        const conflict = this.conflict(context);
        const nativeInput = event.type === 'beforeinput' && this.nativeInputTypes?.includes(event.inputType);
        const owned = this.owns(context) && (!this.inputBarrier || nativeInput);
        // shortcut: 等锁缓冲只覆盖纯文本和回车/删除；输入法组合需要编辑器事务支持后再接入。
        const operation = !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey && (
            event.type === "keydown" && !event.shiftKey && ["Backspace", "Delete", "Enter"].includes(event.key) ? { key: event.key, repeat: event.repeat } :
            event.type === "keydown" && event.key?.length === 1 ? { text: event.key } :
            event.type === "beforeinput" && event.inputType === "insertText" && typeof event.data === "string" ? { text: event.data } : null);
        if (operation && (!owned || this.deferredEdit) && !this.deferredEdit?.replaying) {
            event.preventDefault();event.stopImmediatePropagation();
            this.deferEdit(operation, context, event.target);
            return;
        }
        if (owned && !conflict) {
            if (event.type === 'keydown' && ['Enter', 'Backspace', 'Delete', 'Tab'].includes(event.key) && !this.deferredEdit?.replaying) {
                // The native handler runs after this capture listener; drain it before changing leases.
                this.nativeInputTypes = event.key === 'Enter' ? ['insertParagraph', 'insertLineBreak'] :
                    event.key === 'Backspace' ? ['deleteContentBackward'] : event.key === 'Delete' ? ['deleteContentForward'] : [];
                this.inputBarrier = Promise.resolve().then(() => { this.nativeInputTypes = null; return this.adapter.complete(context.documentId); });
                this.inputBarrier.catch(() => { this.ready = false; this.plugin.showEditMessage(this.plugin.i18n.editFlushFailed); })
                    .finally(() => { this.inputBarrier = null; this.syncSelection(); });
            }
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "compositionstart") document.activeElement?.blur?.();
        const target = this.editTarget, request = this.claim(context);
        if (this.inputRequest === request) return;
        this.inputRequest = request;
        request.then(granted => {
            if (granted || this.stopped || this.editTarget !== target || this.signature !== this.key(context)) return;
            if (!this.noticeAt || Date.now() - this.noticeAt > 1200) {
                this.noticeAt = Date.now();
                this.reportClaimFailure(context, request);
            }
        }).finally(() => { if (this.inputRequest === request) this.inputRequest = null; });
    }

    scheduleRender() { this.view.schedule(this.locks); }
    render() { this.view.render(this.locks); }

    async stop() {
        const released = this.close();
        this.stopped = true;
        clearInterval(this.timer);
        this.view.stop();
        document.removeEventListener("pointerdown", this.handlePointer, true);
        document.removeEventListener("click", this.handleClick, true);
        document.removeEventListener("selectionchange", this.handleSelection);
        document.removeEventListener("input", this.handleSelection, true);
        document.removeEventListener("visibilitychange", this.handleVisibility);
        for (const type of this.guardedEvents || []) document.removeEventListener(type, this.handleGuard, true);
        window.removeEventListener("blur", this.handleBlur);
        window.removeEventListener("focus", this.handleSelection);
        const saved = await released;
        await this.plugin.kernel.rpc.unbind("edit-locks-changed", this.handleState);
        return saved;
    }
}

// shortcut: 个人历史保留在本窗口内存；需要跨刷新恢复时再增加持久化与版本迁移。
class PersonalHistory {
    constructor(plugin) {
        this.plugin = plugin;
        this.documents = new Map();
        this.patches = new Map();
        this.queue = [];
        this.group = 0;
    }

    attach() {
        if (this.stopped) return;
        const editors = getAllEditor();
        for (const [undo, patch] of this.patches) if (!editors.includes(patch.editor) || !patch.editor.protyle.element?.isConnected) this.detach(undo);
        for (const editor of editors) {
            const p = editor.protyle, undo = p?.undo;
            if (!undo || p.lite || !undo.renderLocal || this.patches.has(undo)) continue;
            const original = { add: undo.add, undo: undo.undo, redo: undo.redo };
            const wrapped = {
                add: (forward, backward, owner) => {
                    this.record(owner, forward, backward);
                    return original.add.call(undo, forward, backward, owner);
                },
                undo: () => this.request(editor, "undo"),
                redo: () => this.request(editor, "redo"),
            };
            this.patches.set(undo, { editor, original, wrapped });
            Object.assign(undo, wrapped);
        }
        this.view?.render();
    }

    open(editor) {
        if (this.stopped) return;
        if (!editor?.protyle?.element?.isConnected || editor.protyle.lite || !EDIT_BLOCK_ID.test(editor.protyle.block?.rootID || '')) {
            this.plugin.showEditMessage(this.plugin.i18n.historyUnavailable); return;
        }
        this.attach();
        this.view ||= new PersonalHistoryView(this);
        this.view.open(editor);
    }

    changed(reason, blockId) {
        return Object.assign(new Error('historyChanged'), { reason, blockId });
    }

    stack(id) {
        if (!this.documents.has(id)) this.documents.set(id, { undo: [], redo: [] });
        return this.documents.get(id);
    }

    canonical(p, html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        template.content.querySelectorAll("wbr").forEach((node) => node.remove());
        template.content.querySelectorAll("[updated]").forEach((node) => node.removeAttribute("updated"));
        return p.lute.BlockDOM2Md(template.innerHTML).replace(/\r\n/g, "\n").trim();
    }

    state(p, operations) {
        const result = new Map();
        if (operations.every(op => op?.action === 'setAttrs')) {
            for (const op of operations) {
                if (!EDIT_BLOCK_ID.test(op.id || '') || op.id === p.block.rootID || typeof op.data !== 'string') throw new Error('historyUnsupported');
                const attrs = JSON.parse(op.data);
                if (!attrs || Array.isArray(attrs) || typeof attrs !== 'object' || !Object.keys(attrs).length ||
                    Object.entries(attrs).some(([key, value]) => typeof value !== 'string' ||
                        !['name', 'alias', 'memo', 'bookmark', 'style', 'fold'].includes(key))) throw new Error('historyUnsupported');
                result.set(op.id, { attrs: { ...result.get(op.id)?.attrs, ...attrs } });
            }
            return result;
        }
        for (const op of operations) {
            if (!op || !EDIT_BLOCK_ID.test(op.id || "") || !["update", "insert", "delete", "move"].includes(op.action) ||
                [op.parentID, op.previousID, op.nextID].some((id) => id && !EDIT_BLOCK_ID.test(id))) throw new Error("historyUnsupported");
            if (op.action === "move") {
                // Moves never replay an old content snapshot, including edits made by another client.
                if (!operations.every(item => item.action === "move") || ![op.parentID, op.previousID, op.nextID].some(Boolean) ||
                    [op.parentID, op.previousID, op.nextID].includes(op.id)) throw new Error("historyUnsupported");
                result.set(op.id, undefined); continue;
            }
            if (op.action === "delete") { result.set(op.id, null); continue; }
            if (typeof op.data !== "string") throw new Error("historyUnsupported");
            const template = document.createElement("template");template.innerHTML = op.data;
            if (template.content.children.length !== 1 || template.content.firstElementChild.getAttribute("data-node-id") !== op.id ||
                template.content.querySelector('[data-type="NodeAttributeView"], [data-type="NodeBlockQueryEmbed"]')) throw new Error("historyUnsupported");
            // 不重放同时替换父子快照的复杂转换，避免旧父快照覆盖另一位用户的子块。
            if ([...template.content.querySelectorAll("[data-node-id]")].some((node) => node.getAttribute("data-node-id") !== op.id &&
                operations.some((other) => other.id === node.getAttribute("data-node-id")))) throw new Error("historyUnsupported");
            result.set(op.id, this.canonical(p, op.data));
        }
        return result;
    }

    record(p, forward, backward, locations) {
        if (this.stopped || !EDIT_BLOCK_ID.test(p?.block?.rootID || "") || !forward?.length || !backward?.length) return;
        const stack = this.stack(p.block.rootID);
        const entry = { time: Date.now(), group: this.group,
            actions: [...new Set(forward.map(op => ['update', 'insert', 'delete', 'move', 'setAttrs'].includes(op?.action) ? op.action : 'other'))],
            blockIds: [...new Set(forward.map(op => op?.id).filter(id => EDIT_BLOCK_ID.test(id || '')))] };
        try {
            const serialized = JSON.stringify({ forward, backward });
            if (serialized.length > 2000000) throw Object.assign(new Error('historyUnsupported'), { reason: 'historyUnsupportedSize' });
            entry.size = serialized.length;
            Object.assign(entry, JSON.parse(serialized));
            try {
                entry.expected = this.state(p, entry.forward);
                const inverse = this.state(p, entry.backward);
                if (entry.forward.some(op => op.action === "move") !== entry.backward.some(op => op.action === "move")) throw new Error("historyUnsupported");
                if (entry.expected.size !== inverse.size || [...entry.expected.keys()].some((id) => !inverse.has(id))) throw new Error("historyUnsupported");
                for (const [id, value] of entry.expected) {
                    if (value?.attrs || inverse.get(id)?.attrs) {
                        if (JSON.stringify(Object.keys(value?.attrs || {}).sort()) !== JSON.stringify(Object.keys(inverse.get(id)?.attrs || {}).sort())) throw new Error('historyUnsupported');
                    }
                }
                entry.structural = [...entry.forward, ...entry.backward].some((op) => !['update', 'setAttrs'].includes(op.action));
                entry.locations = locations || new Map();
                if (entry.structural && !locations) for (const [id, value] of entry.expected) {
                    if (value === null) continue;
                    const block = p.wysiwyg.element.querySelector(`[data-node-id="${id}"]`);
                    if (!block) throw new Error("historyUnsupported");
                    const parent = block.parentElement.closest("[data-node-id]");
                    let previous = block.previousElementSibling;
                    while (previous && !previous.hasAttribute("data-node-id")) previous = previous.previousElementSibling;
                    entry.locations.set(id, { parent: parent?.getAttribute("data-node-id") || p.block.rootID,
                        previous: previous?.getAttribute("data-node-id") || "" });
                }
            } catch {
                entry.replay = new HistoryReplay(this, p).compile(entry.forward, entry.backward);
                entry.expected = entry.replay.after.expected;
                entry.locations = entry.replay.after.locations;
                entry.structural = true;
                entry.blockIds = [...entry.expected.keys()];
                for (const state of [entry.replay.before, entry.replay.after]) {
                    entry.size += [...state.expected.values()].reduce((size, value) => size + (value?.length || 0), 0);
                }
                if (entry.size > 2000000) throw Object.assign(new Error('historyUnsupported'), { reason: 'historyUnsupportedSize' });
            }
            const previous = stack.undo.at(-1);
            if (!stack.redo.length && !entry.structural && entry.forward.length === 1 && entry.backward.length === 1 &&
                previous?.forward?.length === 1 && previous.backward.length === 1 && previous.group === entry.group &&
                entry.time - previous.time < 1000 && previous.forward[0].id === entry.forward[0].id &&
                previous.expected.get(entry.forward[0].id) === this.canonical(p, entry.backward[0].data)) {
                previous.forward = entry.forward;previous.expected = entry.expected;previous.time = entry.time;
                previous.size = JSON.stringify({ forward: previous.forward, backward: previous.backward }).length;
                delete previous.lastAttempt;
                this.view?.render();
                return;
            }
        } catch (error) {
            entry.unsupported = true;
            entry.unsupportedReason = error.reason || 'historyUnsupportedData';
            entry.unsupportedAction = error.action;
            delete entry.forward;delete entry.backward;delete entry.expected;delete entry.replay;
        }
        stack.undo.push(entry);
        while (stack.undo.length > 100 || stack.undo.reduce((size, item) => size + (item.size || 0), 0) > 10000000) stack.undo.shift();
        stack.redo = [];
        this.view?.render();
    }

    breakGroup() { this.group++; }

    handle(event) {
        let direction;
        if (event.type === "keydown") {
            const key = (event.key || "").toLowerCase();
            if ((event.ctrlKey || event.metaKey) && !event.altKey && ["z", "y"].includes(key)) direction = key === "y" || event.shiftKey ? "redo" : "undo";
            else if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) this.breakGroup();
        } else if (event.type === "beforeinput" && ["historyUndo", "historyRedo"].includes(event.inputType)) {
            direction = event.inputType === "historyRedo" ? "redo" : "undo";
        } else if (event.type === "click") {
            const button = event.target?.closest?.('[data-type="undo"], [data-type="redo"]');
            if (button) direction = button.getAttribute("data-type");
        } else if (["paste", "cut", "drop", "compositionstart"].includes(event.type)) this.breakGroup();
        if (!direction || event.isComposing || event.target?.closest?.("input, textarea, select")) return false;
        this.attach();
        const anchor = document.getSelection?.()?.anchorNode;
        const editor = getAllEditor().find(({ protyle: p }) => p && !p.lite && (p.element?.contains(event.target) ||
            (event.target?.closest?.(".protyle-toolbar") && p.wysiwyg.element.contains(anchor)))) ||
            (this.active?.kind === 'move' && !this.active.cancelled && event.target === document.body ? this.active.editor : null) ||
            (this.view?.dialog?.element.contains(event.target) ? this.view.editor : null);
        if (!editor && !this.plugin.editing.context(event)) return false;
        event.preventDefault();event.stopImmediatePropagation();
        if (!editor) this.plugin.showEditMessage(this.plugin.i18n.historyUnavailable);
        else if (!(event.repeat && this.active)) this.request(editor, direction);
        return true;
    }

    async syncIndex() {
        // A committed block transaction can precede its SQL index; never treat that stale index as a conflict.
        const response = await fetchSyncPost("/api/sqlite/flushTransaction", {});
        if (response?.code !== 0) throw new Error("historyFailed");
    }

    async rows(ids) {
        if (!ids.length || ids.length > 200 || ids.some((id) => !EDIT_BLOCK_ID.test(id))) throw new Error("historyUnsupported");
        const response = await fetchSyncPost("/api/query/sql", { stmt: `SELECT id, root_id, parent_id FROM blocks WHERE id IN (${ids.map((id) => `'${id}'`).join(",")}) LIMIT 201` });
        if (response.code !== 0 || !Array.isArray(response.data)) throw new Error("historyFailed");
        return new Map(response.data.map((row) => {
            if (!EDIT_BLOCK_ID.test(row.id) || !EDIT_BLOCK_ID.test(row.root_id) || (row.parent_id && !EDIT_BLOCK_ID.test(row.parent_id))) throw new Error("historyFailed");
            return [row.id, row];
        }));
    }

    async context(documentId, entry) {
        const ids = [...new Set([...entry.expected.keys(), ...[...entry.forward, ...entry.backward].flatMap((op) => [op.id, op.parentID, op.previousID, op.nextID])].filter(Boolean))];
        const rows = await this.rows(ids);
        for (const [id, expected] of entry.expected) {
            if (expected !== null && !rows.has(id)) throw this.changed('historyReasonMissing', id);
            if (expected === null && rows.has(id)) throw this.changed('historyReasonExists', id);
        }
        for (let depth = 0; depth < 32; depth++) {
            const parents = [...new Set([...rows.values()].map((row) => row.parent_id).filter((id) => id && id !== documentId && !rows.has(id)))];
            if (!parents.length) break;
            const ancestors = await this.rows(parents);
            if (ancestors.size !== parents.length) throw this.changed('historyReasonStructure', parents.find(id => !ancestors.has(id)));
            for (const [id, row] of ancestors) rows.set(id, row);
            if (rows.size > 200 || depth === 31) throw new Error("historyUnsupported");
        }
        const moved = [...rows.values()].find(row => row.root_id !== documentId);
        if (moved) throw this.changed('historyReasonDocument', moved.id);
        for (const id of ids) if (id !== documentId && !rows.has(id) && !entry.expected.has(id)) throw this.changed('historyReasonAnchor', id);
        const blocks = ids.filter((id) => id !== documentId).map((blockId) => {
            let parent, reference = blockId;
            const visited = new Set();
            // Consecutively deleted siblings may anchor to each other; follow them to a surviving parent.
            while (!parent && reference && !visited.has(reference)) {
                visited.add(reference);
                const anchor = [...entry.forward, ...entry.backward].find(op => op.id === reference && op.action === "insert");
                parent = rows.get(reference)?.parent_id || entry.replay?.parents.get(reference) || anchor?.parentID;
                reference = anchor?.previousID || anchor?.nextID;
            }
            const ancestors = [];
            while (parent && parent !== documentId && ancestors.length < 32) { ancestors.push(parent);parent = rows.get(parent)?.parent_id || entry.replay?.parents.get(parent); }
            if (parent !== documentId) throw this.changed('historyReasonStructure', blockId);
            return { blockId, ancestors };
        });
        if (!blocks.length || blocks.length > 200) throw new Error("historyUnsupported");
        return { documentId, blocks };
    }

    async readBlocks(entries, read) {
        for (let offset = 0; offset < entries.length; offset += 8) {
            // Bound API concurrency and settle every in-flight read before releasing the lease on failure.
            const results = await Promise.allSettled(entries.slice(offset, offset + 8).map(read));
            const failed = results.find(result => result.status === 'rejected');
            if (failed) throw failed.reason;
        }
    }

    async validate(p, entry) {
        const rows = await this.rows([...entry.expected.keys()]);
        await this.readBlocks([...entry.expected], async ([id, expected]) => {
            const row = rows.get(id);
            if (expected === null) { if (row) throw this.changed('historyReasonExists', id);return; }
            if (!row) throw this.changed('historyReasonMissing', id);
            if (row.root_id !== p.block.rootID) throw this.changed('historyReasonDocument', id);
            if (expected?.attrs) {
                const response = await fetchSyncPost('/api/attr/getBlockAttrs', { id });
                if (response?.code !== 0 || !response.data) throw new Error('historyFailed');
                if (Object.entries(expected.attrs).some(([key, value]) => (response.data[key] || '') !== value)) throw this.changed('historyReasonAttributes', id);
                return;
            }
            const location = entry.locations?.get(id);
            if (location) {
                const sibling = await fetchSyncPost("/api/block/getBlockSiblingID", { id });
                if (sibling.code !== 0 || !sibling.data) throw new Error('historyFailed');
                if (sibling.data.parent !== location.parent || (sibling.data.previous || "") !== location.previous) throw this.changed('historyReasonPosition', id);
            }
            if (expected === undefined) return;
            const response = await fetchSyncPost("/api/block/getBlockDOM", { id });
            if (response.code !== 0 || typeof response.data?.dom !== "string") throw new Error("historyFailed");
            if (this.canonical(p, response.data.dom) !== expected) throw this.changed('historyReasonContent', id);
        });
    }

    cancel() {
        this.queue = [];
        if (this.active) this.active.cancelled = true;
    }

    move(plan) {
        if (this.active || this.stopped) return Promise.resolve(false);
        const intent = { editor: plan.editor, documentId: plan.editor.protyle.block.rootID, phase: 'waiting', kind: 'move', input: '' };
        this.active = intent;
        this.view?.render();
        intent.promise = this.runMove(intent, plan);
        return intent.promise;
    }

    async runMove(intent, plan) {
        const { editor, documentId } = intent, p = editor.protyle, editing = this.plugin.editing;
        const current = () => !intent.cancelled && !this.stopped && !document.hidden && (!document.hasFocus || document.hasFocus()) &&
            p.element.isConnected && !p.element.closest('.fn__none') && p.block.rootID === documentId;
        const entry = { ...plan, expected: new Map([...plan.locations.keys()].map(id => [id, undefined])) };
        let success = false, confirmed = false;
        try {
            success = await editing.runOperation({ documentId, current,
                prepare: async () => { await this.syncIndex(); return this.context(documentId, entry); },
                validate: async context => {
                    await this.syncIndex();
                    await this.validate(p, entry);
                    if (editing.key(await this.context(documentId, entry)) !== editing.key(context)) throw new Error('historyChanged');
                },
                execute: async () => {
                    intent.phase = 'posting';
                    try {
                        const response = await fetchSyncPost('/api/transactions', { app: this.plugin.app.appId, session: p.id,
                            reqId: Date.now(), transactions: [{ doOperations: plan.forward, undoOperations: [] }] });
                        if (typeof response?.code !== 'number') throw new Error('historyUncertain');
                        if (response?.code !== 0) { confirmed = true; throw new Error('historyFailed'); }
                        if (!Array.isArray(response.data) || response.data.length !== 1 || !Array.isArray(response.data[0]?.doOperations)) throw new Error('historyUncertain');
                        confirmed = true;
                        this.breakGroup();
                        this.record(p, plan.forward, plan.backward, new Map(plan.forward.map(op => [op.id, { parent: op.parentID, previous: op.previousID || '' }])));
                        try { p.undo.renderLocal(p, response.data[0].doOperations); }
                        catch { editor.reload(false); }
                    } catch (error) { if (!confirmed) error.commitUnknown = true; throw error; }
                },
            });
        } catch (error) {
            this.plugin.showEditMessage(this.plugin.i18n[editing.uncertain ? 'historyUncertain' : error.message] || this.plugin.i18n.historyFailed);
        } finally {
            if (current() && editing.phase !== 'blocked') {
                const block = p.wysiwyg.element.querySelector(`[data-node-id="${plan.forward[0].id}"]`);
                const input = block?.querySelector?.('[contenteditable="true"]');
                if (input) {
                    p.wysiwyg.element.querySelectorAll('.protyle-wysiwyg--select').forEach(node => node.classList.remove('protyle-wysiwyg--select'));
                    input.focus(); document.getSelection()?.collapse(input, 0);
                    const context = editing.context();
                    if (context?.documentId === documentId && await editing.activate(context)) {
                        while (success && current() && intent.input && editing.owns(context)) {
                            const text = intent.input; intent.input = ''; intent.replaying = true;
                            try {
                                const completed = editing.adapter.replay({ text }, input, documentId);
                                intent.replaying = false;
                                await completed;
                            } catch { this.plugin.showEditMessage(this.plugin.i18n.editUnavailable); break; }
                            finally { intent.replaying = false; }
                        }
                    }
                }
            }
            if (intent.input) this.plugin.showEditMessage(this.plugin.i18n.editInputCancelled);
            this.active = null;
            this.view?.render();
            const next = success && !intent.cancelled ? this.queue.shift() : null;
            if (next) this.request(next.editor, next.direction); else this.queue = [];
        }
        return success;
    }

    request(editor, direction) {
        if (this.stopped) return Promise.resolve(false);
        if (this.active) {
            if (!this.active.cancelled && this.active.editor === editor && this.queue.length < 10) this.queue.push({ editor, direction });
            return this.active.promise;
        }
        const p = editor?.protyle;
        if (!p || p.lite || p.disabled || !this.patches.has(p.undo) || !p.element?.isConnected) {
            this.plugin.showEditMessage(this.plugin.i18n.historyUnavailable);return Promise.resolve(false);
        }
        this.breakGroup();
        const intent = { editor, documentId: p.block.rootID, phase: "waiting", previous: this.plugin.editing.editTarget,
            dialog: this.view?.dialog?.element.contains(document.activeElement) ? this.view.dialog : null };
        this.active = intent;
        this.view?.render();
        intent.promise = this.run(intent, direction);
        return intent.promise;
    }

    async run(intent, direction) {
        const { editor, documentId } = intent, p = editor.protyle, editing = this.plugin.editing;
        let entry, stack, preparedContext, success = false, confirmed = false;
        const current = () => !intent.cancelled && !this.stopped && !document.hidden && (!document.hasFocus || document.hasFocus()) &&
            p.element.isConnected && !p.element.closest(".fn__none") && p.block.rootID === documentId;
        try {
            success = await editing.runOperation({
                documentId, current,
                prepare: async () => {
                    await this.syncIndex();
                    stack = this.stack(documentId);
                    entry = stack[direction].at(-1);
                    if (!entry) { this.plugin.showEditMessage(this.plugin.i18n[direction === "undo" ? "historyEmptyUndo" : "historyEmptyRedo"]); return null; }
                    intent.entry = entry;
                    this.view?.render();
                    if (entry.uncertain) throw new Error("historyUncertain");
                    if (entry.unsupported) throw new Error("historyUnsupported");
                    preparedContext = await this.context(documentId, entry);
                    return preparedContext;
                },
                validate: async context => {
                    await this.syncIndex();
                    const results = await Promise.allSettled([this.validate(p, entry), this.context(documentId, entry)]);
                    const failed = results.find(result => result.status === 'rejected');
                    if (failed) throw failed.reason;
                    if (editing.key(results[1].value) !== editing.key(context)) throw this.changed('historyReasonStructure');
                },
                execute: async () => {
                    try {
                        const operations = JSON.parse(JSON.stringify(entry[direction === "undo" ? "backward" : "forward"]));
                        const projected = entry.replay?.[direction === 'undo' ? 'before' : 'after'];
                        const expected = projected?.expected || this.state(p, operations);
                        intent.phase = "posting";
                        // 不调用共享撤销接口；把本人的逆操作作为已校验的新事务提交。
                        const response = await fetchSyncPost("/api/transactions", { app: this.plugin.app.appId, session: p.id,
                            reqId: Date.now(), transactions: [{ doOperations: operations, undoOperations: [] }] });
                        if (response.code !== 0) { confirmed = true;throw new Error("historyFailed"); }
                        if (!Array.isArray(response.data) || response.data.length !== 1 || !Array.isArray(response.data[0]?.doOperations)) throw new Error("historyUncertain");
                        confirmed = true;
                        stack[direction].pop();stack[direction === "undo" ? "redo" : "undo"].push(entry);
                        entry.expected = expected;
                        entry.locations = new Map();
                        if (!this.stopped && p.element.isConnected) {
                            try { p.undo.renderLocal(p, response.data[0].doOperations); }
                            catch { editor.reload(false); }
                        }
                        if (entry.replay) {
                            entry.locations = projected.locations;
                            try { await this.syncIndex(); await this.validate(p, entry); }
                            catch (error) { entry.uncertain = true; throw error; }
                        } else if (entry.structural) {
                            try {
                                await this.readBlocks([...entry.expected].filter(([, value]) => value !== null), async ([id]) => {
                                    const sibling = await fetchSyncPost("/api/block/getBlockSiblingID", { id });
                                    if (sibling.code !== 0 || !sibling.data) throw new Error("historyUncertain");
                                    entry.locations.set(id, { parent: sibling.data.parent, previous: sibling.data.previous || "" });
                                });
                            } catch (error) { entry.uncertain = true; throw error; }
                        }
                    } catch (error) {
                        if (intent.phase === 'posting' && !confirmed) error.commitUnknown = true;
                        throw error;
                    }
                },
            });
            if (entry) {
                const conflict = preparedContext && editing.conflict(preparedContext);
                entry.lastAttempt = { time: Date.now(), direction, success, key: success ? null : intent.cancelled ? 'historyAttemptCancelled' :
                    conflict ? 'historyLocked' : editing.failedFlush ? 'editFlushFailed' : 'editUnavailable', name: conflict?.name };
            }
            if (success && editing.phase !== 'blocked') this.plugin.showEditMessage(this.plugin.i18n[direction === "undo" ? "historyUndone" : "historyRedone"]);
        } catch (error) {
            if (intent.phase === "posting" && !confirmed && entry) entry.uncertain = true;
            if (entry) entry.lastAttempt = { time: Date.now(), direction, success: false,
                key: entry.uncertain ? 'historyUncertain' : error.reason || error.message, blockId: error.blockId };
            if (!this.stopped) this.plugin.showEditMessage(this.plugin.i18n[entry?.uncertain ? "historyUncertain" : error.message] || this.plugin.i18n.historyFailed);
        } finally {
            intent.phase = "finished";
            const next = success && !intent.cancelled ? this.queue.shift() : null;
            this.active = null;
            this.view?.render();
            if (intent.previous && current()) {
                const context = editing.context();
                if (context?.documentId === documentId) await editing.activate(context);
            }
            if (intent.dialog && this.view?.dialog === intent.dialog && !intent.cancelled) {
                const button = this.view[direction].disabled ? this.view[direction === 'undo' ? 'redo' : 'undo'] : this.view[direction];
                if (!button.disabled) button.focus();
                else this.view.root.focus();
            }
            if (next && !this.stopped && !intent.cancelled) this.request(next.editor, next.direction);
        }
        return success;
    }

    detach(undo) {
        const patch = this.patches.get(undo);
        if (!patch) return;
        for (const key of Object.keys(patch.original)) if (undo[key] === patch.wrapped[key]) undo[key] = patch.original[key];
        this.patches.delete(undo);
    }

    async stop() {
        this.stopped = true; this.cancel();
        this.view?.dialog?.destroy();
        await this.active?.promise;
        for (const undo of this.patches.keys()) this.detach(undo);
        this.documents.clear();
    }
}

// Check a compound transaction on detached block trees before permitting either direction.
class HistoryReplay {
    constructor(history, p) { this.history = history; this.p = p; }

    reject(reason, action) {
        throw Object.assign(new Error('historyUnsupported'), { reason, action });
    }

    compile(forward, backward) {
        const operations = [...forward, ...backward], touched = new Set(), parents = new Map();
        const rootID = this.p.block.rootID;
        for (const op of operations) {
            if (op?.action === 'setAttrs') this.reject('historyUnsupportedAttributes');
            if (!['update', 'insert', 'delete', 'move'].includes(op?.action)) this.reject('historyUnsupportedAction', op?.action);
            if (!EDIT_BLOCK_ID.test(op.id || '') || op.id === rootID ||
                [op.parentID, op.previousID, op.nextID].some(id => id && !EDIT_BLOCK_ID.test(id))) this.reject('historyUnsupportedData');
            touched.add(op.id);
        }
        const source = this.p.wysiwyg.element;
        if (!source?.cloneNode) this.reject('historyUnsupportedLoaded');
        if (source.innerHTML.length > 10000000) this.reject('historyUnsupportedSize');
        const after = source.cloneNode(true);
        const find = (tree, id) => id === rootID ? tree : tree.querySelector(`[data-node-id="${id}"]`);
        const blocks = node => [...(node.hasAttribute?.('data-node-id') ? [node] : []), ...node.querySelectorAll('[data-node-id]')];
        const location = (tree, node) => {
            const parent = node.parentElement.closest('[data-node-id]');
            let previous = node.previousElementSibling;
            while (previous && !previous.hasAttribute('data-node-id')) previous = previous.previousElementSibling;
            return { parent: parent?.getAttribute('data-node-id') || rootID, previous: previous?.getAttribute('data-node-id') || '' };
        };
        const remember = (tree, node) => {
            for (const block of blocks(node)) {
                const id = block.getAttribute('data-node-id');
                if (!EDIT_BLOCK_ID.test(id || '')) this.reject('historyUnsupportedData');
                if (block.matches('[data-type="NodeAttributeView"], [data-type="NodeBlockQueryEmbed"]')) this.reject('historyUnsupportedExternal');
                touched.add(id);
                if (tree.contains(block)) parents.set(id, location(tree, block).parent);
            }
            if (touched.size > 200) this.reject('historyUnsupportedSize');
        };
        for (const op of operations) {
            const node = find(after, op.id);
            if (node) remember(after, node);
        }
        const apply = (tree, ops) => {
            for (const op of ops) {
                let node = find(tree, op.id);
                if (node) remember(tree, node);
                if (op.action === 'delete') { node?.remove(); continue; }
                if (op.action === 'insert' || op.action === 'update') {
                    if (typeof op.data !== 'string') this.reject('historyUnsupportedData');
                    const template = document.createElement('template'); template.innerHTML = op.data;
                    const replacement = template.content.firstElementChild;
                    if (template.content.children.length !== 1 || replacement.getAttribute('data-node-id') !== op.id) this.reject('historyUnsupportedData');
                    remember(tree, replacement);
                    if (op.action === 'update') {
                        if (!node) this.reject('historyUnsupportedLoaded');
                        node.replaceWith(replacement); node = replacement;
                    } else {
                        if (node) this.reject('historyUnsupportedRoundTrip');
                        node = replacement;
                    }
                    for (const block of blocks(node)) {
                        const same = [...tree.querySelectorAll(`[data-node-id="${block.getAttribute('data-node-id')}"]`)];
                        if (same.some(other => other !== block)) this.reject('historyUnsupportedRoundTrip');
                    }
                    if (op.action === 'update') continue;
                }
                if (!node) this.reject('historyUnsupportedLoaded');
                if (op.action === 'move' && (node.matches('[data-type="NodeHeading"][fold="1"]') || op.context?.removeFold === 'true')) {
                    this.reject('historyUnsupportedFoldMove');
                }
                const anchor = find(tree, op.nextID || op.previousID || op.parentID);
                if (!anchor) this.reject('historyUnsupportedLoaded');
                if (node === anchor || node.contains(anchor)) this.reject('historyUnsupportedRoundTrip');
                const oldParent = node.parentElement;
                if (op.nextID) anchor.before(node);
                else if (op.previousID) anchor.after(node);
                else {
                    if (anchor !== tree && !anchor.matches('[data-type="NodeBlockquote"], [data-type="NodeSuperBlock"], [data-type="NodeList"], [data-type="NodeListItem"]')) this.reject('historyUnsupportedData');
                    const first = [...anchor.children].find(child => child.hasAttribute('data-node-id'));
                    anchor.insertBefore(node, first || anchor.querySelector(':scope > .protyle-attr'));
                }
                if (op.action === 'move' && oldParent?.matches('[data-type="NodeList"]') &&
                    ![...oldParent.children].some(child => child.hasAttribute('data-node-id'))) oldParent.remove();
                remember(tree, node);
            }
        };
        const before = after.cloneNode(true);
        apply(before, backward);
        const replayed = before.cloneNode(true);
        apply(replayed, forward);
        const snapshot = tree => {
            const expected = new Map(), locations = new Map();
            for (const id of touched) {
                if (tree.querySelectorAll(`[data-node-id="${id}"]`).length > 1) this.reject('historyUnsupportedRoundTrip');
                const node = find(tree, id);
                expected.set(id, node ? this.history.canonical(this.p, node.outerHTML) : null);
                if (node) locations.set(id, location(tree, node));
            }
            return { expected, locations };
        };
        const initial = snapshot(after), restored = snapshot(before), repeated = snapshot(replayed);
        for (const id of touched) {
            if (initial.expected.get(id) !== repeated.expected.get(id) ||
                JSON.stringify(initial.locations.get(id)) !== JSON.stringify(repeated.locations.get(id))) this.reject('historyUnsupportedRoundTrip');
        }
        for (const [id, loc] of [...restored.locations, ...initial.locations]) parents.set(id, loc.parent);
        return { before: restored, after: initial, parents };
    }
}

// A document-scoped view of the existing stacks; actions still use PersonalHistory.request.
class PersonalHistoryView {
    constructor(history) {
        this.history = history;
        this.plugin = history.plugin;
    }

    open(editor) {
        if (this.dialog && this.editor === editor) { this.render(); this.undo.focus(); return; }
        this.dialog?.destroy();
        this.editor = editor;
        this.documentId = editor.protyle.block.rootID;
        this.rows = new Map();
        this.signature = '';
        const t = this.plugin.i18n;
        const dialog = new Dialog({ title: t.historyList, width: '620px',
            content: '<div class="b3-dialog__content collab-history"><div class="collab-history__document"></div><p class="collab-history__note"></p><div class="collab-history__actions"><button type="button" class="b3-button" data-history-action="undo"></button><button type="button" class="b3-button b3-button--outline" data-history-action="redo"></button></div><p class="collab-history__status" role="status" aria-live="polite"></p><div class="collab-history__lists"></div></div>',
            destroyCallback: () => {
                if (this.dialog !== dialog) return;
                this.dialog = null; this.editor = null; this.root = null; this.rows.clear();
            },
        });
        this.dialog = dialog;
        this.dialog.element.classList.add('collab-history-dialog');
        this.root = this.dialog.element.querySelector('.collab-history');
        this.root.tabIndex = -1;
        this.root.querySelector('.collab-history__document').textContent =
            editor.protyle.element.querySelector('.protyle-title [contenteditable], .protyle-title')?.textContent?.trim() || t.historyCurrentDocument;
        this.root.querySelector('.collab-history__note').textContent = t.historyListSession;
        this.undo = this.root.querySelector('[data-history-action="undo"]');
        this.redo = this.root.querySelector('[data-history-action="redo"]');
        this.undo.textContent = t.undoMine;
        this.redo.textContent = t.redoMine;
        this.sections = {};
        for (const direction of ['undo', 'redo']) {
            const section = document.createElement('section');
            section.innerHTML = '<h3></h3><ol class="collab-history__entries"></ol><p class="collab-history__empty"></p>';
            this.root.querySelector('.collab-history__lists').append(section);
            this.sections[direction] = section;
            this[direction].addEventListener('click', () => this.history.request(this.editor, direction));
        }
        this.render();
        if (!this.undo.disabled) this.undo.focus();
        else if (!this.redo.disabled) this.redo.focus();
    }

    render() {
        if (!this.dialog) return;
        const h = this.history, t = this.plugin.i18n, stack = h.stack(this.documentId);
        const available = this.editor.protyle.element.isConnected && !this.editor.protyle.element.closest('.fn__none') &&
            this.editor.protyle.block.rootID === this.documentId && getAllEditor().includes(this.editor);
        const busy = !!h.active || !!this.plugin.editing.operation;
        const signature = JSON.stringify([available, busy, h.active?.entry?.time, this.plugin.editing.uncertain,
            ...['undo', 'redo'].map(direction => stack[direction].map(entry => [entry.time, entry.unsupported, entry.uncertain, entry.lastAttempt]))]);
        if (signature === this.signature) return;
        this.signature = signature;
        this.undo.disabled = !available || busy || !!this.plugin.editing.uncertain || !stack.undo.length || !!stack.undo.at(-1)?.unsupported || !!stack.undo.at(-1)?.uncertain;
        this.redo.disabled = !available || busy || !!this.plugin.editing.uncertain || !stack.redo.length || !!stack.redo.at(-1)?.unsupported || !!stack.redo.at(-1)?.uncertain;
        this.root.querySelector('.collab-history__status').textContent = !available ? t.historyListInactive :
            this.plugin.editing.uncertain ? t.historyUncertain : busy ? t.historyBusy : t.historyListOrder;
        const retained = new Set([...stack.undo, ...stack.redo]);
        for (const entry of this.rows.keys()) if (!retained.has(entry)) this.rows.delete(entry);
        for (const direction of ['undo', 'redo']) {
            const entries = [...stack[direction]].reverse(), section = this.sections[direction];
            section.querySelector('h3').textContent = `${t[direction === 'undo' ? 'historyListUndo' : 'historyListRedo']} · ${entries.length}`;
            section.querySelector('.collab-history__empty').textContent = entries.length ? '' : t[direction === 'undo' ? 'historyEmptyUndo' : 'historyEmptyRedo'];
            const list = section.querySelector('ol');
            const nodes = entries.map((entry, index) => {
                let row = this.rows.get(entry);
                if (!row) {
                    row = document.createElement('li');
                    row.innerHTML = '<details><summary><span class="collab-history__summary"><strong></strong><span class="collab-history__meta"></span></span><span class="collab-history__state"></span></summary><div class="collab-history__detail"><p class="collab-history__reason"></p><p class="collab-history__attempt"></p><div class="collab-history__blocks"></div></div></details>';
                    this.rows.set(entry, row);
                }
                const actions = entry.actions || [...new Set(entry.forward?.map(op => op.action) || ['other'])];
                const names = { update: t.historyActionUpdate, insert: t.historyActionInsert, delete: t.historyActionDelete, move: t.historyActionMove, setAttrs: t.historyActionAttributes };
                row.querySelector('strong').textContent = actions.map(action => names[action] || t.historyActionOther).join(' / ');
                const ids = entry.blockIds || [...new Set(entry.forward?.map(op => op.id) || [])];
                row.querySelector('.collab-history__meta').textContent = `${new Date(entry.time).toLocaleTimeString()} · ${t.historyBlockCount.replace('${count}', String(ids.length))}`;
                const attempt = entry.lastAttempt, failed = attempt && !attempt.success;
                row.classList.toggle('collab-history__entry--blocked', !!(failed || entry.unsupported || entry.uncertain));
                row.querySelector('.collab-history__state').textContent = h.active?.entry === entry ? t.historyListRunning :
                    entry.uncertain ? t.historyListUncertain : entry.unsupported ? t.historyListUnsupported : failed ? t.historyListBlocked :
                    index === 0 ? t[direction === 'undo' ? 'historyListNextUndo' : 'historyListNextRedo'] : t[direction === 'undo' ? 'historyListRecorded' : 'historyListUndone'];
                const reason = entry.uncertain ? t.historyUncertain : entry.unsupported ? (t[entry.unsupportedReason] || t.historyUnsupported).replace('${action}', entry.unsupportedAction || '') :
                    failed ? (t[attempt.key] || t.historyFailed).replace('${name}', attempt.name || '') : t[direction === 'undo' ? 'historyListRecordedDetail' : 'historyListUndoneDetail'];
                row.querySelector('.collab-history__reason').textContent = reason;
                row.querySelector('.collab-history__attempt').textContent = attempt ?
                    `${t.historyListLastAttempt} ${new Date(attempt.time).toLocaleString()} · ${t[attempt.direction === 'undo' ? 'undoMine' : 'redoMine']}` : '';
                row.querySelector('.collab-history__blocks').textContent = `${t.historyListBlocks}\n${ids.join('\n')}${attempt?.blockId ? '\n' + t.historyListConflictBlock + ' ' + attempt.blockId : ''}`;
                return row;
            });
            const focused = document.activeElement;
            list.replaceChildren(...nodes);
            if (focused && nodes.some(node => node.contains(focused))) focused.focus({ preventScroll: true });
        }
    }
}
