const CURSOR_PATHS = {
    pointer: 'M2 2L19 8.5L12 12L8.5 19Z',
    dragging: 'M5 10V7Q5 5 7 5Q8 5 8 7V5Q8 3 10 3Q12 3 12 5V6Q12 4 14 4Q16 4 16 6V8Q16 6 18 7Q19 7 19 9V14Q19 20 13 20H10Q8 20 7 18L3 13Q2 11 4 10L7 13V9Z',
    editing: 'M7 1H15V3H12V19H15V21H7V19H10V3H7Z'
};

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
        this.clickSequence = 0;
        this.pendingClicks = [];
        this.clickEffects = new Map();
        this.handleClick = value => this.showClick(value);
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
            const hue = sessionStorage.getItem(`${this.name}:hue`);
            if (hue !== null && Number.isInteger(Number(hue)) && Number(hue) >= 0 && Number(hue) < 360) this.hue = Number(hue);
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
        await this.kernel.rpc.bind("pointer-clicked", this.handleClick);
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
        for(const [name,notices] of this.shortcutNotices)if(!clients.some(client=>client.name===name)){
            for(const notice of notices){clearTimeout(notice.timer);notice.element.remove();}this.shortcutNotices.delete(name);
        }
        this.presenceReceivedAt = Date.now();
        const self = presence.self || clients.find(client => this.peerId && client.peerId === this.peerId);
        if (self && typeof self.name === "string") {
            this.peerId = self.peerId;
            this.rememberName(self.name);
            if (Number.isInteger(self.hue) && self.hue >= 0 && self.hue < 360) {
                this.hue = self.hue;
                try { sessionStorage.setItem(`${this.name}:hue`, String(self.hue)); } catch {}
            }
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
        const presence = await this.kernel.rpc.call.presenceHeartbeat(this.sessionId, { name: this.clientName, documentId, page: currentPage(this), generation: this.generation, ...(this.hue === undefined ? {} : {hue:this.hue}) });
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
                this.clearClicks();
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
        this.setting.addItem({title:this.i18n.cursorTick, description:this.i18n.cursorTickTip, createActionElement:()=>this.createTickForm()});
    }

    createTickForm(onSaved, onCancel) {
        const form=document.createElement('form');form.className='collab-tick-form';
        const input=document.createElement('select');input.className='b3-select';input.required=true;
        for(const [value,key] of [[3,'tickLow'],[10,'tickMedium'],[30,'tickHigh']]) {
            const option=document.createElement('option');option.value=String(value);option.textContent=this.i18n[key];input.append(option);
        }
        input.value=String([3,10,30].includes(this.tick) ? this.tick : 10);input.setAttribute('aria-label',this.i18n.cursorTick);
        const error=document.createElement('div');error.className='ft__error';error.setAttribute('role','alert');
        const actions=document.createElement('div');actions.className='collab-name-actions';
        if(onCancel){const cancel=document.createElement('button');cancel.type='button';cancel.className='b3-button b3-button--cancel';cancel.textContent=this.i18n.cancel;cancel.addEventListener('click',onCancel);actions.append(cancel);}
        const save=document.createElement('button');save.type='submit';save.className='b3-button';save.textContent=this.i18n.save;actions.append(save);
        form.append(input,error,actions);
        form.addEventListener('submit',async event=>{
            event.preventDefault();if(save.disabled)return;
            const tick=Number(input.value);
            if(![3,10,30].includes(tick)){error.textContent=this.i18n.cursorTickFailed;return;}
            save.disabled=true;error.textContent='';
            try {
                this.updateCursors(await this.kernel.rpc.call.setCursorTick(tick));
                if(!this.stopped){if(onSaved)onSaved();else showMessage(this.i18n.cursorTickSaved,3000,'info');}
            } catch {error.textContent=this.i18n.cursorTickFailed;}
            finally {save.disabled=false;}
        });
        return form;
    }

    openSetting() {
        if(this.tickDialog)return;
        const dialog=new Dialog({title:this.i18n.cursorTick,content:'<div class="b3-dialog__content collab-settings-content"></div>',width:'min(320px, calc(100vw - 32px))',destroyCallback:()=>{this.tickDialog=null;}});
        dialog.element.classList.add('collab-dialog');
        this.tickDialog=dialog;
        const tip=document.createElement('p');tip.className='collab-setting-tip';tip.textContent=this.i18n.cursorTickTip;
        const form=this.createTickForm(()=>dialog.destroy(),()=>dialog.destroy());
        dialog.element.querySelector('.b3-dialog__content').append(tip,form);form.querySelector('select').focus();
        dialog.element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();dialog.destroy();}});
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
            if(!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY))return;
            if (!event.pointerType || event.pointerType === "mouse" || event.pointerType === "pen") {
                this.pointer = { x: event.clientX, y: event.clientY };
                if (event.buttons === 0 && !this.nativeDragging) this.endDrag();
                if(event.target)this.surfaceTarget=event.target;
                this.scheduleDocumentReport();
                this.scheduleCursorRender();
                this.queueActivity();
                this.watchGraphs();
            }
        };
        this.handlePointerLeave = () => {
            this.endDrag();
            this.pointer = null;
            this.queueActivity();
            this.scheduleCursorRender();
        };
        this.handlePointerOut = (event) => { if (!event.relatedTarget) this.handlePointerLeave(); };
        this.handleCursorLayout = () => { this.scheduleCursorRender(); this.queueActivity(); };
        this.handleVisibility = () => {
            if (document.hidden) {this.handlePointerLeave();this.clearClicks();}
            else { this.refreshInBackground(); this.loadCursors(); }
            this.scheduleCursorRender();
        };
        document.addEventListener("pointermove", this.handlePointer, { passive: true });
        this.stopInteractions = this.bindInteractions(document, event => event);
        document.addEventListener("pointerout", this.handlePointerOut, { passive: true });
        document.addEventListener("scroll", this.handleCursorLayout, { capture: true, passive: true });
        document.addEventListener("visibilitychange", this.handleVisibility);
        window.addEventListener("blur", this.handlePointerLeave);
        window.addEventListener("resize", this.handleCursorLayout);
        this.handleSelectionActivity = () => this.queueActivity();
        this.handleSceneActivity = (event) => {
            if(this.renameDialog?.element.contains(event?.target) || this.tickDialog?.element.contains(event?.target))return;
            if (event?.target?.closest?.('.collab-people, .collab-people__header, .collab-cursor-layer')) return;
            if(event?.target)this.surfaceTarget=event.target;
            const control=event?.target?.closest?.('[id]');
            if(PAGE_CONTROLS.includes(control?.id)){this.pageControl=control.id;this.controlTitle=control.getAttribute('aria-label')?.replace(/<[^>]*>/g,'').slice(0,160);}
            else if(event?.type==='pointerdown' && !event.target.closest('.b3-dialog, .b3-menu'))this.pageControl=null;
            if(event?.type==='pointerdown' && !this.topBar?.contains?.(event.target))this.closePeople();
            this.dialogBase = currentPage(this, false);
            this.scheduleDocumentReport();this.queueActivity();this.scheduleCursorRender();
        };
        this.handleKey = (event) => {
            if(this.cursorPicker && (!this.cursorPicker.matches(':open') || !event.target?.closest?.('select')))this.cursorPicker=null;
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
        document.addEventListener('click',rememberColorEditor,{capture:true,passive:true});
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

    endDrag() {
        if(!this.dragging && !this.nativeDragging)return;
        this.dragging = this.nativeDragging = false;
        this.queueActivity();
    }

    bindInteractions(doc, convert) {
        const down = event => {
            if (event.button !== 0 || event.isPrimary === false || event.pointerType === 'touch') return;
            this.cursorPicker=null;
            const point = convert(event); if (!point) return;
            this.handlePointer(point);
            const cursor = captureCursor(this.pointer,this);
            if (!cursor) return;
            this.pendingClicks.push(cursor);
            if(this.pendingClicks.length > 8)this.pendingClicks.shift();
            this.queueActivity();
        };
        const start = event => {
            if(event.defaultPrevented){this.endDrag();return;}
            this.nativeDragging=true;
            this.dragging=Array.from(event.dataTransfer?.types || []).includes('application/siyuan-block');
            const point=convert(event);if(point)this.handlePointer(point);
            this.queueActivity();
        };
        const over = event => {const point=convert(event);if(point)this.handlePointer(point);};
        const end = event => {this.endDrag();const point=convert(event);if(point)this.handlePointer(point);};
        const cancel = () => {if(!this.nativeDragging)this.endDrag();};
        const handlers = {pointerdown:down,pointerup:end,pointercancel:cancel,dragstart:start,dragover:over,dragend:end,drop:end};
        // Read drag types after SiYuan's block handler has populated them.
        for(const [type,handler] of Object.entries(handlers))doc.addEventListener(type,handler,{capture:type!=='dragstart',passive:true});
        return () => {for(const [type,handler] of Object.entries(handlers))doc.removeEventListener(type,handler,type!=='dragstart');};
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
            let doc,observer,stopInteractions;
            const convert=(event,content=true)=>{
                if(!frame.isConnected)return;
                let point={x:event.clientX,y:event.clientY},target=frame,reachedRoot=!content && frame.ownerDocument===document;
                for(let current=content ? frame:frame.ownerDocument.defaultView?.frameElement;current;){
                    point=frameToParent(current,point);if(!point){this.handlePointerLeave();return;}target=current;
                    if(current.ownerDocument===document){reachedRoot=true;break;}
                    current=current.ownerDocument.defaultView?.frameElement;
                }
                if(!reachedRoot)return;
                return {target,pointerType:event.pointerType,buttons:event.buttons,clientX:point.x,clientY:point.y};
            };
            const move=event=>{const point=convert(event);if(point)this.handlePointer(point);};
            const stopDocument=()=>{stopInteractions?.();stopInteractions=null;observer?.disconnect();observer=null;doc?.removeEventListener('click',rememberColorEditor,true);doc?.removeEventListener('pointermove',move,true);doc?.removeEventListener('keydown',this.handleKey,true);doc?.removeEventListener('scroll',this.handleCursorLayout,true);doc?.removeEventListener('input',this.handleCursorLayout,true);doc?.removeEventListener('change',this.handleCursorLayout,true);doc?.defaultView?.removeEventListener('resize',this.handleCursorLayout);if(doc)clearComponentStyles(doc);doc=null;};
            const load=()=>{
                let next;try{next=frame.contentDocument;}catch{}
                if(next===doc)return;
                stopDocument();
                doc=next;if(!doc)return;
                stopInteractions=this.bindInteractions(doc,convert);
                doc.addEventListener('click',rememberColorEditor,{capture:true,passive:true});doc.addEventListener('pointermove',move,{capture:true,passive:true});doc.addEventListener('keydown',this.handleKey,{capture:true,passive:true});doc.addEventListener('scroll',this.handleCursorLayout,{capture:true,passive:true});doc.addEventListener('input',this.handleCursorLayout,{capture:true,passive:true});doc.addEventListener('change',this.handleCursorLayout,{capture:true,passive:true});doc.defaultView?.addEventListener('resize',this.handleCursorLayout,{passive:true});
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
            const enter=event=>{const point=convert(event,false);if(point)this.handlePointer(point);};
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
            for(const cursor of this.pendingClicks.splice(0))if(!this.stopped)this.kernel.rpc.call.pointerClick(this.sessionId,this.generation,++this.clickSequence,cursor).catch(()=>{});
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
        } catch {} finally {
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
        } catch {} finally { this.editingSending = false; }
    }

    async sendSelection() {
        if (this.stopped || !this.layoutReady || this.selectionSending) return;
        const selection = captureSelection(), signature = JSON.stringify(selection);
        if (signature === this.lastSelectionSignature) return;
        this.selectionSending = true;
        try {
            await this.kernel.rpc.call.selectionUpdate(this.sessionId, this.generation, ++this.selectionSequence, selection);
            this.lastSelectionSignature = signature;
        } catch {} finally { this.selectionSending = false; }
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
        componentMeasurements={fields:new WeakMap(),fieldMirrors:new Map(),scrollbars:new WeakMap(),scrollbarAreas:new WeakMap(),pickers:new WeakMap(),roots:new Map(),routes:new WeakMap(),siblings:new WeakMap(),visualHits:new Map()};
        try {
            const picker=typeof CSS!=='undefined' && CSS.supports('selector(select:open)') && [...document.querySelectorAll('select:open')].find(element=>getComputedStyle(element).appearance==='base-select');
            if(picker && this.cursorLayer.showPopover){
                if(!this.cursorLayer.hasAttribute('popover'))this.cursorLayer.setAttribute('popover','manual');
                // Promote once per opening; repeated hide/show resets every cursor's rendering.
                if(this.cursorPicker!==picker || !this.cursorLayer.matches(':popover-open')){
                    if(this.cursorLayer.matches(':popover-open'))this.cursorLayer.hidePopover();
                    this.cursorLayer.showPopover();
                }
                this.cursorPicker=picker;
            }else if(this.cursorLayer.hasAttribute('popover')){
                this.cursorLayer.hidePopover();this.cursorLayer.removeAttribute('popover');
                this.cursorPicker=null;
            }
            const visible = new Set(),resolved=new Map();
            const positions=[],people=new Set(this.clients.map(client=>client.name));
            if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) {
                for (const client of this.remoteCursors) {
                    if (client.name === this.clientName || !people.has(client.name)) continue;
                    const key=JSON.stringify(client.cursor);
                    if(!resolved.has(key))resolved.set(key,resolveCursor(client.cursor,this));
                    const point=resolved.get(key);
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
                        path.setAttribute("d", CURSOR_PATHS.pointer);
                        arrow.append(path);
                        const label = document.createElement("span");
                        marker.append(arrow, label);
                        this.cursorLayer.append(marker);
                        this.cursorMarkers.set(client.name, marker);
                    }
                    const label=marker.querySelector('span');
                    if(label.textContent!==client.name)label.textContent=client.name;
                    const state=client.cursor.dragging ? 'dragging' : client.cursor.state || 'pointer';
                    if(marker.dataset.state!==state){
                        marker.dataset.state=state;
                        marker.querySelector('path').setAttribute('d',CURSOR_PATHS[state] || CURSOR_PATHS.editing);
                    }
                    for(const notice of this.shortcutNotices.get(client.name)||[]){
                        if(notice.element.parentElement===this.cursorLayer)continue;
                        notice.element.style.setProperty('--collab-shortcut-x',`${point.x}px`);
                        notice.element.style.setProperty('--collab-shortcut-y',`${point.y}px`);
                        notice.element.dataset.side=point.x>window.innerWidth/2?'left':'right';
                        notice.element.dataset.below=point.y<80?'true':'false';
                        this.cursorLayer.append(notice.element);
                    }
                    marker.style.setProperty("--collab-cursor-hue", String(client.hue));
                    const transform=`translate3d(${point.x}px, ${point.y}px, 0)`;
                    if(marker.cursorTransform!==transform){
                        marker.style.transitionDuration = animate && marker.cursorTransform ? `${1000 / this.tick}ms` : "0ms";
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
            for(const [element,effect] of this.clickEffects)if(effect.cursor){
                const point=resolveCursor(effect.cursor,this);
                if(!point || document.hidden || Date.now()-this.presenceReceivedAt>=PRESENCE_TIMEOUT || !this.clients.some(client=>client.peerId===effect.peerId)){
                    clearTimeout(effect.timer);element.remove();this.clickEffects.delete(element);
                }else{element.style.left=`${point.x}px`;element.style.top=`${point.y}px`;}
            }
        }finally{for(const {mirror}of componentMeasurements.fieldMirrors.values())mirror.remove();for(const probes of componentMeasurements.visualHits.values())for(const {probe}of probes)probe.remove();componentMeasurements=previousMeasurements;}
    }

    renderEditing() {
        const groups = new Map(), visible = new Set();
        const dialog = [...document.querySelectorAll('.b3-dialog')].filter(visibleElement).at(-1);
        if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) for (const client of this.remoteEditing) {
            if (!this.clients.some((person) => person.name === client.name)) continue;
            const key = JSON.stringify([client.editing.region?.kind ?? 'document', client.editing.region?.id ?? client.editing.documentId, client.editing.documentId, [...(client.editing.blockIds || [client.editing.blockId])].sort()]);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(client);
        }
        const blockMaps=new Map();
        for (const [key,clients] of groups) {
            const { editing, hue } = clients[0];
            for (const editor of document.querySelectorAll('.protyle')) {
                // Modal dialogs hide the background; other floating UI occludes the editor's native layer.
                if (dialog && !dialog.contains(editor)) continue;
                if (!visibleElement(editor) || !matchesRegion(editor,editing.region) || editorDocumentId(editor) !== editing.documentId) continue;
                if(!blockMaps.has(editor))blockMaps.set(editor,new Map([...editor.querySelectorAll('.protyle-wysiwyg [data-node-id]')].filter(block=>block.closest('.protyle')===editor).map(block=>[block.getAttribute('data-node-id'),block])));
                const blocks=blockMaps.get(editor),clip = (editor.querySelector('.protyle-content') || editor).getBoundingClientRect();
                let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
                for(const id of editing.blockIds || [editing.blockId]){
                    const block=blocks.get(id);
                    if(!block || !visibleElement(block))continue;
                    const rect=block.getBoundingClientRect(),x1=Math.max(rect.left,clip.left,0),y1=Math.max(rect.top,clip.top,0),x2=Math.min(rect.right,clip.right,window.innerWidth),y2=Math.min(rect.bottom,clip.bottom,window.innerHeight);
                    if(x2<=x1 || y2<=y1)continue;
                    left=Math.min(left,x1);top=Math.min(top,y1);right=Math.max(right,x2);bottom=Math.max(bottom,y2);
                }
                if (!Number.isFinite(left)) continue;
                let markers=this.editingMarkers.get(editor);
                if(!markers){markers=new Map();this.editingMarkers.set(editor,markers);}
                let marker = markers.get(key);
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
                    markers.set(key, marker);
                }
                visible.add(marker);
                marker.firstElementChild.textContent = this.i18n.editingNames.replace('${names}', clients.map((client) => client.name).join('、'));
                marker.classList.toggle('collab-editing--inset', top - 22 < Math.max(clip.top, 0));
                marker.style.setProperty('--collab-editing-hue', String(hue));
                const layer=marker.parentElement, origin=layer.getBoundingClientRect();
                const style=getComputedStyle(layer),scaleX=origin.width/(parseFloat(style.width) || origin.width),scaleY=origin.height/(parseFloat(style.height) || origin.height);
                marker.style.transform = 'translate3d(' + (left-origin.left)/scaleX + 'px,' + (top-origin.top)/scaleY + 'px,0)';
                marker.style.width = (right - left)/scaleX + 'px';
                marker.style.height = (bottom - top)/scaleY + 'px';
            }
        }
        for (const [editor,markers] of this.editingMarkers) {
            for(const [key,marker] of markers)if(!visible.has(marker)){marker.remove();markers.delete(key);}
            if(!markers.size)this.editingMarkers.delete(editor);
        }
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
            const signature = JSON.stringify(viewers.map(({name,hue})=>[name,hue]));
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

    createProfileForm(onSaved, onCancel) {
        const form=document.createElement('form');form.className='collab-name-form';
        const label=document.createElement('label');label.textContent=this.i18n.nameLabel;
        const input=document.createElement('input');input.className='b3-text-field fn__block';input.value=this.clientName;
        input.maxLength=48;input.required=true;input.autocomplete='off';input.title=this.i18n.nameHint;label.append(input);
        const colorLabel=document.createElement('div');colorLabel.className='collab-color-field';colorLabel.textContent=this.i18n.colorLabel;
        const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='359';slider.step='1';slider.value=String(this.hue ?? 0);slider.className='collab-hue';slider.setAttribute('aria-label',this.i18n.colorLabel);
        const swatches=document.createElement('div');swatches.className='collab-swatches';swatches.setAttribute('role','group');swatches.setAttribute('aria-label',this.i18n.colorLabel);
        for(const hue of [0,30,55,120,180,220,270,320]) {
            const button=document.createElement('button');button.type='button';button.dataset.hue=String(hue);
            button.style.setProperty('--collab-cursor-hue',String(hue));button.setAttribute('aria-label',this.i18n.colorHue.replace('${hue}',String(hue)));
            button.addEventListener('click',()=>{slider.value=String(hue);preview();});swatches.append(button);
        }
        const sample=document.createElement('div');sample.className='collab-profile-preview';sample.setAttribute('aria-label',this.i18n.profilePreview);
        const marker=document.createElement('div');marker.className='collab-cursor';
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 22 22');
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',CURSOR_PATHS.pointer);svg.append(path);
        const name=document.createElement('span');marker.append(svg,name);sample.append(marker);
        let dragOrigin=null,position={x:16,y:22};
        const place=(x,y)=>{
            const width=sample.clientWidth || 280,height=sample.clientHeight || 64;
            position={x,y};
            const labelWidth=Math.min(name.scrollWidth ? name.scrollWidth+2 : 32,252,width-16),labelHeight=name.offsetHeight || 20;
            const labelX=Math.max(8,Math.min(x+13,width-labelWidth-8)),labelY=Math.max(8,Math.min(y+17,height-labelHeight-8));
            marker.style.transform=`translate3d(${x}px, ${y}px, 0)`;
            name.style.transform=`translate(${labelX-x}px, ${labelY-y}px)`;
            marker.style.setProperty('--collab-preview-label-width',`${width-28}px`);
        };
        const reset=()=>{dragOrigin=null;marker.dataset.state='pointer';path.setAttribute('d',CURSOR_PATHS.pointer);};
        const move=event=>{
            const rect=sample.getBoundingClientRect();
            sample.dataset.tracking='true';
            place((event.clientX-rect.left)*(sample.clientWidth || rect.width)/rect.width,(event.clientY-rect.top)*(sample.clientHeight || rect.height)/rect.height);
            if(dragOrigin && Math.hypot(event.clientX-dragOrigin.x,event.clientY-dragOrigin.y)>=4){marker.dataset.state='dragging';path.setAttribute('d',CURSOR_PATHS.dragging);}
        };
        sample.addEventListener('pointerenter',move);sample.addEventListener('pointermove',move);
        sample.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragOrigin={x:event.clientX,y:event.clientY};sample.setPointerCapture?.(event.pointerId);move(event);});
        for(const type of ['pointerup','pointercancel','lostpointercapture'])sample.addEventListener(type,reset);
        sample.addEventListener('pointerleave',()=>{reset();delete sample.dataset.tracking;place(16,22);});
        const preview=()=>{name.textContent=input.value.trim() || this.i18n.self;form.style.setProperty('--collab-cursor-hue',slider.value);for(const button of swatches.children)button.setAttribute('aria-pressed',String(button.dataset.hue===slider.value));place(position.x,position.y);};
        input.addEventListener('input',preview);slider.addEventListener('input',preview);preview();
        const status=document.createElement('div');status.className='collab-profile-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
        const actions=document.createElement('div');actions.className='collab-name-actions';
        if(onCancel){const cancel=document.createElement('button');cancel.type='button';cancel.className='b3-button b3-button--cancel';cancel.textContent=this.i18n.cancel;cancel.addEventListener('click',onCancel);actions.append(cancel);}
        const save=document.createElement('button');save.type='submit';save.className='b3-button';save.textContent=this.i18n.save;actions.append(save);
        colorLabel.append(swatches,slider);form.append(label,colorLabel,sample,status,actions);
        form.addEventListener('submit',async event=>{
            event.preventDefault();if(save.disabled)return;save.disabled=true;status.textContent='';status.classList.remove('ft__error');
            try {
                await this.refreshOnline();if(this.stopped)return;
                this.updatePresence(await this.kernel.rpc.call.presenceRename(this.sessionId,input.value,this.generation,Number(slider.value)));
                status.textContent=this.i18n.profileSaved;onSaved?.();
            } catch {status.classList.add('ft__error');status.textContent=this.i18n.renameFailed;}
            finally {save.disabled=false;}
        });
        return form;
    }

    openRenameDialog() {
        if(this.renameDialog)return;
        const dialog=new Dialog({title:this.i18n.renameSelf,content:'<div class="b3-dialog__content collab-settings-content"></div>',width:'min(336px, calc(100vw - 32px))',destroyCallback:()=>{this.renameDialog=null;}});
        dialog.element.classList.add('collab-dialog');
        this.renameDialog=dialog;
        const form=this.createProfileForm(()=>dialog.destroy(),()=>dialog.destroy());
        dialog.element.querySelector('.b3-dialog__content').append(form);
        form.querySelector('input').focus();form.querySelector('input').select();
        dialog.element.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();dialog.destroy();}});
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
            const dialog=new Dialog({title:this.i18n.peopleTitle,content:'<div class="b3-dialog__content collab-people-content"></div>',width:'min(280px, calc(100vw - 32px))',destroyCallback:()=>{
                if(this.peopleDialog===dialog){this.peopleDialog=null;this.closePeople();}
            }});
            this.peopleDialog=dialog;
            dialog.element.classList.add('collab-dialog');
            const header=dialog.element.querySelector('.b3-dialog__header');header.classList.add('collab-people__header');header.textContent='';
            const title=document.createElement('span');title.className='collab-people__title';title.id=this.name+'-people-title';title.textContent=this.i18n.peopleTitle;
            const count=document.createElement('span');count.className='collab-people__count';count.id=this.name+'-people-count';
            const container=dialog.element.querySelector('.b3-dialog__container');container.setAttribute('aria-labelledby',title.id);container.setAttribute('aria-describedby',count.id);
            const close=document.createElement('button');close.type='button';close.className='block__icon block__icon--show collab-people__close';close.setAttribute('aria-label',this.i18n.close);close.title=this.i18n.close;
            close.innerHTML='<svg><use xlink:href="#iconClose"></use></svg>';
            close.addEventListener('mousedown',event=>event.stopPropagation());
            close.addEventListener('click',()=>this.closePeople());header.append(title,count,close);
            const list=document.createElement('div');list.className='collab-people__list';
            const actions=document.createElement('div');actions.className='collab-people__actions';
            for(const [label,action] of [[this.i18n.renameSelf,()=>this.openRenameDialog()],[this.i18n.cursorSettings,()=>this.openSetting()]]) {
                const button=document.createElement('button');button.type='button';button.className='b3-button b3-button--text';button.textContent=label;
                button.addEventListener('click',()=>{
                    if(this.stopped || this.peopleDialog!==dialog || this.renameDialog || this.tickDialog)return;
                    action();
                });actions.append(button);
            }
            panel.append(list,actions);dialog.element.querySelector('.b3-dialog__content').append(panel);
            this.peoplePanel=panel;this.peopleRows=new Map();
            this.topBar?.setAttribute('aria-expanded','true');
            dialog.element.addEventListener('keydown',(event)=>{if(event.key==='Escape'){this.closePeople();this.topBar?.focus?.();}});
            close.focus();
        }
        this.renderPeople();
        this.refreshInBackground();
    }

    closePeople() {
        const dialog=this.peopleDialog;this.peopleDialog=null;dialog?.destroy();
        this.peoplePanel=null;this.peopleRows?.clear();this.peopleEmpty=null;
        this.topBar?.setAttribute('aria-expanded','false');
        this.scheduleDocumentReport();
    }

    renderPeople() {
        if (!this.peoplePanel) return;
        const clients=this.clients.filter(client=>!this.peopleDocument || client.documentId===this.peopleDocument);
        const count=this.peopleDialog.element.querySelector('.collab-people__count');count.textContent=(this.peopleDocument ? this.i18n.documentViewers : this.i18n.onlineBadge).replace('${count}',String(this.onlineCount===null ? '—' : this.peopleDocument ? clients.length : this.onlineCount));count.title=count.textContent;
        const list=this.peoplePanel.querySelector('.collab-people__list'), visible=new Set();
        for(const client of clients) {
            const key=client.peerId || client.name;visible.add(key);
            let row=this.peopleRows.get(key);
            if(!row) {
                row=document.createElement('div');row.className='collab-person';
                const details=document.createElement('div');details.className='collab-person__details';
                const name=document.createElement('strong'),page=document.createElement('span');page.className='collab-person__page';details.append(name,page);
                for(const type of ['person-name','person-self']){const part=document.createElement('span');part.className='collab-'+type;part.setAttribute('data-type',type);name.append(part);}
                const follow=document.createElement('button');follow.type='button';follow.className='b3-button b3-button--text';follow.textContent=this.i18n.follow;
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
            row.querySelector('.collab-person-name').textContent=client.name;row.querySelector('strong').title=client.name;
            const self=row.querySelector('.collab-person-self');self.textContent=own ? this.i18n.self:'';self.hidden=!own;
            const page=row.querySelector('.collab-person__page');page.textContent=client.page?.title || (client.documentId ? this.i18n.pageDocument : this.i18n.pageWorkspace);page.title=page.textContent;
            row.querySelector('button').disabled=own || (!client.page && !client.documentId);
        }
        for(const [key,row] of this.peopleRows)if(!visible.has(key)){row.remove();this.peopleRows.delete(key);}
        if(!visible.size && !this.peopleEmpty){this.peopleEmpty=document.createElement('p');this.peopleEmpty.className='collab-people__empty';list.append(this.peopleEmpty);}
        if(this.peopleEmpty){this.peopleEmpty.textContent=this.onlineCount===null ? this.i18n.kernelFailed : this.i18n.peopleEmpty;if(visible.size){this.peopleEmpty.remove();this.peopleEmpty=null;}}
    }

    showShortcut(value) {
        if(this.stopped || document.hidden || !this.cursorLayer || !value || !validShortcut(value.keys) || typeof value.name!=='string' || value.name.length>48 || value.name===this.clientName || !this.clients.some((client)=>client.name===value.name))return;
        let notices=this.shortcutNotices.get(value.name);
        if(!notices){notices=new Set();this.shortcutNotices.set(value.name,notices);}
        const element=document.createElement('div');element.className='collab-shortcut';element.textContent=value.keys;
        element.style.setProperty('--collab-throw-distance',String(.75+Math.random()*.5));
        element.style.setProperty('--collab-throw-height',String(.8+Math.random()*.3));
        element.style.setProperty('--collab-throw-spin',String(.8+Math.random()*.4));
        const notice={element};notices.add(notice);
        notice.timer=setTimeout(()=>{element.remove();notices.delete(notice);if(!notices.size)this.shortcutNotices.delete(value.name);},850);
        this.scheduleCursorRender();
    }

    showClick(value) {
        if(this.stopped || document.hidden || Date.now()-this.presenceReceivedAt>=PRESENCE_TIMEOUT || !value || value.peerId===this.peerId ||
            !this.clients.some(client=>client.peerId===value.peerId && client.name===value.name && client.hue===value.hue) || !validCursor(value.cursor) || !value.cursor)return;
        const point=resolveCursor(value.cursor,this);
        if(point)this.drawClick(point,value.hue,value);
    }

    drawClick(point,hue,value) {
        if(!this.cursorLayer || document.hidden)return;
        if(this.clickEffects.size>=32){const [element,effect]=this.clickEffects.entries().next().value;clearTimeout(effect.timer);element.remove();this.clickEffects.delete(element);}
        const element=document.createElement('div');element.className='collab-click';element.setAttribute('aria-hidden','true');
        element.style.left=`${point.x}px`;element.style.top=`${point.y}px`;element.style.setProperty('--collab-cursor-hue',String(hue));
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-20 -20 40 40');
        for(let i=0;i<8;i++){
            const ray=document.createElementNS('http://www.w3.org/2000/svg','path');ray.setAttribute('d','M0 -9V-15');ray.setAttribute('transform',`rotate(${i*45})`);svg.append(ray);
        }
        element.append(svg);this.cursorLayer.append(element);
        const timer=setTimeout(()=>{element.remove();this.clickEffects.delete(element);},440);
        this.clickEffects.set(element,{timer,cursor:value?.cursor,peerId:value?.peerId});
    }

    clearClicks() {
        for(const [element,effect] of this.clickEffects){clearTimeout(effect.timer);element.remove();}this.clickEffects.clear();this.pendingClicks.length=0;
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
        this.stopInteractions?.();
        this.clearClicks();
        for(const binding of this.frameListeners.values())binding.stop();this.frameListeners.clear();
        this.closePeople();
        for(const notices of this.shortcutNotices.values())for(const notice of notices)clearTimeout(notice.timer);
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
        document.removeEventListener('click',rememberColorEditor,true);
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
        this.tickDialog?.destroy();
        document.querySelectorAll(".sy__file .collab-presence").forEach((row) => this.clearRow(row));
        this.eventBus.off("kernel-plugin-state-change", this.handleKernelState);
        this.eventBus.off("open-noneditableblock", this.handleRenderTarget);
        for (const event of EDITOR_EVENTS) this.eventBus.off(event, this.handleDocument);
        await Promise.allSettled([this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors), this.kernel.rpc.unbind("shortcut-shown", this.handleShortcut),this.kernel.rpc.unbind("pointer-clicked",this.handleClick)]);
        await this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation).catch(() => {});
    }
};
