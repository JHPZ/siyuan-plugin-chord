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
