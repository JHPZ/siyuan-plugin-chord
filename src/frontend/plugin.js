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
        this.shortcutSequence = 0;
        this.shortcutNotices = new Map();
        this.frameListeners = new Map();
        this.handleShortcut = (value) => this.showShortcut(value);
        this.remoteCursors = [];
        this.remoteSelections = [];
        this.remoteEditing = [];
        this.editingMarkers = new Map();
        this.editingLayers = new Map();
        this.editingSequence = 0;
        this.lastEditingSignature = "null";
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
        this.handleDocument = () => this.scheduleDocumentReport();
        this.handleRenderTarget = rememberRenderTarget;
        this.handleKernelState = ({ detail }) => {
            if (detail.code === 2) {
                this.presenceRevision = -1;
                this.lastCursorSignature = this.lastSelectionSignature = this.lastEditingSignature = undefined;
                this.refreshInBackground();
                this.loadCursors();
            }
        };
        await this.kernel.rpc.bind("presence-changed", this.handlePresence);
        await this.kernel.rpc.bind("cursor-changed", this.handleCursors);
        await this.kernel.rpc.bind("shortcut-shown", this.handleShortcut);
        this.eventBus.on("kernel-plugin-state-change", this.handleKernelState);
        this.eventBus.on("open-noneditableblock", this.handleRenderTarget);
        for (const event of EDITOR_EVENTS) {
            this.eventBus.on(event, this.handleDocument);
        }
        this.addCommand({ langKey: "checkOnline", callback: () => this.openPeople() });
        this.initSettings();
    }

    async onLayoutReady() {
        if (this.layoutStarted || this.stopped) return;
        this.layoutStarted = true;
        this.topBar = this.addTopBar({ icon: "iconEmoji", title: this.i18n.pluginName, position: "right", callback: () => this.openPeople() });
        this.topBar.classList?.add('collab-online-count');
        this.topBar.setAttribute('role','button');
        this.topBar.setAttribute('tabindex','0');
        this.topBar.setAttribute('aria-haspopup','dialog');
        this.topBar.setAttribute('aria-expanded','false');
        this.topBar.addEventListener?.('keydown',event=>{
            if(event.key==='Enter' || event.key===' '){event.preventDefault();this.openPeople();}
        });
        this.renderOnlineCount();
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
        componentRangeStyle(document);
        this.layoutReady = true;
        await this.refreshInBackground();
        if (this.stopped) return;
        this.heartbeatTimer = setInterval(() => this.refreshInBackground(), 20000);
        this.startTracking();
        await this.loadCursors();
    }

    onlineText(count) {
        return this.i18n.onlineCount.replace("${count}", String(count));
    }

    renderOnlineCount() {
        if(!this.topBar)return;
        this.topBar.textContent=this.i18n.onlineBadge.replace('${count}',String(this.onlineCount ?? '—'));
        this.topBar.setAttribute('aria-label',this.onlineCount===null ? this.i18n.kernelFailed : `${this.i18n.pluginName} · ${this.clientName} · ${this.onlineText(this.onlineCount)}`);
    }

    rememberName(name) {
        this.clientName = name;
        try { sessionStorage.setItem(`${this.name}:display-name`, name); } catch {}
    }

    updatePresence(presence) {
        if (this.stopped) return;
        if (Number.isSafeInteger(presence?.revision) && presence.revision < (this.presenceRevision ?? -1)) return;
        const clients = presence?.clients || [];
        if (!presence || !Number.isSafeInteger(presence.count) || presence.count < 0 || !Array.isArray(clients) || clients.some((client) =>
            !client || typeof client.name !== "string" || [...client.name].length > 24 ||
            !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 ||
            (client.documentId !== null && !DOCUMENT_ID.test(client.documentId)) || (client.page != null && !validPage(client.page)))) {
            throw new Error("Invalid presence response");
        }
        if (this.clientName && !clients.some((client) => client.name === this.clientName)) {
            this.lastCursorSignature = this.lastSelectionSignature = this.lastEditingSignature = undefined;
        }
        this.onlineCount = presence.count;
        if(Number.isSafeInteger(presence.revision))this.presenceRevision=presence.revision;
        this.clients = clients;
        for(const [name,notice] of this.shortcutNotices)if(!clients.some(client=>client.name===name)){
            clearTimeout(notice.timer);notice.element.remove();this.shortcutNotices.delete(name);
        }
        this.presenceReceivedAt = Date.now();
        if (presence.self && typeof presence.self.name === "string") {
            this.peerId = presence.self.peerId;
            this.rememberName(presence.self.name);
        }
        this.renderOnlineCount();
        this.scheduleTreeRender();
        this.renderPeople();
        this.scheduleCursorRender();
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
            this.lastCursorSignature = this.lastSelectionSignature = this.lastEditingSignature = undefined;
        }
        const documentId = this.currentDocument();
        try { sessionStorage.setItem(`${this.name}:document`, documentId || ""); } catch {}
        const presence = await this.kernel.rpc.call.presenceHeartbeat(this.sessionId, { name: this.clientName, documentId, page: currentPage(this), generation: this.generation });
        this.updatePresence(presence);
        if(this.trackingStarted)this.queueActivity();
        return presence;
    }

    refreshInBackground() {
        return this.refreshOnline().catch(() => {
            if (!this.stopped) {
                this.onlineCount = null;
                this.clients = [];
                this.lastCursorSignature = this.lastSelectionSignature = this.lastEditingSignature = undefined;
                this.renderOnlineCount();
                this.scheduleTreeRender();
                this.remoteCursors = [];
                this.remoteSelections = [];
                this.remoteEditing = [];
                this.renderPeople();
                this.scheduleCursorRender();
            }
        });
    }

    scheduleDocumentReport() {
        this.finishRestore?.();
        this.scheduleCursorRender();
        if (this.stopped || !this.layoutReady || this.documentFrame) return;
        this.documentFrame = requestAnimationFrame(() => {
            this.documentFrame = 0;
            const id = JSON.stringify(currentPage(this));
            if (!this.stopped && id !== this.reportedDocument) {
                this.reportedDocument = id;
                this.refreshInBackground();
                this.queueActivity();
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
                if ((record.target.nodeType === 3 ? record.target.parentElement : record.target).closest?.(".collab-cursor-layer, .collab-editing-layer, .collab-people, .collab-text-measure")) continue;
                if (record.type === "characterData") { this.scheduleCursorRender(); this.queueActivity(); continue; }
                if (record.type === "attributes") {
                    this.scheduleDocumentReport();
                    if (record.target.matches(".protyle") || record.target.classList.contains("layout__wnd--active") ||
                        (record.oldValue || "").includes("layout__wnd--active")) this.scheduleDocumentReport();
                    this.scheduleCursorRender();
                    this.queueActivity();
                    continue;
                }
                const elements = [...record.addedNodes, ...record.removedNodes].filter((node) => node.nodeType === 1 && !node.matches('.collab-presence-users,.collab-editing-layer,.collab-text-measure'));
                if (!elements.length) continue;
                if(elements.some((element)=>element.matches('iframe') || element.querySelector('iframe')))this.bindFrames();
                this.scheduleDocumentReport();
                if (record.target.closest(".sy__file") || elements.some((node) => node.matches(".sy__file") || node.querySelector(".sy__file"))) this.scheduleTreeRender();
                if ((record.target.closest(".layout-tab-container") && !record.target.closest(".protyle")) ||
                    elements.some((node) => node.matches(".protyle") || node.querySelector(".protyle"))) this.scheduleDocumentReport();
                this.scheduleCursorRender();
                this.queueActivity();
            }
        });
        this.domObserver.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-node-id", "data-private", "hidden", "open"], attributeOldValue: true });
    }

    initSettings() {
        this.setting = new Setting({});
        this.setting.addItem({
            title: this.i18n.cursorTick,
            description: this.i18n.cursorTickTip,
            createActionElement: () => {
                const form = document.createElement("form");
                form.className = "collab-tick-form";
                const input = document.createElement("select");
                input.className = "b3-select";
                for (const [value,key] of [[3,'tickLow'],[10,'tickMedium'],[30,'tickHigh']]) {
                    const option=document.createElement('option');option.value=String(value);option.textContent=this.i18n[key];input.append(option);
                }

                input.required = true;
                input.value = String([3,10,30].includes(this.tick) ? this.tick : 10);
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
                    if (![3,10,30].includes(tick)) {
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
        const editing = state.editing || [];
        if (!Array.isArray(editing) || editing.some((client) => !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 ||
            !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validEditing(client.editing))) throw new Error("Invalid editing response");
        if (this.tick !== state.tick) {
            this.tick = state.tick;
            for(const select of document.querySelectorAll('.collab-tick-form select'))select.value=String([3,10,30].includes(this.tick) ? this.tick : 10);
            if (this.trackingStarted) this.startCursorTimer();
        }
        this.remoteCursors = state.cursors;
        this.remoteSelections = selections;
        this.remoteEditing = editing;
        this.scheduleCursorRender();
        this.watchGraphs();
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
                if(event.target)this.surfaceTarget=event.target;
                this.scheduleDocumentReport();
                this.scheduleCursorRender();
                this.queueActivity();
                this.watchGraphs();
            }
        };
        this.handlePointerLeave = () => {
            this.pointer = null;
            this.queueActivity();
            this.scheduleCursorRender();
        };
        this.handlePointerOut = (event) => { if (!event.relatedTarget) this.handlePointerLeave(); };
        this.handleCursorLayout = () => { this.scheduleCursorRender(); this.queueActivity(); };
        this.handleVisibility = () => {
            if (document.hidden) this.handlePointerLeave();
            else { this.refreshInBackground(); this.loadCursors(); }
            this.scheduleCursorRender();
        };
        document.addEventListener("pointermove", this.handlePointer, { passive: true });
        document.addEventListener("pointerout", this.handlePointerOut, { passive: true });
        document.addEventListener("scroll", this.handleCursorLayout, { capture: true, passive: true });
        document.addEventListener("visibilitychange", this.handleVisibility);
        window.addEventListener("blur", this.handlePointerLeave);
        window.addEventListener("resize", this.handleCursorLayout);
        this.handleSelectionActivity = () => this.queueActivity();
        this.handleSceneActivity = (event) => {
            if (event?.target?.closest?.('.collab-people, .collab-cursor-layer')) return;
            if(event?.target)this.surfaceTarget=event.target;
            const control=event?.target?.closest?.('[id]');
            if(PAGE_CONTROLS.includes(control?.id)){this.pageControl=control.id;this.controlTitle=control.getAttribute('aria-label')?.replace(/<[^>]*>/g,'').slice(0,160);}
            else if(event?.type==='pointerdown' && !event.target.closest('.b3-dialog, .b3-menu'))this.pageControl=null;
            if(event?.type==='pointerdown' && !this.topBar?.contains?.(event.target))this.closePeople();
            this.dialogBase = currentPage(this, false);
            this.scheduleDocumentReport();this.queueActivity();this.scheduleCursorRender();
        };
        this.handleKey = (event) => {
            this.scheduleCursorRender();
            const keys=captureShortcut(event);
            if (keys) {
                this.pendingShortcut=keys;
                this.queueActivity();
            }
        };
        document.addEventListener('selectionchange',this.handleSelectionActivity);
        document.addEventListener('focusin',this.handleSceneActivity,{passive:true});
        document.addEventListener('pointerdown',this.handleSceneActivity,{passive:true});
        document.addEventListener('click',this.handleSceneActivity,{passive:true});
        document.addEventListener('keydown',this.handleKey,{capture:true,passive:true});
        this.handleTyping=(event)=>{
            if(!event.target?.matches('input:not([type]),input[type="text"],input[type="search"],textarea,[contenteditable="true"]') || event.target.closest('[data-private]'))return;
            this.typingTarget=event.target;this.typingAt=Date.now();
            clearTimeout(this.typingTimer);
            this.typingTimer=setTimeout(()=>{this.typingTarget=null;this.queueActivity();},1800);
            this.queueActivity();
        };
        document.addEventListener('input',this.handleTyping,{capture:true,passive:true});
        document.addEventListener('input',this.handleCursorLayout,{capture:true,passive:true});
        document.addEventListener('change',this.handleCursorLayout,{capture:true,passive:true});
        this.bindFrames();
        this.startCursorTimer();
    }

    bindFrames() {
        const frames=new Set();
        const visit=(doc,depth)=>{
            if(depth>=8)return;
            for(const frame of doc.querySelectorAll('iframe')){
                frames.add(frame);try{if(frame.contentDocument)visit(frame.contentDocument,depth+1);}catch{}
            }
        };
        visit(document,0);
        for(const [frame,binding] of this.frameListeners)if(!frames.has(frame)){binding.stop();this.frameListeners.delete(frame);}
        for(const frame of frames) {
            if(this.frameListeners.has(frame)){this.frameListeners.get(frame).load();continue;}
            let doc,observer;
            const move=(event)=>{
                if(!frame.isConnected)return;
                let point={x:event.clientX,y:event.clientY},target=frame,reachedRoot=false;
                for(let current=frame;current;){
                    point=frameToParent(current,point);if(!point){this.handlePointerLeave();return;}target=current;
                    if(current.ownerDocument===document){reachedRoot=true;break;}
                    current=current.ownerDocument.defaultView?.frameElement;
                }
                if(!reachedRoot)return;
                this.handlePointer({target,pointerType:event.pointerType,clientX:point.x,clientY:point.y});
            };
            const stopDocument=()=>{observer?.disconnect();observer=null;doc?.removeEventListener('pointermove',move,true);doc?.removeEventListener('keydown',this.handleKey,true);doc?.removeEventListener('scroll',this.handleCursorLayout,true);doc?.removeEventListener('input',this.handleCursorLayout,true);doc?.removeEventListener('change',this.handleCursorLayout,true);doc?.defaultView?.removeEventListener('resize',this.handleCursorLayout);if(doc)clearComponentStyles(doc);doc=null;};
            const load=()=>{
                let next;try{next=frame.contentDocument;}catch{}
                if(next===doc)return;
                stopDocument();
                doc=next;if(!doc)return;
                doc.addEventListener('pointermove',move,{capture:true,passive:true});doc.addEventListener('keydown',this.handleKey,{capture:true,passive:true});doc.addEventListener('scroll',this.handleCursorLayout,{capture:true,passive:true});doc.addEventListener('input',this.handleCursorLayout,{capture:true,passive:true});doc.addEventListener('change',this.handleCursorLayout,{capture:true,passive:true});doc.defaultView?.addEventListener('resize',this.handleCursorLayout,{passive:true});
                observer=new MutationObserver(records=>{
                    if(this.stopped)return;
                    // Hidden measurement nodes must not schedule their own next render.
                    const changed=records.filter(record=>{
                        const target=record.target.nodeType===3 ? record.target.parentElement:record.target;
                        if(target?.closest?.('.collab-text-measure,.collab-range-measure,.collab-picker-anchor'))return false;
                        return record.type!=='childList' || [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===3 || node.nodeType===1&&!node.matches('.collab-text-measure,.collab-range-measure,.collab-picker-anchor'));
                    });
                    if(!changed.length)return;
                    this.handleCursorLayout();
                    if(changed.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1 && (node.matches('iframe') || node.querySelector('iframe')))))this.bindFrames();
                });
                observer.observe(doc,{childList:true,characterData:true,subtree:true,attributes:true});
            };
            const onLoad=()=>{load();this.bindFrames();this.handleCursorLayout();};
            const enter=()=>this.handlePointerLeave();
            frame.addEventListener('load',onLoad);frame.addEventListener('pointerenter',enter,{passive:true});load();
            this.frameListeners.set(frame,{load,stop:()=>{stopDocument();frame.removeEventListener('load',onLoad);frame.removeEventListener('pointerenter',enter);}});
        }
    }

    queueActivity() {
        if (this.stopped || !this.layoutReady) return;
        if (this.activityFlushing) { this.activityQueued=true;return; }
        if(this.activityTimer)return;
        const delay=Math.max(0,1000/this.tick-(Date.now()-(this.activitySentAt || 0)));
        this.activityTimer=setTimeout(async()=>{
            this.activityTimer=null;this.activitySentAt=Date.now();this.activityFlushing=true;
            const keys=this.pendingShortcut;this.pendingShortcut=null;
            if (keys && !this.stopped) this.kernel.rpc.call.shortcut(this.sessionId,this.generation,++this.shortcutSequence,keys).catch(()=>{});
            await Promise.allSettled([this.sendCursor(),this.sendSelection(),this.sendEditing()]);
            this.activityFlushing=false;
            if(this.activityQueued){this.activityQueued=false;this.queueActivity();}
        },delay);
    }

    startCursorTimer() {
        clearInterval(this.cursorTimer);
        this.cursorTimer=setInterval(()=>{if(Date.now()-this.presenceReceivedAt>=PRESENCE_TIMEOUT)this.scheduleCursorRender();},1000);
    }

    watchGraphs() {
        if(this.stopped || this.graphTimer || document.hidden)return;
        const local=this.pointer && document.elementFromPoint(this.pointer.x,this.pointer.y)?.matches('canvas');
        if(!local && !this.remoteCursors.some(client=>client.cursor.ui?.graph))return;
        const models=graphModels();if(!models.length)return;
        const revision=JSON.stringify(models.map(({graphEngine:engine})=>[engine.positionVersion,engine.geometryVersion,engine.camera.x,engine.camera.y,engine.camera.scale]));
        if(revision!==this.graphRevision){this.graphRevision=revision;this.scheduleCursorRender();this.queueActivity();}
        this.graphTimer=setTimeout(()=>{this.graphTimer=null;this.watchGraphs();},1000/this.tick);
    }

    async sendCursor() {
        if (this.stopped || !this.layoutReady || this.cursorSending) return;
        const cursor = captureCursor(this.pointer, this);
        const signature = JSON.stringify(cursor);
        const typingAt=cursor?.state==='typing' ? this.typingAt:undefined;
        if (signature === this.lastCursorSignature && typingAt===this.lastCursorTypingAt) return;
        this.cursorSending = true;
        try {
            await this.kernel.rpc.call.cursorUpdate(this.sessionId, this.generation, ++this.cursorSequence, cursor);
            this.lastCursorSignature = signature;
            this.lastCursorTypingAt=typingAt;
        } catch {
            this.remoteCursors = [];
            this.scheduleCursorRender();
        } finally {
            this.cursorSending = false;
        }
    }

    async sendEditing() {
        if (this.stopped || !this.layoutReady || this.editingSending) return;
        const editing = captureEditing(), signature = JSON.stringify(editing);
        if (signature === this.lastEditingSignature) return;
        this.editingSending = true;
        try {
            await this.kernel.rpc.call.editingUpdate(this.sessionId, this.generation, ++this.editingSequence, editing);
            this.lastEditingSignature = signature;
            this.editingSentAt = Date.now();
        } catch {
            this.remoteEditing = [];
            this.scheduleCursorRender();
        } finally { this.editingSending = false; }
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
            this.scheduleCursorRender();
        } finally { this.selectionSending = false; }
    }

    scheduleCursorRender() {
        if (this.stopped || !this.cursorLayer) return;
        if (this.cursorFrame) return;
        this.cursorFrame = requestAnimationFrame(() => {
            this.cursorFrame = 0;
            this.renderCursors(true);
        });
    }

    renderCursors(animate) {
        const previousMeasurements=componentMeasurements;
        componentMeasurements={fields:new WeakMap(),scrollbars:new WeakMap(),scrollbarAreas:new WeakMap(),pickers:new WeakMap(),roots:new Map(),routes:new WeakMap(),siblings:new WeakMap(),visualHits:new Map()};
        try {
            const picker=typeof CSS!=='undefined' && CSS.supports('selector(select:open)') && [...document.querySelectorAll('select:open')].some(element=>getComputedStyle(element).appearance==='base-select');
            if(picker && this.cursorLayer.showPopover){
                if(!this.cursorLayer.hasAttribute('popover'))this.cursorLayer.setAttribute('popover','manual');
                // A picker reopened between frames must not cover the read-only cursor layer.
                if(this.cursorLayer.matches(':popover-open'))this.cursorLayer.hidePopover();
                this.cursorLayer.showPopover();
            }else if(this.cursorLayer.hasAttribute('popover')){
                this.cursorLayer.hidePopover();this.cursorLayer.removeAttribute('popover');
            }
            const visible = new Set();
            const positions=[],people=new Set(this.clients.map(client=>client.name));
            if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) {
                for (const client of this.remoteCursors) {
                    if (client.name === this.clientName || !people.has(client.name)) continue;
                    const point = resolveCursor(client.cursor, this);
                    if (!point) continue;
                    const marker=this.cursorMarkers.get(client.name),rect=this.pointer&&marker?.getBoundingClientRect();
                    positions.push({client,point,rect});
                }
                // Resolve every anchor before writing markers so peers share one layout measurement.
                for(const {client,point,rect:measured}of positions){
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
                        marker.append(arrow, label);
                        this.cursorLayer.append(marker);
                        this.cursorMarkers.set(client.name, marker);
                    }
                    const label=marker.querySelector('span');
                    const text=client.name + (client.cursor.state ? ' · '+this.i18n[client.cursor.state==='typing' ? 'cursorTyping':'cursorEditing']:'');
                    if(label.textContent!==text)label.textContent=text;
                    marker.style.setProperty("--collab-cursor-hue", String(client.hue));
                    const transform=`translate3d(${point.x}px, ${point.y}px, 0)`;
                    if(marker.cursorTransform!==transform){
                        marker.style.transitionDuration = animate && marker.cursorTransform ? `${Math.min(120, 1000 / this.tick)}ms` : "0ms";
                        marker.style.transform=transform;
                        marker.cursorTransform=transform;
                    }
                    const rect = measured || {left:point.x,right:point.x+22,top:point.y,bottom:point.y+22};
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
            this.renderEditing();
        }finally{for(const probes of componentMeasurements.visualHits.values())for(const {probe}of probes)probe.remove();componentMeasurements=previousMeasurements;}
    }

    renderEditing() {
        const groups = new Map(), visible = new Set();
        const dialog = [...document.querySelectorAll('.b3-dialog')].filter(visibleElement).at(-1);
        if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) for (const client of this.remoteEditing) {
            if (!this.clients.some((person) => person.name === client.name)) continue;
            const key = JSON.stringify([client.editing.region?.kind ?? 'document', client.editing.region?.id ?? client.editing.documentId, client.editing.documentId, client.editing.blockId]);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(client);
        }
        for (const clients of groups.values()) {
            const { editing, hue } = clients[0];
            for (const block of document.querySelectorAll('.protyle-wysiwyg [data-node-id="' + editing.blockId + '"]')) {
                // Modal dialogs hide the background; other floating UI occludes the editor's native layer.
                if (dialog && !dialog.contains(block)) continue;
                const editor = block.closest('.protyle');
                if (!visibleElement(block) || !matchesRegion(block,editing.region) || editorDocumentId(editor) !== editing.documentId) continue;
                const rect = block.getBoundingClientRect(), clip = (block.closest('.protyle-content') || editor).getBoundingClientRect();
                const left = Math.max(rect.left, clip.left, 0), top = Math.max(rect.top, clip.top, 0);
                const right = Math.min(rect.right, clip.right, window.innerWidth), bottom = Math.min(rect.bottom, clip.bottom, window.innerHeight);
                if (right <= left || bottom <= top) continue;
                visible.add(block);
                let marker = this.editingMarkers.get(block);
                if (!marker) {
                    marker = document.createElement('div');
                    marker.className = 'collab-editing';
                    marker.append(document.createElement('span'));
                    let layer=this.editingLayers.get(editor);
                    if(!layer){
                        layer=document.createElement('div');layer.className='collab-editing-layer';layer.setAttribute('aria-hidden','true');
                        editor.append(layer);this.editingLayers.set(editor,layer);
                    }
                    layer.append(marker);
                    this.editingMarkers.set(block, marker);
                }
                marker.firstElementChild.textContent = this.i18n.editingNames.replace('${names}', clients.map((client) => client.name).join('、'));
                marker.classList.toggle('collab-editing--inset', top - 22 < Math.max(clip.top, 0));
                marker.style.setProperty('--collab-editing-hue', String(hue));
                const layer=marker.parentElement, origin=layer.getBoundingClientRect();
                const scaleX=origin.width/(layer.clientWidth || origin.width),scaleY=origin.height/(layer.clientHeight || origin.height);
                marker.style.transform = 'translate3d(' + (left-origin.left)/scaleX + 'px,' + (top-origin.top)/scaleY + 'px,0)';
                marker.style.width = (right - left)/scaleX + 'px';
                marker.style.height = (bottom - top)/scaleY + 'px';
            }
        }
        for (const [block, marker] of this.editingMarkers) if (!visible.has(block)) { marker.remove(); this.editingMarkers.delete(block); }
        for(const [editor,layer] of this.editingLayers)if(!layer.childElementCount || !editor.isConnected){layer.remove();this.editingLayers.delete(editor);}
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
            group.setAttribute("aria-haspopup", "dialog");
            group.title = description;
            for (const type of ["pointerdown", "mousedown", "dblclick", "keydown"]) {
                group.addEventListener(type, (event) => event.stopPropagation());
            }
            group.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.openPeople(row.getAttribute('data-node-id'));
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
        menu.addItem({ icon: "iconEmoji", label: this.i18n.checkOnline, click: () => this.openPeople() });
        menu.addItem({ icon: "iconEdit", label: `${this.i18n.renameSelf} (${escapeHTML(this.clientName || this.i18n.connecting)})`, click: () => this.openRenameDialog() });
        menu.addItem({ icon: "iconSettings", label: this.i18n.cursorSettings, click: () => this.openSetting() });
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

    openPeople(documentId = null) {
        this.peopleDocument = documentId;
        if (!this.peoplePanel) {
            const panel=document.createElement('section');panel.className='collab-people';
            const dialog=new Dialog({title:this.i18n.peopleTitle,content:'<div class="b3-dialog__content"></div>',width:'min(440px, calc(100vw - 32px))',destroyCallback:()=>{
                if(this.peopleDialog===dialog){this.peopleDialog=null;this.closePeople();}
            }});
            this.peopleDialog=dialog;
            const header=document.createElement('div');header.className='collab-people__header';
            const title=document.createElement('strong');
            const close=document.createElement('button');close.type='button';close.className='b3-button b3-button--outline';close.textContent=this.i18n.close;
            close.addEventListener('click',()=>this.closePeople());header.append(title,close);
            const list=document.createElement('div');list.className='collab-people__list';
            const actions=document.createElement('div');actions.className='collab-people__actions';
            for(const [label,action] of [[this.i18n.renameSelf,()=>this.openRenameDialog()],[this.i18n.cursorSettings,()=>this.openSetting()]]) {
                const button=document.createElement('button');button.type='button';button.className='b3-button b3-button--outline';button.textContent=label;
                button.addEventListener('click',()=>{this.closePeople();action();});actions.append(button);
            }
            panel.append(header,list,actions);dialog.element.querySelector('.b3-dialog__content').append(panel);
            this.peoplePanel=panel;this.peopleRows=new Map();
            this.topBar?.setAttribute('aria-expanded','true');
            panel.addEventListener('keydown',(event)=>{if(event.key==='Escape'){this.closePeople();this.topBar?.focus?.();}});
            close.focus();
        }
        this.renderPeople();
        this.refreshInBackground();
    }

    closePeople() {
        const dialog=this.peopleDialog;this.peopleDialog=null;dialog?.destroy();
        this.peoplePanel?.remove();this.peoplePanel=null;this.peopleRows?.clear();this.peopleEmpty=null;
        this.topBar?.setAttribute('aria-expanded','false');
        this.scheduleDocumentReport();
    }

    renderPeople() {
        if (!this.peoplePanel) return;
        this.peoplePanel.querySelector('strong').textContent=this.i18n.onlineBadge.replace('${count}',String(this.onlineCount ?? '—'));
        const list=this.peoplePanel.querySelector('.collab-people__list'), visible=new Set();
        for(const client of this.clients) {
            if(this.peopleDocument && client.documentId!==this.peopleDocument)continue;
            const key=client.peerId || client.name;visible.add(key);
            let row=this.peopleRows.get(key);
            if(!row) {
                row=document.createElement('div');row.className='collab-person';
                const details=document.createElement('div');details.className='collab-person__details';
                const name=document.createElement('strong'),page=document.createElement('span');page.className='collab-person__page';details.append(name,page);
                for(const type of ['person-name','person-self']){const part=document.createElement('span');part.className='collab-'+type;part.setAttribute('data-type',type);name.append(part);}
                const follow=document.createElement('button');follow.type='button';follow.className='b3-button b3-button--outline';follow.textContent=this.i18n.follow;
                follow.addEventListener('click',async()=>{
                    const target=this.clients.find((person)=>(person.peerId || person.name)===key);
                    if(!target)return;
                    const page=target.page || (target.documentId ? {kind:'document',id:target.documentId,title:this.i18n.pageDocument}:null);
                    if(!page)return;
                    follow.disabled=true;
                    try{this.closePeople();await openPage(this,page);this.scheduleDocumentReport();}
                    catch{showMessage(this.i18n.followFailed,5000,'error');follow.disabled=false;}
                });
                row.append(details,follow);list.append(row);this.peopleRows.set(key,row);
            }
            row.style.setProperty('--collab-person-hue',String(client.hue));
            row.setAttribute('data-name',client.name);
            const own=client.name===this.clientName;
            row.querySelector('.collab-person-name').textContent=client.name;
            const self=row.querySelector('.collab-person-self');self.textContent=own ? ' · '+this.i18n.self:'';self.hidden=!own;
            const page=row.querySelector('.collab-person__page');page.textContent=client.page?.title || (client.documentId ? this.i18n.pageDocument : this.i18n.pageWorkspace);page.title=page.textContent;
            row.querySelector('button').disabled=own || (!client.page && !client.documentId);
        }
        for(const [key,row] of this.peopleRows)if(!visible.has(key)){row.remove();this.peopleRows.delete(key);}
        if(!visible.size && !this.peopleEmpty){this.peopleEmpty=document.createElement('p');this.peopleEmpty.className='collab-people__empty';list.append(this.peopleEmpty);}
        if(this.peopleEmpty){this.peopleEmpty.textContent=this.onlineCount===null ? this.i18n.kernelFailed : this.i18n.peopleEmpty;if(visible.size){this.peopleEmpty.remove();this.peopleEmpty=null;}}
    }

    showShortcut(value) {
        if(this.stopped || !this.cursorLayer || !value || !validShortcut(value.keys) || typeof value.name!=='string' || value.name.length>48 || value.name===this.clientName || !this.clients.some((client)=>client.name===value.name))return;
        let notice=this.shortcutNotices.get(value.name);
        if(!notice){const element=document.createElement('div');element.className='collab-shortcut';this.cursorLayer.append(element);notice={element};this.shortcutNotices.set(value.name,notice);}
        notice.element.textContent=value.name+'  '+value.keys;
        notice.element.style.bottom=(24+[...this.shortcutNotices.keys()].indexOf(value.name)*40)+'px';
        clearTimeout(notice.timer);notice.timer=setTimeout(()=>{notice.element.remove();this.shortcutNotices.delete(value.name);},1800);
    }

    async onunload() {
        this.stopped = true;
        clearComponentStyles();
        this.finishRestore?.();
        clearTimeout(this.restoreTimer);
        clearInterval(this.heartbeatTimer);
        clearInterval(this.cursorTimer);
        clearTimeout(this.graphTimer);
        cancelAnimationFrame(this.cursorFrame);
        clearTimeout(this.activityTimer);
        clearTimeout(this.typingTimer);
        for(const binding of this.frameListeners.values())binding.stop();this.frameListeners.clear();
        this.closePeople();
        for(const notice of this.shortcutNotices.values())clearTimeout(notice.timer);
        this.shortcutNotices.clear();
        this.cursorLayer?.remove();
        this.cursorMarkers.clear();
        this.editingMarkers.clear();
        for(const layer of this.editingLayers.values())layer.remove();this.editingLayers.clear();
        if (typeof CSS !== 'undefined' && CSS.highlights) for (const key of this.selectionHighlights) CSS.highlights.delete(key);
        document.removeEventListener('input',this.handleTyping,true);
        document.removeEventListener('input',this.handleCursorLayout,true);
        document.removeEventListener('change',this.handleCursorLayout,true);
        document.removeEventListener('selectionchange',this.handleSelectionActivity);
        document.removeEventListener('focusin',this.handleSceneActivity);
        document.removeEventListener('pointerdown',this.handleSceneActivity);
        document.removeEventListener('click',this.handleSceneActivity);
        document.removeEventListener('keydown',this.handleKey,true);
        document.removeEventListener("pointermove", this.handlePointer);
        document.removeEventListener("pointerout", this.handlePointerOut);
        document.removeEventListener("scroll", this.handleCursorLayout, true);
        document.removeEventListener("visibilitychange", this.handleVisibility);
        window.removeEventListener("blur", this.handlePointerLeave);
        window.removeEventListener("resize", this.handleCursorLayout);
        cancelAnimationFrame(this.treeFrame);
        cancelAnimationFrame(this.documentFrame);
        this.domObserver?.disconnect();
        this.renameDialog?.destroy();
        document.querySelectorAll(".sy__file .collab-presence").forEach((row) => this.clearRow(row));
        this.eventBus.off("kernel-plugin-state-change", this.handleKernelState);
        this.eventBus.off("open-noneditableblock", this.handleRenderTarget);
        for (const event of EDITOR_EVENTS) this.eventBus.off(event, this.handleDocument);
        await Promise.allSettled([this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors), this.kernel.rpc.unbind("shortcut-shown", this.handleShortcut)]);
        await this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation).catch(() => {});
    }
};
