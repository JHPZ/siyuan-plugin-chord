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
