const { Plugin, Menu, Dialog, Setting, showMessage, openTab, getAllEditor, getActiveEditor, fetchSyncPost } = require("siyuan");
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
        this.onlineCount = presence.count;
        this.clients = clients;
        if (presence.self && typeof presence.self.name === "string") {
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
        this.cursorsReceivedAt = Date.now();
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
            if (Date.now() - this.cursorsReceivedAt >= 5000) this.scheduleCursorRender(false);
            return Promise.allSettled([this.sendCursor(), this.sendSelection()]);
        }, 1000 / this.tick);
    }

    async sendCursor() {
        if (this.stopped || !this.layoutReady || this.cursorSending) return;
        const cursor = captureCursor(this.pointer);
        const signature = JSON.stringify(cursor);
        if (signature === this.lastCursorSignature && (!cursor || Date.now() - this.cursorSentAt < 1000)) return;
        this.cursorSending = true;
        try {
            await this.kernel.rpc.call.cursorUpdate(this.sessionId, this.generation, ++this.cursorSequence, cursor);
            this.lastCursorSignature = signature;
            this.cursorSentAt = Date.now();
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
        if (signature === this.lastSelectionSignature && (!selection || Date.now() - this.selectionSentAt < 1000)) return;
        this.selectionSending = true;
        try {
            await this.kernel.rpc.call.selectionUpdate(this.sessionId, this.generation, ++this.selectionSequence, selection);
            this.lastSelectionSignature = signature;
            this.selectionSentAt = Date.now();
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
        if (!document.hidden && Date.now() - this.cursorsReceivedAt < 5000) {
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
        if (!document.hidden && Date.now() - this.cursorsReceivedAt < 5000) for (const client of this.remoteSelections) {
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
            const group = document.createElement("span");
            group.className = "collab-presence-users";
            const description = this.i18n.viewers.replace("${names}", viewers.map((client) => client.name).join(", "));
            group.setAttribute("aria-label", description);
            group.title = description;
            for (const client of viewers.slice(0, 2)) {
                const badge = document.createElement("span");
                badge.className = "collab-presence-user";
                badge.textContent = client.name;
                badge.style.setProperty("--collab-user-hue", String(client.hue));
                group.append(badge);
            }
            if (viewers.length > 2) {
                const more = document.createElement("span");
                more.className = "collab-presence-more";
                more.textContent = `+${viewers.length - 2}`;
                group.append(more);
            }
            const text = row.querySelector(":scope > .b3-list-item__text");
            if (text) text.after(group); else row.append(group);
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
        this.history?.stop();
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
        await Promise.allSettled([editingStopped, this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors), this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation)]);
    }
};

const EDIT_BLOCK_ID = /^\d{14}-[a-z0-9]{7}$/;

// shortcut: 锁由内核裁定，编辑拦截只覆盖启用本插件的前端；强制约束 API 写入需要内核事务钩子。
class EditLocks {
    constructor(plugin) {
        this.plugin = plugin;
        this.sequence = 0;
        this.version = -1;
        this.locks = [];
        this.held = [];
        this.desired = [];
        this.markers = new Map();
        this.handleState = (state) => this.update(state);
    }

    async bind() {
        await this.plugin.kernel.rpc.bind("edit-locks-changed", this.handleState);
    }

    async start() {
        this.handleSelection = () => {
            const selection = document.getSelection?.();
            if (this.deferredDelete && (!selection?.isCollapsed || selection.anchorNode !== this.deferredDelete.node ||
                selection.anchorOffset !== this.deferredDelete.offset)) this.deferredDelete = null;
            this.syncSelection(); this.scheduleRender();
        };
        this.handlePointer = (event) => {
            this.deferredDelete = null;
            this.plugin.history?.breakGroup();
            if (event.button !== 0) return;
            if (event.target?.closest?.('[data-type="undo"], [data-type="redo"]')) return;
            const context = this.context(event, true);
            if (!event.target?.closest?.('.protyle-toolbar') && (!context || context.documentId !== this.editTarget?.documentId ||
                context.blocks[0].blockId !== this.editTarget?.blockId)) this.release();
        };
        this.handleDoubleClick = (event) => {
            if (event.button !== 0) return;
            const context = this.context(event, true);
            if (context) this.activate(context);
        };
        this.handleGuard = (event) => this.guard(event);
        this.handleBlur = () => this.release();
        this.handleVisibility = () => { if (document.hidden) this.release(); };
        document.addEventListener("pointerdown", this.handlePointer, true);
        document.addEventListener("dblclick", this.handleDoubleClick, true);
        document.addEventListener("selectionchange", this.handleSelection);
        document.addEventListener("visibilitychange", this.handleVisibility);
        this.guardedEvents = ["keydown", "beforeinput", "paste", "cut", "drop", "dragstart", "compositionstart", "contextmenu", "click"];
        for (const type of this.guardedEvents) document.addEventListener(type, this.handleGuard, true);
        window.addEventListener("blur", this.handleBlur);
        window.addEventListener("focus", this.handleSelection);
        this.timer = setInterval(async () => {
            if (this.polling) return;
            this.polling = true;
            try { await this.load(); this.syncSelection(true); } finally { this.polling = false; }
        }, 3000);
        await this.load();
    }

    async load(reset = false) {
        if (reset) { this.version = -1; this.ready = false; this.held = []; this.leaseUntil = 0; }
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
        if (this.stopped) return;
        if (!state || !Number.isSafeInteger(state.version) || state.version < 0 || state.ttl !== 15000 || !Array.isArray(state.locks) || state.locks.some((lock) =>
            !lock || !EDIT_BLOCK_ID.test(lock.documentId) || !EDIT_BLOCK_ID.test(lock.blockId) || !Array.isArray(lock.ancestors) || lock.ancestors.length > 32 ||
            lock.ancestors.some((id) => typeof id !== "string" || !EDIT_BLOCK_ID.test(id)) || typeof lock.name !== "string" || !lock.name || [...lock.name].length > 24 ||
            !Number.isInteger(lock.hue) || lock.hue < 0 || lock.hue >= 360)) throw new Error("Invalid edit lock state");
        if (state.version < this.version) return;
        this.version = state.version;
        this.locks = state.locks;
        this.scheduleRender();
    }

    context(event, pointer = false) {
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
            }
        }
        blocks = blocks.filter((block) => block && scope.contains(block));
        const key = event?.key;
        const inputType = event?.inputType || "";
        const backward = key === "Backspace" || inputType === "deleteContentBackward";
        const forward = key === "Delete" || inputType === "deleteContentForward";
        if (range?.collapsed && blocks.length === 1 && (backward || forward)) {
            const boundary = range.cloneRange();
            boundary.selectNodeContents(cursorEditable(blocks[0]));
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

    syncSelection(force = false) {
        if (this.stopped) return;
        if (this.flushing) {
            if (force && this.flushContext) {
                const sequence = ++this.sequence;
                const context = this.flushContext;
                this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence, context.documentId, context.blocks)
                    .then((state) => { if (sequence === this.sequence) this.update(state); }).catch(() => {});
            }
            return;
        }
        const history = this.plugin.history?.active;
        if (history) {
            if (force && history.acquired) this.claim(history.context, true);
            return;
        }
        const context = !document.hidden && (!document.hasFocus || document.hasFocus()) && this.context();
        if (!this.editTarget) return;
        if (!context || context.documentId !== this.editTarget.documentId) { this.release(); return; }
        // 退格申请包含相邻块；普通 selectionchange 不能用单块申请覆盖尚未完成的申请。
        if (context && this.pending && context.documentId === this.desiredDocumentId &&
            context.blocks[0].blockId === this.desired[0]?.blockId && context.blocks.every((block) =>
                this.desired.some((desired) => desired.blockId === block.blockId))) return;
        if (!document.getSelection?.()?.isCollapsed) {
            if (force && this.desired.length) this.claim({ documentId: context.documentId, blocks: this.desired }, true);
            return;
        }
        this.editTarget.blockId = context.blocks[0].blockId;
        this.claim(context, force);
    }

    activate(context) {
        this.editTarget = { documentId: context.documentId, blockId: context.blocks[0].blockId };
        return this.claim(context);
    }

    conflict(context) {
        return this.locks.find((lock) => lock.name !== this.plugin.clientName && context.blocks.some((block) =>
            block.blockId === lock.blockId || block.ancestors.includes(lock.blockId) || lock.ancestors.includes(block.blockId)));
    }

    async claim(context, force = false) {
        if (this.flushing) {
            try { await this.flushing; } catch { return false; }
        }
        if (this.failedFlush) {
            try { await Promise.all(this.failedFlush.map((editor) => editor.flushPendingTransactions()));this.failedFlush = null; }
            catch { return false; }
        }
        if (this.stopped) return false;
        const signature = JSON.stringify(context);
        if (signature === this.signature && (this.pending || (!force && this.leaseUntil > Date.now()))) {
            return this.pending ? this.pending.then((state) => state.granted, () => false) : this.leaseUntil > Date.now();
        }
        this.signature = signature;
        this.desired = context.blocks;
        this.desiredDocumentId = context.documentId;
        const sequence = ++this.sequence;
        const started = Date.now();
        const request = this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence, context.documentId, context.blocks);
        this.pending = request;
        try {
            const state = await request;
            if (this.stopped || sequence !== this.sequence) return false;
            this.update(state);
            this.ready = true;
            this.held = state.granted ? context.blocks : [];
            this.leaseUntil = state.granted ? started + state.ttl - 1000 : 0;
            return state.granted;
        } catch {
            if (sequence === this.sequence) { this.held = []; this.leaseUntil = 0; this.ready = false; }
            return false;
        } finally {
            if (sequence === this.sequence) this.pending = null;
        }
    }

    release(cancelHistory = true) {
        if (cancelHistory) this.plugin.history?.cancel();
        if (this.plugin.history?.active?.phase === "posting") return;
        this.editTarget = null;
        this.deferredDelete = null;
        this.held = [];
        this.leaseUntil = 0;
        if (!this.desired.length && !this.pending) return this.flushing;
        const documentId = this.desiredDocumentId;
        this.flushContext = { documentId, blocks: this.desired };
        this.desired = [];
        this.desiredDocumentId = null;
        this.signature = "";
        this.pending = null;
        ++this.sequence;
        // 最后一次输入尚在编辑器队列时不能先放锁，否则别人的撤销会读到旧正文。
        const editors = typeof getAllEditor === "function" ? getAllEditor().filter((editor) => editor.protyle?.block?.rootID === documentId) : [];
        const flushing = Promise.all(editors.map((editor) => editor.flushPendingTransactions())).then(async () => {
            this.flushContext = null;
            const sequence = ++this.sequence;
            const state = await this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence, null, []);
            if (!this.stopped && sequence === this.sequence) this.update(state);
        });
        this.flushing = flushing;
        flushing.catch(() => { this.failedFlush = editors;this.ready = false;if (!this.stopped) this.plugin.showEditMessage(this.plugin.i18n.editFlushFailed); })
            .finally(() => { if (this.flushing === flushing) { this.flushing = null;this.flushContext = null; } });
        return flushing.catch(() => {});
    }

    async deferDelete(event, context) {
        const selection = document.getSelection?.();
        if (!selection?.rangeCount || !selection.isCollapsed) return false;
        const range = selection.getRangeAt(0).cloneRange();
        const target = event.target, active = document.activeElement;
        const scope = target?.closest?.(".protyle-wysiwyg");
        if (!scope) return false;
        const contents = context.blocks.map((block) => scope.querySelector(`[data-node-id="${block.blockId}"]`))
            .map((block) => [block, block?.outerHTML]);
        const intent = { node: range.startContainer, offset: range.startOffset };
        this.deferredDelete = intent;
        const granted = await this.claim(context);
        if (this.deferredDelete !== intent) return true;
        this.deferredDelete = null;
        if (!granted) {
            const conflict = this.conflict(context);
            this.plugin.showEditMessage(conflict ? this.plugin.i18n.editLocked.replace("${name}", conflict.name) : this.ready ? this.plugin.i18n.editPending : this.plugin.i18n.editUnavailable);
            return true;
        }
        const current = document.getSelection?.();
        if (this.stopped || document.hidden || (document.hasFocus && !document.hasFocus()) ||
            document.activeElement !== active || !target.isConnected || !current?.isCollapsed || !current.rangeCount ||
            current.anchorNode !== range.startContainer || current.anchorOffset !== range.startOffset ||
            contents.some(([block, html]) => !block?.isConnected || block.outerHTML !== html) ||
            JSON.stringify(this.context(event)) !== JSON.stringify(context) ||
            !this.ready || this.leaseUntil <= Date.now() || this.conflict(context)) return true;
        // 只补发块边界的原生编辑命令；不重放字符、粘贴或输入法事件。
        target.dispatchEvent(new KeyboardEvent("keydown", {
            key: event.key, code: event.code, bubbles: true, cancelable: true,
        }));
        return true;
    }

    guard(event) {
        if (this.plugin.history?.handle(event)) return;
        if (event.type === "keydown") {
            if (!(event.repeat && ["Backspace", "Delete"].includes(event.key))) this.deferredDelete = null;
            const key = event.key || "";
            if (key === 'Escape') { this.release(); return; }
            if (event.ctrlKey || event.metaKey) {
                if (!["b", "i", "u", "v", "x", "z", "y", "k", "enter", "backspace", "delete"].includes(key.toLowerCase())) return;
            } else if (key.length !== 1 && !["Backspace", "Delete", "Enter", "Tab", "Process", "Dead", "Unidentified"].includes(key)) return;
        } else this.deferredDelete = null;
        const toolbar = event.target?.closest?.(".protyle-toolbar");
        if (event.type === "click" && !toolbar && !event.target.closest?.('.protyle-action--task, input[type="checkbox"]')) return;
        const context = this.context(event, !toolbar && ["drop", "dragstart", "contextmenu", "click"].includes(event.type));
        if (!context) return;
        if (this.plugin.history?.active) {
            event.preventDefault();event.stopImmediatePropagation();
            this.plugin.showEditMessage(this.plugin.i18n.historyBusy);
            return;
        }
        if (this.editTarget?.documentId !== context.documentId) {
            event.preventDefault();event.stopImmediatePropagation();
            if (event.type === 'compositionstart') document.activeElement?.blur?.();
            if (!this.noticeAt || Date.now() - this.noticeAt > 1200) {
                this.noticeAt = Date.now();this.plugin.showEditMessage(this.plugin.i18n.editActivate);
            }
            return;
        }
        const conflict = this.conflict(context);
        const owned = this.ready && this.leaseUntil > Date.now() && context.blocks.every((block) =>
            this.held.some((held) => held.blockId === block.blockId || block.ancestors.includes(held.blockId)));
        if (owned && !conflict) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!conflict && event.type === "keydown" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey &&
            ["Backspace", "Delete"].includes(event.key) && context.blocks.length > 1 && document.getSelection?.()?.isCollapsed) {
            if (!this.deferredDelete) this.deferDelete(event, context);
            return;
        }
        if (event.type === "compositionstart") document.activeElement?.blur?.();
        if (!this.noticeAt || Date.now() - this.noticeAt > 1200) {
            this.noticeAt = Date.now();
            this.plugin.showEditMessage(conflict ? this.plugin.i18n.editLocked.replace("${name}", conflict.name) : this.ready ? this.plugin.i18n.editPending : this.plugin.i18n.editUnavailable);
        }
        if (!conflict) this.claim(context);
    }

    scheduleRender() {
        if (this.stopped || this.frame || !this.plugin.cursorLayer) return;
        this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(); });
    }

    render() {
        const visible = new Set();
        if (!document.hidden) for (const lock of this.locks) {
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

    async stop() {
        const released = this.release();
        this.stopped = true;
        clearInterval(this.timer);
        cancelAnimationFrame(this.frame);
        for (const marker of this.markers.values()) marker.remove();
        this.markers.clear();
        document.removeEventListener("pointerdown", this.handlePointer, true);
        document.removeEventListener("dblclick", this.handleDoubleClick, true);
        document.removeEventListener("selectionchange", this.handleSelection);
        document.removeEventListener("visibilitychange", this.handleVisibility);
        for (const type of this.guardedEvents || []) document.removeEventListener(type, this.handleGuard, true);
        window.removeEventListener("blur", this.handleBlur);
        window.removeEventListener("focus", this.handleSelection);
        await Promise.allSettled([released, this.plugin.kernel.rpc.unbind("edit-locks-changed", this.handleState)]);
    }
};

function cursorEditable(block) {
    return block.querySelector('[contenteditable="true"]') || block;
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
        for (const editor of getAllEditor()) {
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
            this.patches.set(undo, { original, wrapped });
            Object.assign(undo, wrapped);
        }
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
        for (const op of operations) {
            if (!op || !EDIT_BLOCK_ID.test(op.id || "") || !["update", "insert", "delete"].includes(op.action) ||
                [op.parentID, op.previousID, op.nextID].some((id) => id && !EDIT_BLOCK_ID.test(id))) throw new Error("historyUnsupported");
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

    record(p, forward, backward) {
        if (this.stopped || !EDIT_BLOCK_ID.test(p?.block?.rootID || "") || !forward?.length || !backward?.length) return;
        const stack = this.stack(p.block.rootID);
        const entry = { time: Date.now(), group: this.group };
        try {
            const serialized = JSON.stringify({ forward, backward });
            if (serialized.length > 2000000) throw new Error("historyUnsupported");
            entry.size = serialized.length;
            Object.assign(entry, JSON.parse(serialized));
            entry.expected = this.state(p, entry.forward);
            const inverse = this.state(p, entry.backward);
            if (entry.expected.size !== inverse.size || [...entry.expected.keys()].some((id) => !inverse.has(id))) throw new Error("historyUnsupported");
            entry.structural = [...entry.forward, ...entry.backward].some((op) => op.action !== "update");
            entry.locations = new Map();
            if (entry.structural) for (const [id, value] of entry.expected) {
                if (value === null) continue;
                const block = p.wysiwyg.element.querySelector(`[data-node-id="${id}"]`);
                if (!block) throw new Error("historyUnsupported");
                const parent = block.parentElement.closest("[data-node-id]");
                let previous = block.previousElementSibling;
                while (previous && !previous.hasAttribute("data-node-id")) previous = previous.previousElementSibling;
                entry.locations.set(id, { parent: parent?.getAttribute("data-node-id") || p.block.rootID,
                    previous: previous?.getAttribute("data-node-id") || "" });
            }
            const previous = stack.undo.at(-1);
            if (!stack.redo.length && !entry.structural && entry.forward.length === 1 && entry.backward.length === 1 &&
                previous?.forward?.length === 1 && previous.backward.length === 1 && previous.group === entry.group &&
                entry.time - previous.time < 1000 && previous.forward[0].id === entry.forward[0].id &&
                previous.expected.get(entry.forward[0].id) === this.canonical(p, entry.backward[0].data)) {
                previous.forward = entry.forward;previous.expected = entry.expected;previous.time = entry.time;
                previous.size = JSON.stringify({ forward: previous.forward, backward: previous.backward }).length;
                return;
            }
        } catch {
            entry.unsupported = true;
            delete entry.forward;delete entry.backward;delete entry.expected;
        }
        stack.undo.push(entry);
        while (stack.undo.length > 100 || stack.undo.reduce((size, item) => size + (item.size || 0), 0) > 10000000) stack.undo.shift();
        stack.redo = [];
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
            (event.target?.closest?.(".protyle-toolbar") && p.wysiwyg.element.contains(anchor))));
        if (!editor && !this.plugin.editing.context(event)) return false;
        event.preventDefault();event.stopImmediatePropagation();
        if (!editor) this.plugin.showEditMessage(this.plugin.i18n.historyUnavailable);
        else if (!(event.repeat && this.active)) this.request(editor, direction);
        return true;
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
        const ids = [...new Set([...entry.forward, ...entry.backward].flatMap((op) => [op.id, op.parentID, op.previousID, op.nextID]).filter(Boolean))];
        const rows = await this.rows(ids);
        for (let depth = 0; depth < 32; depth++) {
            const parents = [...new Set([...rows.values()].map((row) => row.parent_id).filter((id) => id && id !== documentId && !rows.has(id)))];
            if (!parents.length) break;
            const ancestors = await this.rows(parents);
            if (ancestors.size !== parents.length) throw new Error("historyChanged");
            for (const [id, row] of ancestors) rows.set(id, row);
            if (rows.size > 200 || depth === 31) throw new Error("historyUnsupported");
        }
        if ([...rows.values()].some((row) => row.root_id !== documentId)) throw new Error("historyChanged");
        for (const id of ids) if (id !== documentId && !rows.has(id) && !entry.expected.has(id)) throw new Error("historyChanged");
        const blocks = ids.filter((id) => id !== documentId).map((blockId) => {
            const anchor = [...entry.forward, ...entry.backward].find((op) => op.id === blockId && op.action === "insert");
            let parent = rows.get(blockId)?.parent_id || anchor?.parentID || rows.get(anchor?.previousID)?.parent_id || rows.get(anchor?.nextID)?.parent_id;
            const ancestors = [];
            while (parent && parent !== documentId && ancestors.length < 32) { ancestors.push(parent);parent = rows.get(parent)?.parent_id; }
            if (parent !== documentId) throw new Error("historyChanged");
            return { blockId, ancestors };
        });
        if (!blocks.length || blocks.length > 200) throw new Error("historyUnsupported");
        return { documentId, blocks };
    }

    async validate(p, entry) {
        const rows = await this.rows([...entry.expected.keys()]);
        for (const [id, expected] of entry.expected) {
            const row = rows.get(id);
            if (expected === null) { if (row) throw new Error("historyChanged");continue; }
            if (!row || row.root_id !== p.block.rootID) throw new Error("historyChanged");
            const location = entry.locations?.get(id);
            if (location) {
                const sibling = await fetchSyncPost("/api/block/getBlockSiblingID", { id });
                if (sibling.code !== 0 || sibling.data?.parent !== location.parent || (sibling.data.previous || "") !== location.previous) throw new Error("historyChanged");
            }
            const response = await fetchSyncPost("/api/block/getBlockDOM", { id });
            if (response.code !== 0 || typeof response.data?.dom !== "string") throw new Error("historyFailed");
            if (this.canonical(p, response.data.dom) !== expected) throw new Error("historyChanged");
        }
    }

    cancel() {
        this.queue = [];
        if (this.active) this.active.cancelled = true;
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
        const intent = { editor, documentId: p.block.rootID, phase: "waiting", previous: this.plugin.editing.editTarget };
        this.active = intent;
        intent.promise = this.run(intent, direction);
        return intent.promise;
    }

    async run(intent, direction) {
        const { editor, documentId } = intent, p = editor.protyle, editing = this.plugin.editing;
        let entry, success = false, confirmed = false;
        const current = () => !intent.cancelled && !this.stopped && !document.hidden && (!document.hasFocus || document.hasFocus()) &&
            p.element.isConnected && !p.element.closest(".fn__none") && p.block.rootID === documentId;
        try {
            await editor.flushPendingTransactions();
            if (!current()) return false;
            const stack = this.stack(documentId);
            entry = stack[direction].at(-1);
            if (!entry) { this.plugin.showEditMessage(this.plugin.i18n[direction === "undo" ? "historyEmptyUndo" : "historyEmptyRedo"]);return false; }
            if (entry.uncertain) throw new Error("historyUncertain");
            if (entry.unsupported) throw new Error("historyUnsupported");
            intent.context = await this.context(documentId, entry);
            if (!current()) return false;
            if (!await editing.claim(intent.context)) {
                const conflict = editing.conflict(intent.context);
                this.plugin.showEditMessage(conflict ? this.plugin.i18n.historyLocked.replace("${name}", conflict.name) : this.plugin.i18n.editUnavailable);
                return false;
            }
            intent.acquired = true;
            await this.validate(p, entry);
            if (JSON.stringify(await this.context(documentId, entry)) !== JSON.stringify(intent.context)) throw new Error("historyChanged");
            if (!current() || !editing.ready || editing.leaseUntil <= Date.now() || editing.conflict(intent.context)) return false;
            const operations = JSON.parse(JSON.stringify(entry[direction === "undo" ? "backward" : "forward"]));
            intent.phase = "posting";
            // 不调用共享撤销接口；把本人的逆操作作为已校验的新事务提交。
            const response = await fetchSyncPost("/api/transactions", { app: this.plugin.app.appId, session: p.id,
                reqId: Date.now(), transactions: [{ doOperations: operations, undoOperations: [] }] });
            if (response.code !== 0) { confirmed = true;throw new Error("historyFailed"); }
            if (!Array.isArray(response.data) || response.data.length !== 1 || !Array.isArray(response.data[0]?.doOperations)) throw new Error("historyUncertain");
            confirmed = true;
            stack[direction].pop();stack[direction === "undo" ? "redo" : "undo"].push(entry);
            entry.expected = this.state(p, operations);
            entry.locations = new Map();
            if (!this.stopped && p.element.isConnected) {
                try { p.undo.renderLocal(p, response.data[0].doOperations); }
                catch { editor.reload(false); }
            }
            if (entry.structural) for (const [id, value] of entry.expected) {
                if (value === null) continue;
                const sibling = await fetchSyncPost("/api/block/getBlockSiblingID", { id });
                if (sibling.code !== 0 || !sibling.data) { entry.uncertain = true;throw new Error("historyUncertain"); }
                entry.locations.set(id, { parent: sibling.data.parent, previous: sibling.data.previous || "" });
            }
            success = true;
            this.plugin.showEditMessage(this.plugin.i18n[direction === "undo" ? "historyUndone" : "historyRedone"]);
        } catch (error) {
            if (intent.phase === "posting" && !confirmed && entry) entry.uncertain = true;
            if (!this.stopped) this.plugin.showEditMessage(this.plugin.i18n[entry?.uncertain ? "historyUncertain" : error.message] || this.plugin.i18n.historyFailed);
        } finally {
            intent.phase = "finished";
            const next = success && !intent.cancelled ? this.queue.shift() : null;
            this.active = null;
            await editing.release(false);
            if (intent.previous && current()) {
                const context = editing.context();
                if (context?.documentId === documentId) await editing.activate(context);
            }
            if (next && !this.stopped && !intent.cancelled) this.request(next.editor, next.direction);
        }
        return success;
    }

    stop() {
        this.stopped = true;this.cancel();
        for (const [undo, { original, wrapped }] of this.patches) for (const key of Object.keys(original)) {
            if (undo[key] === wrapped[key]) undo[key] = original[key];
        }
        this.patches.clear();this.documents.clear();
    }
}
