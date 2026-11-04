const { Plugin, Menu, Dialog, Setting, showMessage, openTab, openSetting, getActiveTab, getAllTabs, getModelByDockType, globalCommand } = require("siyuan");
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

function editorDocumentId(editor) {
    return editor?.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id') ||
        editor?.closest('.backlinkList__item[data-node-id]')?.getAttribute('data-node-id');
}

function cursorTextRoot(block) {
    return block.querySelector('[contenteditable="true"]') || block;
}

function captureTextPoint(root, point) {
    const caret = document.caretPositionFromPoint?.(point.x, point.y);
    const range = caret ? null : document.caretRangeFromPoint?.(point.x, point.y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    if (node?.nodeType !== 3 || !root.contains(node)) return null;
    // 锚定鼠标下的字符，避免不同窗口宽度导致整段比例定位漂移。
    for (const index of [offset - 1, offset]) {
        if (index < 0 || index >= node.textContent.length || /\s/.test(node.textContent[index])) continue;
        const character = characterRect(node, index);
        if (!character || point.x < character.left || point.x > character.right || point.y < character.top || point.y > character.bottom) continue;
        const prefix = document.createRange();
        prefix.selectNodeContents(root);
        prefix.setEnd(node, index);
        return { offset: prefix.toString().length, x: (point.x - character.left) / character.width, y: (point.y - character.top) / character.height };
    }
    return null;
}

function captureDocumentCursor(point) {
    if (!point || document.hidden) return null;
    const block = document.elementFromPoint(point.x, point.y)?.closest('.protyle-wysiwyg [data-node-id]');
    if (!block || block.closest('.fn__none')) return null;
    const blockId = block.getAttribute('data-node-id');
    const documentId = editorDocumentId(block.closest('.protyle'));
    if (!DOCUMENT_ID.test(blockId) || !DOCUMENT_ID.test(documentId)) return null;
    const text = captureTextPoint(cursorTextRoot(block), point), region=cursorRegion(block);
    return text && region ? { surface:'document', documentId, blockId, x:text.x, y:text.y, text, region } : null;
}

function resolveDocumentCursor(cursor) {
    // Old row/block fractions can point at unrelated content after reflow.
    if (cursor.surface !== 'document' || !cursor.text) return null;
    const blocks = [...document.querySelectorAll(".protyle:not(.fn__none)")]
            .filter((editor) => !editor.closest(".fn__none") && editorDocumentId(editor) === cursor.documentId)
            .flatMap((editor) => [...editor.querySelectorAll(`.protyle-wysiwyg [data-node-id="${cursor.blockId}"]`)])
            .filter(block=>!block.closest('.fn__none') && matchesRegion(block,cursor.region));
    if(blocks.length!==1)return null;
    for (const block of blocks) {
        if (block.closest(".fn__none") || !matchesRegion(block,cursor.region)) continue;
        const character = characterAt(cursorTextRoot(block), cursor.text.offset);
        if (!character || /\s/.test(character.node.textContent[character.offset])) continue;
        const rect = characterRect(character.node, character.offset), relative = cursor.text;
        if (!rect?.width || !rect.height) continue;
        const x = rect.left + rect.width * relative.x;
        const y = rect.top + rect.height * relative.y;
        const hit = document.elementFromPoint(x, y);
        if (hit && block.contains(hit)) return { x, y };
    }
    return null;
}

function validCursor(cursor) {
    if(cursor?.region!==undefined && !validRegion(cursor.region))return false;
    if(cursor?.state!==undefined && !['editing','typing'].includes(cursor.state))return false;
    if (cursor?.surface === 'ui') return cursor.documentId === null && cursor.blockId === null && validPage(cursor.page) && validUIAnchor(cursor.ui) &&
        [cursor.x,cursor.y,cursor.screen?.x,cursor.screen?.y].every((value)=>Number.isFinite(value) && value>=0 && value<=1);
    if (cursor?.page !== undefined && (!validPage(cursor.page) || ![cursor.screen?.x,cursor.screen?.y].every((value)=>Number.isFinite(value) && value>=0 && value<=1))) return false;
    return cursor && ["document", "tree"].includes(cursor.surface) && typeof cursor.blockId === "string" && DOCUMENT_ID.test(cursor.blockId) &&
        (cursor.surface === "document" ? typeof cursor.documentId === "string" && DOCUMENT_ID.test(cursor.documentId) : cursor.documentId === null) &&
        [cursor.x, cursor.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
        (cursor.text === undefined || (cursor.surface === "document" && cursor.text && Number.isSafeInteger(cursor.text.offset) && cursor.text.offset >= 0 && cursor.text.offset <= 10000000 &&
            [cursor.text.x, cursor.text.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)));
}

function validSelection(selection) {
    return selection && (selection.region===undefined || validRegion(selection.region)) && typeof selection.documentId === "string" && DOCUMENT_ID.test(selection.documentId) &&
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
    const region=cursorRegion(editor);if(!region)return null;
    const value = { region, documentId: editorDocumentId(editor),
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
        if (editor.closest('.fn__none') || !matchesRegion(editor,selection.region) || editorDocumentId(editor) !== selection.documentId) continue;
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

function validEditing(editing) {
    return editing && (editing.region===undefined || validRegion(editing.region)) && [editing.documentId, editing.blockId].every((id) => typeof id === 'string' && DOCUMENT_ID.test(id));
}

function captureEditing() {
    if (document.hidden || !document.hasFocus?.()) return null;
    const active = document.activeElement;
    if (!active?.isContentEditable || !active.closest('.protyle-wysiwyg')) return null;
    const node = document.getSelection()?.focusNode;
    const element = node?.nodeType === 3 ? node.parentElement : node;
    const block = element?.closest?.('.protyle-wysiwyg [data-node-id]');
    if (!block || block.closest('.fn__none') || !active.contains(node)) return null;
    const editing = { blockId: block.getAttribute('data-node-id'),
        documentId: editorDocumentId(block.closest('.protyle')) };
    const region=cursorRegion(block);
    return validEditing(editing) && region ? {...editing,region}:null;
}
