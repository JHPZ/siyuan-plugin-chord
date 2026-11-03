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
