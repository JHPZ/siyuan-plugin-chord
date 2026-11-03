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
