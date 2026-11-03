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
