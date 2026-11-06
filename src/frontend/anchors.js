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

function visibleTextPoint(node, point) {
    const hit = componentVisualHit(document,point);
    if (!visibleElement(hit) || !hit.contains(node) || getComputedStyle(node.parentElement).visibility === 'hidden') return false;
    // An ancestor hit can still contain text that an inner scroller has clipped.
    for (let element = node.parentElement; element && element !== hit; element = element.parentElement) {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.opacity === '0') return false;
        const sx = rect.width / (element.offsetWidth || rect.width || 1), sy = rect.height / (element.offsetHeight || rect.height || 1);
        const left = rect.left + element.clientLeft * sx, top = rect.top + element.clientTop * sy;
        if (style.overflowX !== 'visible' && (point.x < left || point.x >= left + element.clientWidth * sx)) return false;
        if (style.overflowY !== 'visible' && (point.y < top || point.y >= top + element.clientHeight * sy)) return false;
    }
    return true;
}

function captureTextPoint(root, point, whitespace = false) {
    const caret = document.caretPositionFromPoint?.(point.x, point.y);
    const range = caret ? null : document.caretRangeFromPoint?.(point.x, point.y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    if (node?.nodeType !== 3 || !root.contains(node) || !visibleTextPoint(node, point)) return null;
    // 锚定鼠标下的字符，避免不同窗口宽度导致整段比例定位漂移。
    for (const index of [offset - 1, offset]) {
        if (index < 0 || index >= node.textContent.length || (!whitespace && /\s/.test(node.textContent[index]))) continue;
        const character = characterRect(node, index);
        if (!character || point.x < character.left || point.x > character.right || point.y < character.top || point.y > character.bottom) continue;
        const prefix = document.createRange();
        prefix.selectNodeContents(root);
        prefix.setEnd(node, index);
        return { offset: prefix.toString().length, x: (point.x - character.left) / character.width, y: (point.y - character.top) / character.height };
    }
    return null;
}

function documentColumn(editor, block = editor) {
    const rect = editor.getBoundingClientRect(), style = getComputedStyle(editor);
    const column = { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight) };
    for (let child = block; child && child !== editor; child = child.parentElement) {
        if (!child.parentElement?.matches('.sb[data-sb-layout="col"]')) continue;
        const bounds = child.getBoundingClientRect();
        column.left = Math.max(column.left, bounds.left);column.right = Math.min(column.right, bounds.right);
    }
    return column;
}

function captureDocumentSpace(editor, hit, point) {
    if (hit.closest('[contenteditable="false"],img,video,audio,canvas,iframe,button,input,select,textarea')) return null;
    let block = hit.closest('[data-node-id]');
    if (!block || block === editor || !editor.contains(block)) {
        // Only gaps between actual text blocks belong to document content.
        const candidates = [...editor.querySelectorAll('[contenteditable="true"]')]
            .filter(root => !root.closest('.fn__none'))
            .map(root => ({ root, rect: root.getBoundingClientRect() }))
            .filter(({ rect }) => rect.height > 0 && rect.width > 0);
        if (!candidates.length || point.y < Math.min(...candidates.map(({ rect }) => rect.top)) ||
            point.y > Math.max(...candidates.map(({ rect }) => rect.bottom))) return null;
        candidates.sort((a, b) => Math.max(a.rect.top - point.y, point.y - a.rect.bottom, 0) - Math.max(b.rect.top - point.y, point.y - b.rect.bottom, 0));
        block = candidates[0].root.closest('[data-node-id]');
    }
    if (!block || block.closest('.fn__none')) return null;
    const column = documentColumn(editor, block);
    if (point.x < column.left || point.x > column.right) return null;
    const root = cursorTextRoot(block);
    if (!root.matches('[contenteditable="true"]') || root.closest('[data-node-id]') !== block) return null;
    const caret = document.caretPositionFromPoint?.(point.x, point.y);
    const range = caret ? null : document.caretRangeFromPoint?.(point.x, point.y);
    const node = caret?.offsetNode || range?.startContainer, offset = caret?.offset ?? range?.startOffset;
    let index = point.y < root.getBoundingClientRect().top ? 0 : Math.max(0, root.textContent.length - 1);
    if (node?.nodeType === 3 && root.contains(node)) {
        const prefix = document.createRange();prefix.selectNodeContents(root);prefix.setEnd(node, offset);
        const candidates = [prefix.toString().length - 1, prefix.toString().length]
            .map(offset => ({ offset, character: characterAt(root, offset) }))
            .filter(({ offset, character }) => offset >= 0 && character)
            .map(({ offset, character }) => ({ offset, rect: characterRect(character.node, character.offset) }))
            .filter(({ rect }) => rect);
        candidates.sort((a, b) => Math.hypot(Math.max(a.rect.left - point.x, point.x - a.rect.right, 0), Math.max(a.rect.top - point.y, point.y - a.rect.bottom, 0)) -
            Math.hypot(Math.max(b.rect.left - point.x, point.x - b.rect.right, 0), Math.max(b.rect.top - point.y, point.y - b.rect.bottom, 0)));
        if (candidates.length) index = candidates[0].offset;
    }
    const character = characterAt(root, index);
    let rect = character ? characterRect(character.node, character.offset) : null;
    if (!rect && !/[^\s\u200b]/.test(root.textContent)) { rect = root.getBoundingClientRect();index = 0; }
    if (!rect?.height || !rect.width) return null;
    const style = getComputedStyle(root), font = parseFloat(style.fontSize), line = parseFloat(style.lineHeight) || font * 1.2;
    const side=point.x<rect.left ? 'before':point.x>rect.right ? 'after':'inside';
    const left=side==='before' ? column.left:side==='after' ? rect.right:rect.left;
    const right=side==='before' ? rect.left:side==='after' ? column.right:rect.right;
    const gap={side,ratio:(point.x-left)/(right-left)};
    if(point.y>=rect.top && point.y<=rect.bottom)gap.y=(point.y-rect.top)/rect.height;
    return { block, space: { offset: index, x: (point.x - column.left) / (column.right - column.left), y: (point.y - rect.top) / line, gap } };
}

function captureDocumentCursor(point) {
    if (!point || document.hidden) return null;
    const hit = componentVisualHit(document,point), editor = hit?.closest('.protyle-wysiwyg');
    if (!editor || !visibleElement(hit) || hit.closest('[data-type="NodeAttributeView"]')) return null;
    let block = hit.closest('.protyle-wysiwyg [data-node-id]');
    const text = block && captureTextPoint(cursorTextRoot(block), point, true);
    const blank = !text && captureDocumentSpace(editor, hit, point);
    if (blank) block = blank.block;
    if (!block || block.closest('.fn__none')) return null;
    const blockId = block.getAttribute('data-node-id');
    const documentId = editorDocumentId(block.closest('.protyle'));
    if (!DOCUMENT_ID.test(blockId) || !DOCUMENT_ID.test(documentId)) return null;
    const region = cursorRegion(block);
    return region && (text || blank) ? { surface:'document', documentId, blockId, x:text?.x ?? 0, y:text?.y ?? 0,
        ...(text ? { text } : { space: blank.space }), region } : null;
}

function resolveDocumentCursor(cursor) {
    // Old row/block fractions can point at unrelated content after reflow.
    if (cursor.surface !== 'document' || (!cursor.text && !cursor.space)) return null;
    const blocks = [...document.querySelectorAll(".protyle:not(.fn__none)")]
            .filter((editor) => !editor.closest(".fn__none") && editorDocumentId(editor) === cursor.documentId)
            .flatMap((editor) => [...editor.querySelectorAll(`.protyle-wysiwyg [data-node-id="${cursor.blockId}"]`)])
            .filter(block=>visibleElement(block) && matchesRegion(block,cursor.region));
    if(blocks.length!==1)return null;
    for (const block of blocks) {
        if (block.closest('.fn__none,[data-type="NodeAttributeView"]') || !matchesRegion(block,cursor.region)) continue;
        if (cursor.space) {
            const root = cursorTextRoot(block), relative = cursor.space;
            const character = characterAt(root, relative.offset);
            let rect = character ? characterRect(character.node, character.offset) : null;
            if (!rect && relative.offset === 0 && !/[^\s\u200b]/.test(root.textContent)) rect = root.getBoundingClientRect();
            if (!rect?.height || !rect.width) continue;
            const style = getComputedStyle(root), font = parseFloat(style.fontSize), line = parseFloat(style.lineHeight) || font * 1.2;
            const editor = block.closest('.protyle-wysiwyg'), column = documentColumn(editor, block);
            let x = column.left + (column.right - column.left) * relative.x;
            if(relative.gap){
                const {side,ratio}=relative.gap,left=side==='before' ? column.left:side==='after' ? rect.right:rect.left;
                const right=side==='before' ? rect.left:side==='after' ? column.right:rect.right;
                if(right<=left)continue;x=left+(right-left)*ratio;
            }
            const y = relative.gap?.y!==undefined ? rect.top+rect.height*relative.gap.y:rect.top+relative.y*line, hit = componentVisualHit(document,{x,y});
            if (visibleElement(hit) && hit.closest('.protyle-wysiwyg') === editor){
                if(relative.gap){
                    const hitBlock=hit.closest('.protyle-wysiwyg [data-node-id]');
                    if(hitBlock && hitBlock!==block || hit.closest('[contenteditable="false"],img,video,audio,canvas,iframe,button,input,select,textarea'))continue;
                    const blank=captureDocumentSpace(editor,root,{x,y});
                    if(blank?.block!==block || blank.space.offset!==relative.offset || blank.space.gap?.side!==relative.gap.side || captureTextPoint(root,{x,y},true))continue;
                }
                return { x, y };
            }
            continue;
        }
        const character = characterAt(cursorTextRoot(block), cursor.text.offset);
        if (!character) continue;
        const rect = characterRect(character.node, character.offset), relative = cursor.text;
        if (!rect?.width || !rect.height) continue;
        const x = rect.left + rect.width * relative.x;
        const y = rect.top + rect.height * relative.y;
        if (visibleTextPoint(character.node, {x,y})) return { x, y };
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
        (cursor.space === undefined || (cursor.surface === 'document' && cursor.text === undefined && validDocumentSpace(cursor.space))) &&
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

function captureEditing() {
    if (document.hidden || !document.hasFocus?.()) return null;
    const active = document.activeElement;
    if (!active?.isContentEditable || !active.closest('.protyle-wysiwyg')) return null;
    const node = document.getSelection()?.focusNode;
    const element = node?.nodeType === 3 ? node.parentElement : node;
    const root=active.closest('.protyle-wysiwyg');
    const selected=[...root.querySelectorAll('.protyle-wysiwyg--select[data-node-id]')]
        .filter(block=>!block.closest('.fn__none') && !block.parentElement.closest('.protyle-wysiwyg--select'));
    const block = selected.find(block=>block.contains(node)) || selected.at(-1) || element?.closest?.('.protyle-wysiwyg [data-node-id]');
    if (!block || block.closest('.fn__none') || !active.contains(node) && !selected.length) return null;
    const editing = { blockId: block.getAttribute('data-node-id'),
        documentId: editorDocumentId(block.closest('.protyle')),
        ...(selected.length>1 ? {blockIds:selected.map(block=>block.getAttribute('data-node-id'))}:{}) };
    const region=cursorRegion(block);
    return validEditing(editing) && region ? {...editing,region}:null;
}
