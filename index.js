// Generated from src/frontend by npm run compile.
const COLLAB_ID = /^\d{14}-[a-z0-9]{7}$/;
const PAGE_COMMANDS = ['fileTree', 'outline', 'bookmark', 'tag', 'inbox', 'backlinks', 'graphView', 'globalGraph', 'globalSearch', 'dataHistory', 'riffCard', 'mainMenu', 'recentDocs'];
const PAGE_CONTROLS = ['barCommand','barWorkspace','barPlugins','barMode','barRiffCard','statusHelp'];

function validDocumentSpace(space) {
    return space && (space.gap===undefined || space.gap && ['before','inside','after'].includes(space.gap.side) &&
        Number.isFinite(space.gap.ratio) && space.gap.ratio>=0 && space.gap.ratio<=1 &&
        (space.gap.y===undefined || Number.isFinite(space.gap.y) && space.gap.y>=0 && space.gap.y<=1)) && Number.isSafeInteger(space.offset) && space.offset >= 0 && space.offset <= 10000000 &&
        Number.isFinite(space.x) && space.x >= 0 && space.x <= 1 && Number.isFinite(space.y) && Math.abs(space.y) <= 1000;
}

function validRegion(region) {
    return region && typeof region.id==='string' && (region.kind==='document' ? COLLAB_ID.test(region.id) : region.kind==='dock' && /^[\w-]{1,160}$/.test(region.id));
}

function cleanRegion(region) {
    if(!validRegion(region))throw Error('Invalid region');
    return {kind:region.kind,id:region.id};
}

function validPage(page, depth = 0) {
    if (!page || depth > 2 || typeof page.title !== 'string' || page.title.length > 160) return false;
    if (page.kind === 'workspace') return true;
    if (['participants','chord-settings','chord-name'].includes(page.kind)) return true;
    if (page.kind === 'control') return PAGE_CONTROLS.includes(page.control);
    if (page.kind === 'dock') return typeof page.id === 'string' && /^[\w-]{1,160}$/.test(page.id);
    if (page.kind === 'settings') return typeof page.section === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(page.section);
    if (page.kind === 'document') return COLLAB_ID.test(page.id) && typeof page.id === 'string';
    if (page.kind === 'command') return PAGE_COMMANDS.includes(page.command);
    if (page.kind === 'asset') {
        if(typeof page.path!=='string' || page.path.length>=1024)return false;
        let path;
        try { path=decodeURIComponent(page.path); } catch { return false; }
        return path.startsWith('assets/') && !/[\\\u0000-\u001f]/.test(path) && !path.split('/').includes('..');
    }
    if (page.kind === 'custom') return typeof page.id === 'string' && /^[\w-]{1,160}$/.test(page.id) && typeof page.icon === 'string' && /^icon[\w-]{1,80}$/.test(page.icon);
    if (page.kind === 'dialog') return typeof page.key === 'string' && page.key.length <= 100 && validPage(page.base, depth + 1);
    return false;
}

function pageKey(page) {
    return JSON.stringify(page && [page.kind,page.section,page.id,page.command,page.control,page.path,page.key,page.base && pageKey(page.base)]);
}


function cleanPage(page) {
    if (!validPage(page)) throw new Error('Invalid page');
    const result={kind:page.kind,title:page.title};
    const fields={settings:['section'],document:['id'],dock:['id'],command:['command'],control:['control'],asset:['path'],custom:['id','icon'],dialog:['key']};
    for (const key of fields[page.kind] || []) result[key]=page[key];
    if (page.kind==='dialog') result.base=cleanPage(page.base);
    return result;
}
function validUIAnchor(value) {
    if(value?.version===3)return validComponentAnchor(value);
    if(!value || !Array.isArray(value.path) || value.path.length>12 || !value.path.every(index=>Number.isSafeInteger(index)&&index>=0&&index<=10000) || typeof value.tag!=='string' || !/^[a-z][a-z0-9-]{0,39}$/.test(value.tag))return false;
    if(value.version!==2)return ['settings','dialog','layout','toolbar','body'].includes(value.kind);
    if(!['file','document','id','dock','tab','tab-control','status','settings-nav','settings','dialog','panel','layout','toolbar','body'].includes(value.kind))return false;
    for(const field of ['id','key','value','label','classes'])if(value[field]!==undefined && (typeof value[field]!=='string' || value[field].length>512))return false;
    if(value.attribute!==undefined && !['id','data-type','data-name','data-id','data-node-id','data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.offset!==undefined && (!['file','document'].includes(value.kind) || !Number.isSafeInteger(value.offset) || value.offset<0 || value.offset>10000000))return false;
    if(value.kind==='file')return typeof value.id==='string' && COLLAB_ID.test(value.id) && typeof value.key==='string' && (value.key==='' || COLLAB_ID.test(value.key)) &&
        ['text','icon','toggle','switch','viewers','new','more-file','more-root'].includes(value.part) && (value.part==='text' ? value.offset!==undefined:value.offset===undefined);
    if(value.page!==undefined && !validPage(value.page))return false;
    if(value.kind==='document')return validPage(value.page) && value.page.kind==='document';
    if(value.kind==='status' && !['data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.kind==='tab')return validPage(value.page) && ['tab','label','icon','close'].includes(value.part);
    if(['id','dock','tab-control','status','settings-nav','panel'].includes(value.kind))return typeof value.id==='string' && value.id.length>0;
    return ['settings','layout','body'].includes(value.kind) ? validPage(value.page):true;
}

function cleanUIAnchor(value) {
    if(!validUIAnchor(value))throw Error('Invalid UI anchor');
    if(value.version===3)return cleanComponentAnchor(value);
    const result={kind:value.kind,path:[...value.path],tag:value.tag};
    for(const key of ['version','id','key','part','attribute','value','label','classes','offset'])if(value[key]!==undefined)result[key]=value[key];
    if(value.page!==undefined)result.page=cleanPage(value.page);
    return result;
}

function validComponentStep(step) {
    return step && typeof step.key==='string' && /^[a-f0-9]{16}$/.test(step.key) &&
        Number.isSafeInteger(step.count) && step.count>0 && step.count<=10000 &&
        Number.isSafeInteger(step.index) && step.index>=0 && step.index<step.count;
}

function validComponentRoute(route) {
    return Array.isArray(route) && route.length<=32 && route.every(validComponentStep);
}

function validComponentEdge(edge) {
    return edge && ['start','end'].includes(edge.side) && (edge.kind==='self' || edge.kind==='paint' || edge.kind==='image' || edge.kind==='list' || edge.kind==='list-first' || edge.kind==='list-last' || edge.kind==='frame' || edge.kind==='frame-box' ||
        edge.kind==='child' && validComponentStep(edge.step) ||
        edge.kind==='text' && Number.isSafeInteger(edge.offset) && edge.offset>=0 && edge.offset<=10000000);
}

function validComponentAnchor(value) {
    const scope=value.scope;
    return value.kind==='component' && scope && ['document','dock','dialog','floating','tab','global','av','calendar','tree'].includes(scope.kind) &&
        typeof scope.key==='string' && /^[a-f0-9]{16}$/.test(scope.key) &&
        (scope.kind!=='av' || [scope.row,scope.column].every(value=>typeof value==='string' && /^[a-f0-9]{16}$/.test(value))) &&
        (scope.group===undefined || scope.kind==='av' && typeof scope.group==='string' && /^[a-f0-9]{16}$/.test(scope.group)) &&
        (scope.part===undefined || scope.kind==='av' && typeof scope.group==='string' && ['header','footer','field','row-control','header-control','row','header-row','footer-row','group-title','group'].includes(scope.part)) &&
        (scope.pane===undefined || typeof scope.pane==='string' && /^[a-f0-9]{16}$/.test(scope.pane)) &&
        validComponentRoute(value.route) && (value.frame===undefined || validComponentRoute(value.frame)) && (value.target===undefined || validComponentRoute(value.target)) &&
        (value.frames===undefined || value.frame===undefined && Array.isArray(value.frames) && value.frames.length>=2 && value.frames.length<=8 && value.frames.every(validComponentRoute)) &&
        ['x','y'].every(axis=>Array.isArray(value.edges?.[axis]) && value.edges[axis].length===2 && value.edges[axis].every(validComponentEdge)) &&
        (value.textHash===undefined || typeof value.textHash==='string' && /^[a-f0-9]{16}$/.test(value.textHash)) &&
        (value.imagePoint===undefined || value.imagePoint && [value.imagePoint.x,value.imagePoint.y].every(number=>Number.isFinite(number) && number>=0 && number<=1)) &&
        (value.pdf===undefined || value.graph===undefined && value.frame===undefined && value.frames===undefined && value.imagePoint===undefined && value.pdf &&
            typeof value.pdf.file==='string' && /^[a-f0-9]{16}$/.test(value.pdf.file) &&
            ['page','thumbnail'].includes(value.pdf.part) &&
            Number.isSafeInteger(value.pdf.page) && value.pdf.page>0 && value.pdf.page<=100000 &&
            [value.pdf.x,value.pdf.y].every(number=>Number.isFinite(number) && Math.abs(number)<=10000000) &&
            (value.pdf.mark===null || typeof value.pdf.mark==='string' && /^[a-f0-9]{16}$/.test(value.pdf.mark))) &&
        (value.graph===undefined || value.frame===undefined && value.frames===undefined && value.graph &&
            (value.graph.node===null || typeof value.graph.node==='string' && /^[a-f0-9]{16}$/.test(value.graph.node)) &&
            typeof value.graph.layout==='string' && /^[a-f0-9]{16}$/.test(value.graph.layout) &&
            [value.graph.x,value.graph.y].every(number=>Number.isFinite(number) && Math.abs(number)<=10000000));
}

function cleanComponentAnchor(value) {
    const step=s=>({key:s.key,count:s.count,index:s.index});
    const edge=e=>({kind:e.kind,side:e.side,...(e.kind==='child' ? {step:step(e.step)}:e.kind==='text' ? {offset:e.offset}:{})});
    return {version:3,kind:'component',scope:{kind:value.scope.kind,key:value.scope.key,...(value.scope.pane ? {pane:value.scope.pane}:{}),...(value.scope.kind==='av' ? {row:value.scope.row,column:value.scope.column,...(value.scope.group ? {group:value.scope.group}:{}),...(value.scope.part ? {part:value.scope.part}:{})}:{})},
        route:value.route.map(step),...(value.frame ? {frame:value.frame.map(step)}:{}),...(value.target ? {target:value.target.map(step)}:{}),
        ...(value.frames ? {frames:value.frames.map(route=>route.map(step))}:{}),
        edges:{x:value.edges.x.map(edge),y:value.edges.y.map(edge)},...(value.textHash ? {textHash:value.textHash}:{}),
        ...(value.imagePoint ? {imagePoint:{x:value.imagePoint.x,y:value.imagePoint.y}}:{}),
        ...(value.graph ? {graph:{node:value.graph.node,layout:value.graph.layout,x:value.graph.x,y:value.graph.y}}:{}),
        ...(value.pdf ? {pdf:{file:value.pdf.file,page:value.pdf.page,part:value.pdf.part,x:value.pdf.x,y:value.pdf.y,mark:value.pdf.mark}}:{})};
}
function validShortcut(value) {
    return typeof value==='string' && value.length<=80 && /^(?:(?:Ctrl|Meta|Alt|Shift)\+){1,4}(?:[A-Z0-9]|F\d{1,2}|Arrow(?:Up|Down|Left|Right)|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|[+\-=,./;`\[\]\\])$/.test(value);
}

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

function captureTextPoint(root, point, whitespace = false) {
    const caret = document.caretPositionFromPoint?.(point.x, point.y);
    const range = caret ? null : document.caretRangeFromPoint?.(point.x, point.y);
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset;
    if (node?.nodeType !== 3 || !root.contains(node)) return null;
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

function documentColumn(editor) {
    const rect = editor.getBoundingClientRect(), style = getComputedStyle(editor);
    return { left: rect.left + parseFloat(style.paddingLeft), right: rect.right - parseFloat(style.paddingRight) };
}

function captureDocumentSpace(editor, hit, point) {
    if (hit.closest('[contenteditable="false"],img,video,audio,canvas,iframe,button,input,select,textarea')) return null;
    const column = documentColumn(editor);
    if (point.x < column.left || point.x > column.right) return null;
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
    const root = cursorTextRoot(block);
    if (!root.matches('[contenteditable="true"]')) return null;
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
    const hit = document.elementFromPoint(point.x, point.y), editor = hit?.closest('.protyle-wysiwyg');
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
            const editor = block.closest('.protyle-wysiwyg'), column = documentColumn(editor);
            let x = column.left + (column.right - column.left) * relative.x;
            if(relative.gap){
                const {side,ratio}=relative.gap,left=side==='before' ? column.left:side==='after' ? rect.right:rect.left;
                const right=side==='before' ? rect.left:side==='after' ? column.right:rect.right;
                if(right<=left)continue;x=left+(right-left)*ratio;
            }
            const y = relative.gap?.y!==undefined ? rect.top+rect.height*relative.gap.y:rect.top+relative.y*line, hit = document.elementFromPoint(x, y);
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
        const hit = document.elementFromPoint(x, y);
        if (visibleElement(hit) && block.contains(hit)) return { x, y };
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

function graphModels() {
    // shortcut: native graph internals are checked at runtime; use a public coordinate API when SiYuan exposes one.
    const models=[];
    try{models.push(...getAllTabs().map(tab=>tab.model));}catch{}
    for(const item of document.querySelectorAll('.dock__item[data-type]'))try{models.push(getModelByDockType(item.getAttribute('data-type')));}catch{}
    return [...new Set(models)].filter(model=>{
        const engine=model?.graphEngine;
        return engine?.container?.isConnected && visibleElement(engine.container) && !engine.destroyed && Array.isArray(engine.data?.nodes) && engine.data.sizes?.length===engine.data.nodes.length &&
            engine.positions?.length===engine.data.nodes.length*2 && typeof engine.hitTest==='function' &&
            [engine.camera?.x,engine.camera?.y,engine.camera?.scale].every(Number.isFinite) && engine.camera.scale>0;
    });
}

function graphContext(model) {
    return model?.graphEngine ? JSON.stringify([model.type,model.blockId,model.rootId,model.notebookId]):'';
}

function graphModel(element) {
    return graphModels().find(model=>model.graphEngine.container.contains(element));
}

const graphLayouts=new WeakMap();
function graphLayout(engine) {
    const previous=graphLayouts.get(engine);
    if(previous?.data===engine.data && previous.positions===engine.positions && previous.version===engine.positionVersion)return previous.key;
    const key=componentHash(JSON.stringify(engine.data.nodes.map((node,index)=>[node.id,engine.positions[index*2],engine.positions[index*2+1],engine.data.sizes[index]])));
    graphLayouts.set(engine,{data:engine.data,positions:engine.positions,version:engine.positionVersion,key});return key;
}

function captureGraph(element,point) {
    const model=graphModel(element);if(!model)return null;
    const engine=model.graphEngine,rect=engine.container.getBoundingClientRect(),x=point.x-rect.left,y=point.y-rect.top;
    const index=engine.hitTest(x,y),node=engine.data.nodes[index],camera=engine.camera;
    const size=node ? engine.data.sizes[index]:1;if(!(size>0))return null;
    return {node:node ? componentHash(String(node.id)):null,layout:graphLayout(engine),
        x:((x-camera.x)/camera.scale-(node ? engine.positions[index*2]:0))/size,
        y:((y-camera.y)/camera.scale-(node ? engine.positions[index*2+1]:0))/size};
}

function resolveGraph(element,anchor) {
    const model=graphModel(element);if(!model)return null;
    const engine=model.graphEngine,camera=engine.camera;
    let index=-1;
    if(anchor.node){
        const matches=engine.data.nodes.map((node,index)=>({key:componentHash(String(node.id)),index})).filter(node=>node.key===anchor.node);
        if(matches.length!==1)return null;index=matches[0].index;
    }else if(graphLayout(engine)!==anchor.layout)return null;
    const size=index>=0 ? engine.data.sizes[index]:1;
    const x=((index>=0 ? engine.positions[index*2]:0)+anchor.x*size)*camera.scale+camera.x;
    const y=((index>=0 ? engine.positions[index*2+1]:0)+anchor.y*size)*camera.scale+camera.y;
    if(engine.hitTest(x,y)!==index)return null;
    const rect=engine.container.getBoundingClientRect(),point={x:rect.left+x,y:rect.top+y};
    return document.elementFromPoint(point.x,point.y)===element ? point:null;
}

function pdfModel(element) {
    // shortcut: native PDF.js views are checked at runtime; use a public page coordinate API when SiYuan exposes one.
    let tabs;try{tabs=getAllTabs();}catch{return null;}
    return tabs.map(tab=>tab.model).find(model=>model?.element?.contains(element) &&
        typeof model.pdfObject?.pdfDocument?.fingerprints?.[0]==='string' && typeof model.pdfObject.pdfViewer?.getPageView==='function');
}

function pdfMark(element) {
    const mark=element?.closest('.pdf__rect[data-node-id],[data-annotation-id]');
    return mark ? componentHash(mark.getAttribute('data-node-id') || mark.getAttribute('data-annotation-id')):null;
}

function pdfView(model,page,part) {
    if(!Number.isSafeInteger(page) || page<1 || page>model?.pdfObject?.pdfDocument?.numPages)return null;
    const view=part==='thumbnail' ? model?.pdfObject?.pdfThumbnailViewer?.getThumbnail?.(page-1):model?.pdfObject?.pdfViewer?.getPageView(page-1),viewport=view?.viewport;
    const element=part==='thumbnail' ? view?.image:view?.canvas;
    return view?.div?.isConnected && element?.isConnected && visibleElement(element) &&
        [viewport?.width,viewport?.height].every(value=>Number.isFinite(value)&&value>0) &&
        typeof viewport.convertToPdfPoint==='function' && typeof viewport.convertToViewportPoint==='function' ? {div:view.div,viewport,element}:null;
}

function capturePDF(hit,plugin,point) {
    const pageElement=hit.closest('.pdfViewer .page[data-page-number],.thumbnail[data-page-number]');if(!pageElement)return undefined;
    const model=pdfModel(pageElement);if(!model)return undefined;
    const page=Number(pageElement.dataset.pageNumber),part=pageElement.matches('.thumbnail') ? 'thumbnail':'page',view=pdfView(model,page,part);
    if(!view || view.div!==pageElement)return part==='thumbnail' ? undefined:null;
    const scope=componentScope(model.element,plugin);if(!scope)return null;
    const rect=view.element.getBoundingClientRect();
    if(point.x<rect.left || point.x>rect.right || point.y<rect.top || point.y>rect.bottom)return undefined;
    const [x,y]=view.viewport.convertToPdfPoint((point.x-rect.left)*view.viewport.width/rect.width,(point.y-rect.top)*view.viewport.height/rect.height);
    const ui={version:3,kind:'component',scope:scope.scope,route:componentRoute(scope.root,model.element),
        edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:[{kind:'self',side:'start'},{kind:'self',side:'end'}]},
        pdf:{file:componentHash(model.pdfObject.pdfDocument.fingerprints[0]),page,part,x,y,mark:pdfMark(hit)}};
    return validUIAnchor(ui) ? {ui,x:0,y:0}:null;
}

function resolvePDF(element,anchor) {
    const model=pdfModel(element);
    if(!model || componentHash(model.pdfObject.pdfDocument.fingerprints[0])!==anchor.file)return null;
    const view=pdfView(model,anchor.page,anchor.part);if(!view)return null;
    const [x,y]=view.viewport.convertToViewportPoint(anchor.x,anchor.y),rect=view.element.getBoundingClientRect();
    if(x<0 || x>view.viewport.width || y<0 || y>view.viewport.height)return null;
    const point={x:rect.left+x*rect.width/view.viewport.width,y:rect.top+y*rect.height/view.viewport.height};
    const hit=document.elementFromPoint(point.x,point.y);
    return visibleElement(hit) && hit.closest('.page[data-page-number],.thumbnail[data-page-number]')===view.div && pdfMark(hit)===anchor.mark ? point:null;
}

// Component identities are bounded hashes; input values and document text never enter the wire format.
const COMPONENT_HIGHLIGHT_TEXT='.protyle-hint .b3-list-item__text,.search__list .b3-list-item__text,.search__list .b3-list-item__meta,.search__list [data-av-search-match],.search__list .search__av-content > .fn__code,#searchAssetPreview > p';
function componentHit(doc,point) {
    const hit=doc.elementFromPoint(point.x,point.y),item=hit?.matches('input.b3-form__upload[type="file"]') && hit.closest('.b3-menu__item');
    if(!item || hit.closest('[data-private]') || Number(doc.defaultView.getComputedStyle(hit).opacity)>.01)return hit;
    return doc.elementsFromPoint(point.x,point.y).find(element=>element!==hit && item.contains(element) && visibleElement(element)) || null;
}

function componentHash(value) {
    let a=2166136261,b=5381;
    for(let index=0;index<value.length;index++){const code=value.charCodeAt(index);a=Math.imul(a^code,16777619);b=Math.imul(b,33)^code;}
    return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}

function componentChildren(element) {
    return [...element.children].filter(child=>{
        if(child.matches('style,script,.collab-cursor-layer,.collab-editing-layer,.collab-presence-users,.fn__none,[hidden]'))return false;
        if(element.matches(COMPONENT_HIGHLIGHT_TEXT) && child.matches('mark'))return false;
        const style=child.ownerDocument.defaultView.getComputedStyle(child);
        // Transparent controls still occupy space and remain stable references for surrounding gaps.
        return style.display!=='none' && !(child.matches('.b3-menu__item input.b3-form__upload[type="file"]') && Number(style.opacity)<=.01);
    });
}

function componentListRect(element,part) {
    if(element.matches('.backlinkList__item') && componentBacklinkContext(element)){const row=element.querySelector(':scope > li'),rect=row?.getBoundingClientRect();return rect?.width && rect.height ? rect:null;}
    const panel=element.matches('.sy__backlink--bottom') && componentBacklinkContext(element),backlink=element.matches('.b3-list') && element.parentElement?.matches('.backlinkList,.backlinkMList') && componentBacklinkContext(element),tree=element.matches('ul') && element.closest('.sy__tag,.sy__bookmark,.sy__outline'),children=(panel || tree || element.matches('.b3-list')) && componentChildren(element);
    if(!children?.length || !panel && (!children.some(child=>child.matches(backlink ? '.backlinkList__item':'.b3-list-item')) || children.some(child=>!child.matches(tree ? 'li[data-treetype],ul':backlink ? '.backlinkList__item':'.b3-list-item,.b3-menu__separator'))))return null;
    const items=tree ? [...element.querySelectorAll('li[data-treetype]')]:children;
    let rects=items.map(child=>child.getBoundingClientRect()).filter(rect=>rect.width>0 && rect.height>0);
    if(part && rects.length){rects.sort((a,b)=>a.top-b.top || a.left-b.left);rects=[part==='first' ? rects[0]:rects.at(-1)];}
    return rects.length ? {left:Math.min(...rects.map(rect=>rect.left)),right:Math.max(...rects.map(rect=>rect.right)),top:Math.min(...rects.map(rect=>rect.top)),bottom:Math.max(...rects.map(rect=>rect.bottom))}:null;
}

function componentSearchField(element) {
    const label=element.closest('.search__list .search__av-content > .fn__code'),field=element.closest('.search__list [data-av-search-match]') || label?.nextElementSibling;
    if(!field)return label ? null:undefined;
    if(!field.matches('[data-av-search-match]'))return null;
    try{const {itemID,keyID}=JSON.parse(field.getAttribute('data-av-search-match'));return [itemID,keyID].every(value=>DOCUMENT_ID.test(value || '')) ? [itemID,keyID]:null;}catch{return null;}
}

function componentAssetPath(element) {
    const preview=element.closest('#searchAssetPreview'),item=element.closest('#searchAssetList [data-type="search-item"]');
    if(!preview && !item)return undefined;
    const panel=(preview || item).closest('#searchAssets'),list=panel?.querySelector('#searchAssetList');if(!list)return null;
    const selected=preview ? [...list.querySelectorAll('.b3-list-item--focus[data-type="search-item"]')]:[item];
    if(selected.length!==1 || !visibleElement(selected[0]) || !DOCUMENT_ID.test(selected[0].getAttribute('data-id') || ''))return null;
    const labels=selected[0].querySelectorAll('.b3-list-item__meta[aria-label]'),path=labels.length===1 && labels[0].getAttribute('aria-label');
    if(!path || !path.startsWith('assets/') || path.length>8192 || /[\x00-\x1f]/.test(path))return null;
    return [...list.querySelectorAll('[data-type="search-item"] .b3-list-item__meta[aria-label]')].filter(e=>e.getAttribute('aria-label')===path).length===1 ? path:null;
}

function componentKey(element) {
    const thumbnailImage=element.matches('.thumbnail img') && pdfModel(element);
    const attributes=['data-node-id','data-command-id','data-url','data-name','data-type','data-subtype','data-page-number','data-annotation-id','data-statusbar-entry','data-topbar-entry','role','type','name','href','src','d','points','viewBox'];
    const values=attributes.filter(name=>name!=='src' || !thumbnailImage).map(name=>[name,element.getAttribute(name)]).filter(([,value])=>value).map(([name,value])=>[name,componentHash(value)]);
    if(element.matches('#searchAssetPreview,#searchAssetList [data-type="search-item"]'))values.push(['asset',componentHash(componentAssetPath(element) || '')]);
    if(element.matches('.search__list [data-av-search-match],.search__list .search__av-content > .fn__code'))values.push(['search-field',componentHash(JSON.stringify(componentSearchField(element)))]);
    const tree=componentTreeRegion(element);
    if(tree?.root===element)values.push(['tree',componentHash(JSON.stringify(tree.identity))]);
    if(element.matches('.b3-menu__separator')){
        const siblings=componentChildren(element.parentElement),index=siblings.indexOf(element),before=siblings.slice(0,index).reverse().find(item=>item.matches('.b3-menu__item')),after=siblings.slice(index+1).find(item=>item.matches('.b3-menu__item'));
        values.push(['between',[before ? componentKey(before):'',after ? componentKey(after):''].sort()]);
    }else if(element.matches('.b3-menu__item[data-id],.b3-menu .b3-list-item[data-type="saved"][data-id]'))values.push(['menu-action',componentHash(element.getAttribute('data-id'))]);
    if(element.matches('.protyle-hint .b3-list-item')){
        const result=element.querySelector(':scope > .b3-list-item__first[data-node-id]')?.getAttribute('data-node-id'),value=result || element.getAttribute('data-value');
        if(value)values.push(['hint',componentHash(value)]);
    }
    if(element.closest('[data-type="NodeAttributeView"]')){
        for(const name of ['data-av-id','data-av-type','data-col-id','data-field-id','data-group-id','data-id']){const value=element.getAttribute(name);if(value)values.push([name,componentHash(value)]);}
        for(const name of ['data-calendar-action','data-calendar-day','data-calendar-week','data-calendar-add','data-calendar-item','data-calendar-resize','data-calendar-move','data-calendar-undated-toggle','data-calendar-undated-row','data-calendar-undated-open']){
            const value=element.getAttribute(name);if(value!==null)values.push([name,componentHash(['data-calendar-day','data-calendar-week','data-calendar-add'].includes(name) ? componentCalendarDate(value):value)]);
        }
        if(element.matches('.av__colsticky,.av__gallery-field'))values.push(['fields',[...element.querySelectorAll('[data-col-id],[data-field-id]')].map(cell=>cell.getAttribute('data-col-id') || cell.getAttribute('data-field-id')).sort().join('|')]);
        if(element.matches('.av__gallery-cover,.av__gallery-img')){
            const image=element.matches('img') ? element:element.querySelector('img');
            if(image)values.push(['cover',image.getAttribute('src'),image.style.background]);
        }
    }
    if(element.matches('img') && !thumbnailImage)values.push(['intrinsic',element.naturalWidth+','+element.naturalHeight]);
    const dialogTitle=/^dialog-title-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(element.id) && element.matches('.b3-dialog__header') && element.closest('.b3-dialog')?.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')===element.id;
    if(element.id && !/^\d{14}-/.test(element.id) && !dialogTitle)values.push(['id',element.id]);
    if(element.matches('[data-type="tab-header"]'))values.push(['page',pageKey(tabPage(element))]);
    if(element.matches('.protyle'))values.push(['document',editorDocumentId(element)]);
    if(element.matches('.layout__wnd,[data-type="wnd"]'))values.push(['pane',componentPane(element)]);
    if(element.matches('.layout__resize')){
        const neighbour=node=>{
            if(!node)return '';
            if(node.matches('.layout__dockl,.layout__dockr,.layout__dockb'))return uiClasses(node);
            const pages=[...node.querySelectorAll('[data-type="tab-header"]')].map(head=>pageKey(tabPage(head))).sort();
            const ids=[...node.querySelectorAll('.protyle-background[data-node-id]')].map(editor=>editor.getAttribute('data-node-id')).sort();
            return pages.length || ids.length ? JSON.stringify([pages,ids]):uiClasses(node);
        };
        values.push(['between',[neighbour(element.previousElementSibling),neighbour(element.nextElementSibling)].sort()]);
    }
    const privateText=element.closest('input,textarea,[contenteditable],[data-private]');
    const label=!privateText && !values.length && !(element.matches('.counter') && (tree || element.closest('.search__list'))) ? (element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length || element.matches('.b3-list-item,.b3-menu__item') || element.matches(COMPONENT_HIGHLIGHT_TEXT) ? textLabel(element):'')):'';
    const classes=[...new Set([...element.classList].filter(name=>!/^collab-|^ariaLabel$|^fn__none$|^b3-menu__item--(?:current|show|group-first|group-last)$|^b3-list-item__arrow--open$/.test(name) && !(name==='selected' && element.matches('.thumbnail'))).map(name=>name.replace(/--(?:focus|active|selected|hover)$/,'')))].sort().join(' ');
    return componentHash(JSON.stringify([element.tagName.toLowerCase(),classes,values,label]));
}

function componentPane(element) {
    const wnd=element.closest('.layout__wnd,[data-type="wnd"]');
    return wnd ? [...wnd.querySelectorAll('[data-type="tab-header"]')].map(head=>pageKey(tabPage(head))).sort().join('|'):'';
}

function componentStep(element) {
    const key=componentKey(element),siblings=componentChildren(element.parentElement).filter(child=>componentKey(child)===key);
    return {key,count:siblings.length,index:siblings.indexOf(element)};
}

function componentChild(parent,step) {
    const children=componentChildren(parent).filter(child=>componentKey(child)===step.key);
    return children.length===step.count ? children[step.index]:null;
}

function componentRoute(root,element) {
    const route=[];
    for(let node=element;node!==root;node=node.parentElement){
        if(!node?.parentElement || route.length>=32)return null;
        route.unshift(componentStep(node));
    }
    return route;
}

function componentFollow(root,route) {
    for(const step of route){root=componentChild(root,step);if(!root)return null;}
    return root;
}

const COMPONENT_FLOATING='.b3-menu,.block__popover,.protyle-hint,.tooltip,.b3-tooltip';
const COMPONENT_AV_REGIONS='.av__cell[data-col-id],.av__cell[data-field-id],.av__calc[data-col-id],.av__gallery-field,.av__firstcol,.av__row[data-id],.av__gallery-item[data-id],.av__row--header,.av__row--footer,.av__group-title,.av__body[data-group-id]';
const COMPONENT_CALENDAR_REGIONS='.av__calendar,.av__calendar-day,.av__calendar-week,.av__calendar-week-row,.av__calendar-week-number,.av__calendar-days,.av__calendar-events,.av__calendar-weekdays > div,.av__calendar-item,.av__calendar-field,.av__calendar-undated-item[data-calendar-undated-row]';

function componentBacklinkContext(element) {
    const panel=element.closest('.sy__backlink,.sy__backlink--bottom');if(!panel)return null;
    let model;try{model=getModelByDockType('backlink');}catch{}
    if(model?.element!==panel){try{model=getAllTabs().flatMap(tab=>[tab.model,tab.model?.backlink]).find(item=>item?.element===panel);}catch{model=null;}}
    const section=element.closest('.backlinkList,.backlinkMList'),mention=!!element.closest('.backlinkMList,.backlinkMList__header');
    return {panel,section,identity:DOCUMENT_ID.test(model?.blockId || '') ? [model.type,model.blockId,mention ? 'mention':'backlink']:null};
}

function componentTextHash(element) {
    if(element.matches('#searchAssetPreview,#searchAssetPreview > p'))return componentHash(element.innerText);
    const text=element.matches('.block__logo--counter') && element.closest('.sy__backlink,.sy__backlink--bottom') ? [...element.childNodes].filter(node=>node.nodeType!==1 || !node.matches('.counter')).map(node=>node.textContent).join(''):element.textContent;
    return componentHash(text);
}

function componentTreeRegion(element) {
    const backlink=componentBacklinkContext(element);
    if(backlink){
        const {panel,section,identity}=backlink,item=element.closest('.backlinkList__item[data-node-id]'),row=element.closest('.backlinkList__item > li[data-node-id]'),counter=element.closest('.backlinkList__header .counter,.backlinkMList__header .counter');
        if(counter)return {panel,root:counter,identity:['backlink','counter',element.closest('.backlinkMList__header') ? 'mention':'backlink']};
        const root=row || item || section;if(!root)return null;
        return {panel,root,identity:identity ? ['backlink',...identity,row ? 'row':item ? 'item':'section',(row || item)?.getAttribute('data-node-id') || '']:null};
    }
    const panel=element.closest('.sy__tag,.sy__bookmark,.sy__outline');if(!panel)return null;
    const root=element.closest('li[data-treetype],ul'),branch=root?.matches('ul');
    const row=branch ? root.previousElementSibling:root;
    if(!row?.matches('li[data-treetype]') || !panel.contains(row)){
        if(!panel.matches('.sy__outline'))return null;
        let model;try{model=getModelByDockType('outline');}catch{}
        if(model?.parent?.panelElement!==panel){try{model=getAllTabs().map(tab=>tab.model).find(item=>item?.parent?.panelElement===panel);}catch{model=null;}}
        const title=panel.querySelector(':scope > .b3-list-item'),content=title?.nextElementSibling;
        const root=title?.contains(element) ? title:content?.contains(element) ? content:null;
        return root ? {panel,root,identity:model?.parent?.panelElement===panel && DOCUMENT_ID.test(model.blockId || '') ? ['outline','document',model.blockId,root===title ? 'title':'content']:null}:null;
    }
    const kind=row.getAttribute('data-treetype'),attribute=kind==='tag' ? 'data-label':kind==='outline' ? 'data-node-id':kind==='bookmark' ? row.hasAttribute('data-node-id') ? 'data-node-id':'data-bookmark':null;
    const value=attribute && row.getAttribute(attribute);if(!value)return null;
    return {panel,root,identity:[kind,attribute,value,branch ? 'branch':'row']};
}

function componentTreeScope(region,plugin) {
    if(!region.identity)return null;
    const base=componentScope(region.panel,plugin);
    return base ? {kind:'tree',key:componentHash(JSON.stringify([base.scope.kind,base.scope.key,...region.identity]))}:null;
}

function componentCalendarDate(value) {
    if(!/^-?\d{1,16}$/.test(value || ''))return '';
    const date=new Date(+value);
    return Number.isFinite(date.getTime()) ? [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-'):'';
}

function componentCalendarRegion(element) {
    const calendar=element.closest('.av__calendar'),av=calendar?.closest('[data-type="NodeAttributeView"]');if(!av)return null;
    const root=element.closest(COMPONENT_CALENDAR_REGIONS);if(!root || !calendar.contains(root))return null;
    const view=av.querySelector('.av__header[data-current-view-id]')?.getAttribute('data-current-view-id');
    if(!DOCUMENT_ID.test(view || ''))return null;
    const week=root.closest('.av__calendar-week') || root.closest('.av__calendar-week-row')?.querySelector('.av__calendar-week');
    const segment=week ? componentCalendarDate(week.getAttribute('data-calendar-week')):'undated';
    const item=root.closest('.av__calendar-item,.av__calendar-undated-item');let identity;
    if(item){
        const row=item.getAttribute('data-calendar-item') || item.getAttribute('data-calendar-undated-row') || item.getAttribute('data-id'),field=root.matches('.av__calendar-field') ? root.getAttribute('data-field-id') || root.getAttribute('data-col-id'):'';
        if(!DOCUMENT_ID.test(row || '') || field && !DOCUMENT_ID.test(field) || !segment)return null;
        identity=['event',row,segment,field];
    }else if(root.matches('.av__calendar-day')){
        const date=componentCalendarDate(root.getAttribute('data-calendar-day'));if(!date)return null;identity=['date',date];
    }else if(root.parentElement?.matches('.av__calendar-weekdays') && !root.matches('.av__calendar-week-label')){
        const days=[...calendar.querySelectorAll('[data-calendar-day]')].map(day=>+day.getAttribute('data-calendar-day')).filter(Number.isFinite);
        const index=[...root.parentElement.children].filter(child=>!child.matches('.av__calendar-week-label')).indexOf(root);
        if(!days.length || index<0 || index>6)return null;
        identity=['weekday',(new Date(Math.min(...days)).getDay()+index)%7];
    }else if(week){if(!segment)return null;identity=[root.className.split(' ').find(name=>/^av__calendar-(week|week-row|week-number|days|events)$/.test(name)),segment];}
    else identity=[root.matches('.av__calendar-week-label') ? 'week-label':'calendar'];
    return {av,root,identity:[view,...identity]};
}

function componentCalendarScope(region,plugin) {
    if(![region.av.getAttribute('data-node-id'),region.av.getAttribute('data-av-id')].every(value=>DOCUMENT_ID.test(value || '')))return null;
    const base=componentAVScope(region.av,plugin);
    return base ? {kind:'calendar',key:componentHash(JSON.stringify([base.key,...region.identity])),...(base.pane ? {pane:base.pane}:{})}:null;
}

function componentAVRegion(element) {
    const av=element.closest('[data-type="NodeAttributeView"]');if(!av || element===av)return null;
    const cell=element.closest('.av__cell[data-col-id],.av__cell[data-field-id],.av__calc[data-col-id]');
    const row=element.closest('.av__row[data-id],.av__gallery-item[data-id]'),field=element.closest('.av__gallery-field');
    const first=element.closest('.av__firstcol'),header=element.closest('.av__row--header'),footer=element.closest('.av__row--footer');
    const title=element.closest('.av__group-title'),body=element.closest('.av__body[data-group-id]');
    let root,part,column=cell?.getAttribute('data-col-id') || cell?.getAttribute('data-field-id') || '';
    if(cell && row){root=cell;part='cell';}
    else if(cell?.matches('.av__cell--header')){root=cell;part='header';}
    else if(cell?.matches('.av__calc')){root=cell;part='footer';}
    else if(field && row){root=field;part='field';column=field.querySelector('[data-field-id]')?.getAttribute('data-field-id') || '';}
    else if(first && (row || header)){root=first;part=row ? 'row-control':'header-control';}
    else if(row){root=row;part='row';}
    else if(header){root=header;part='header-row';}
    else if(footer){root=footer;part='footer-row';}
    else if(title){root=title;part='group-title';}
    else if(body){root=body;part='group';}
    if(!root || root.closest('[data-type="NodeAttributeView"]')!==av)return null;
    const group=title ? title.querySelector('[data-type="av-group-fold"][data-id]')?.getAttribute('data-id') || title.closest('.av__kanban-group[data-group-id]')?.getAttribute('data-group-id'):body?.getAttribute('data-group-id');
    return {av,root,part,row:row?.getAttribute('data-id') || '',column,group:group || ''};
}

function componentAVScope(av,plugin) {
    const base=componentScope(av,plugin);if(!base)return null;
    return {kind:'av',key:componentHash(JSON.stringify([base.scope.kind,base.scope.key,av.getAttribute('data-node-id'),av.getAttribute('data-av-id')])),...(base.scope.pane ? {pane:base.scope.pane}:{})};
}

function componentScope(element,plugin) {
    const make=(root,kind,key)=>({root,scope:{kind,key:componentHash(key),...(kind==='document' ? {pane:componentHash(componentPane(root))}:{})}});
    const tree=componentTreeRegion(element);
    if(tree){const scope=componentTreeScope(tree,plugin);return scope ? {root:tree.root,scope}:null;}
    const calendar=componentCalendarRegion(element);
    if(calendar){const scope=componentCalendarScope(calendar,plugin);return scope ? {root:calendar.root,scope}:null;}
    const region=componentAVRegion(element);
    if(region){
        const {av,root,part,row,column,group}=region;
        if(![av.getAttribute('data-node-id'),av.getAttribute('data-av-id')].every(value=>DOCUMENT_ID.test(value || '')) ||
            [row,column,group].some(value=>value && !DOCUMENT_ID.test(value)) ||
            ['cell','field'].includes(part) && (!row || !column) || ['header','footer'].includes(part) && !column || part==='group-title' && !group)return null;
        const scope=componentAVScope(av,plugin);
        return scope ? {root,scope:{...scope,row:componentHash(part==='cell' ? row:'@'+part+'|'+row),column:componentHash(column || '@'+part),group:componentHash(group),...(part==='cell' ? {}:{part})}}:null;
    }
    const dialog=element.closest('.b3-dialog');
    if(dialog)return make(dialog,'dialog',(dialog.getAttribute('data-key') || dialog.parentElement?.getAttribute('data-key') || '')+'|'+textLabel(dialog.querySelector('.b3-dialog__header')));
    const floating=element.closest(COMPONENT_FLOATING);
    if(floating && !floating.closest('.protyle,.dockPanel')){
        const context=plugin ? pageKey(plugin.dialogBase || currentPage(plugin,false)):'';
        return make(floating,'floating',componentKey(floating)+'|'+(floating.getAttribute('data-oid') || '')+'|'+context);
    }
    const dock=dockPage(element);
    if(dock){
        let root;
        try{root=getModelByDockType(dock.id)?.parent?.panelElement;}catch{}
        if(root?.contains(element)){
            let model;try{model=getModelByDockType(dock.id);}catch{}
            return make(root,'dock',dock.id+'|'+graphContext(model));
        }
    }
    const editor=element.closest('.protyle');
    if(editor){
        const id=editorDocumentId(editor),region=cursorRegion(editor);
        return DOCUMENT_ID.test(id || '') && region ? make(editor,'document',id+'|'+region.kind+'|'+region.id):null;
    }
    const panel=element.closest('.layout-tab-container > [data-id]');
    if(panel){
        let tab;try{tab=getAllTabs().find(item=>item.panelElement===panel);}catch{}
        if(tab?.headElement){const page=tabPage(tab.headElement);return make(panel,'tab',pageKey(page)+'|'+(page.kind==='custom' ? page.title:'')+'|'+graphContext(tab.model)+'|'+uiClasses(panel));}
    }
    return make(document.body,'global','workspace-ui');
}

function componentRoots(scope,plugin) {
    if(scope.kind==='tree'){
        const roots=[...document.querySelectorAll('.sy__tag li[data-treetype],.sy__bookmark li[data-treetype],.sy__tag ul,.sy__bookmark ul,.sy__outline li[data-treetype],.sy__outline ul,.sy__outline > .b3-list-item,.sy__outline > .fn__flex-1,.backlinkList,.backlinkMList,.backlinkList__item,.backlinkList__item > li,.backlinkList__header .counter,.backlinkMList__header .counter')].filter(root=>{
            const region=componentTreeRegion(root);return region?.root===root && componentTreeScope(region,plugin)?.key===scope.key && visibleElement(root);
        });
        return roots.length===1 ? roots[0]:null;
    }
    if(scope.kind==='calendar'){
        let roots=[...document.querySelectorAll(COMPONENT_CALENDAR_REGIONS)].filter(root=>{
            const region=componentCalendarRegion(root);return region?.root===root && componentCalendarScope(region,plugin)?.key===scope.key;
        });
        if(roots.length>1 && scope.pane)roots=roots.filter(root=>componentHash(componentPane(root))===scope.pane);
        roots=roots.filter(visibleElement);return roots.length===1 ? roots[0]:null;
    }
    const selector={document:'.protyle',dock:'.dockPanel',dialog:'.b3-dialog',floating:COMPONENT_FLOATING,tab:'.layout-tab-container > [data-id]',global:'body'}[scope.kind];
    let roots=scope.kind==='av' ? [...document.querySelectorAll('[data-type="NodeAttributeView"]')]
        .filter(av=>componentAVScope(av,plugin)?.key===scope.key)
        .flatMap(av=>[...av.querySelectorAll(COMPONENT_AV_REGIONS)].filter(root=>{
            const region=componentAVRegion(root);
            return region?.av===av && region.root===root && region.part===(scope.part || 'cell') &&
                componentHash(region.part==='cell' ? region.row:'@'+region.part+'|'+region.row)===scope.row && componentHash(region.column || '@'+region.part)===scope.column &&
                (!scope.part || ['row','row-control','field'].includes(scope.part) || componentHash(region.group)===scope.group);
        })):[...document.querySelectorAll(selector)].filter(visibleElement).filter(root=>{
        const local=componentScope(root,plugin);
        return local?.root===root && local.scope.kind===scope.kind && local.scope.key===scope.key;
    });
    if(roots.length>1 && scope.group)roots=roots.filter(root=>componentHash(componentAVRegion(root).group)===scope.group);
    if(roots.length>1 && scope.pane)roots=roots.filter(root=>componentHash(componentPane(root))===scope.pane);
    if(scope.kind==='av')roots=roots.filter(visibleElement);
    return roots.length===1 ? roots[0]:null;
}

function componentCharacter(element,offset) {
    const character=characterAt(element,offset);
    if(!character)return null;
    const range=element.ownerDocument.createRange();range.setStart(character.node,character.offset);range.setEnd(character.node,character.offset+1);
    const rect=range.getBoundingClientRect();return rect.width && rect.height ? rect:null;
}

function componentNearText(element,point) {
    if(element.matches('input,textarea') || element.closest('[data-private]'))return null;
    if(componentTreeRegion(element)?.root===element || element.matches('.backlinkList__header,.backlinkMList__header') && element.closest('.sy__backlink,.sy__backlink--bottom'))return null;
    const doc=element.ownerDocument,caret=doc.caretPositionFromPoint?.(point.x,point.y),range=caret ? null:doc.caretRangeFromPoint?.(point.x,point.y);
    const node=caret?.offsetNode || range?.startContainer,offset=caret?.offset ?? range?.startOffset;
    if(node?.nodeType!==3 || !element.contains(node)){
        // Native upload inputs intercept caret hit testing above their visible label text.
        const upload=element.matches('.b3-menu__label') && element.querySelector('input.b3-form__upload[type="file"]');
        if(!upload || Number(doc.defaultView.getComputedStyle(upload).opacity)>.01)return null;
        let nearest;
        for(let index=0;index<element.textContent.length;index++){
            const rect=componentCharacter(element,index);if(!rect)continue;
            const distance=Math.hypot(Math.max(rect.left-point.x,point.x-rect.right,0),Math.max(rect.top-point.y,point.y-rect.bottom,0));
            if(!nearest || distance<nearest.distance)nearest={offset:index,rect,distance};
            if(distance===0)break;
        }
        return nearest ? [nearest]:null;
    }
    if(element.matches('.block__logo--counter') && element.closest('.sy__backlink,.sy__backlink--bottom') && node.parentElement.closest('.counter'))return null;
    if(element.matches('.search__list [data-type="search-item"]') && node.parentElement!==element)return null;
    if(node.parentElement.closest('.b3-menu__item,.b3-list-item')!==element.closest('.b3-menu__item,.b3-list-item'))return null;
    if(element.closest('[data-type="NodeAttributeView"]') && componentAVRegion(node.parentElement)?.root!==componentAVRegion(element)?.root)return null;
    const prefix=doc.createRange();prefix.selectNodeContents(element);prefix.setEnd(node,offset);
    const candidates=[prefix.toString().length-1,prefix.toString().length].filter(index=>index>=0).map(index=>({offset:index,rect:componentCharacter(element,index)})).filter(item=>item.rect);
    const inside=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);
    return inside ? [inside]:candidates;
}

function componentImageRect(image) {
    if(image.matches('.av__gallery-cover'))image=image.querySelector(':scope > img.av__gallery-img');
    if(!image || !visibleElement(image))return null;
    if(!image.matches('img') || !image.naturalWidth || !image.naturalHeight)return null;
    const style=image.ownerDocument.defaultView.getComputedStyle(image),rect=image.getBoundingClientRect();
    const left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight),top=parseFloat(style.paddingTop),bottom=parseFloat(style.paddingBottom);
    const width=image.clientWidth-left-right,height=image.clientHeight-top-bottom;
    let factor=1,w=image.naturalWidth,h=image.naturalHeight;
    if(style.objectFit==='contain' || style.objectFit==='cover' || style.objectFit==='scale-down'){
        factor=(style.objectFit==='cover' ? Math.max:Math.min)(width/w,height/h);if(style.objectFit==='scale-down')factor=Math.min(1,factor);
    }else if(style.objectFit==='fill'){w=width;h=height;}
    w*=factor;h*=factor;
    const position=style.objectPosition.split(' ');
    const offset=(value,size)=>/^-?[\d.]+%$/.test(value) ? size*parseFloat(value)/100:/^-?[\d.]+px$/.test(value) ? parseFloat(value):NaN;
    const x=offset(position[0],width-w),y=offset(position[1],height-h),sx=rect.width/image.offsetWidth,sy=rect.height/image.offsetHeight;
    if(![x,y,w,h,sx,sy].every(Number.isFinite) || w<=0 || h<=0)return null;
    return {left:rect.left+(image.clientLeft+left+x)*sx,top:rect.top+(image.clientTop+top+y)*sy,
        right:rect.left+(image.clientLeft+left+x+w)*sx,bottom:rect.top+(image.clientTop+top+y+h)*sy,width:w*sx,height:h*sy};
}

function frameBox(frame) {
    const view=frame.ownerDocument.defaultView,style=view.getComputedStyle(frame),rect=frame.getBoundingClientRect();
    const inset=side=>parseFloat(style['border'+side+'Width'])+parseFloat(style['padding'+side]);
    const left=inset('Left'),top=inset('Top'),right=inset('Right'),bottom=inset('Bottom');
    const width=parseFloat(style.width)+(style.boxSizing==='border-box' ? 0:left+right),height=parseFloat(style.height)+(style.boxSizing==='border-box' ? 0:top+bottom);
    if(![width,height,left,top,right,bottom].every(Number.isFinite) || width<=left+right || height<=top+bottom)return null;
    let matrix=new view.DOMMatrix();
    for(let element=frame;element;element=element.parentElement){
        const css=view.getComputedStyle(element);
        if(element!==frame && css.display==='inline' && element.namespaceURI==='http://www.w3.org/1999/xhtml')continue;
        // shortcut: perspective needs a projective box map; reject it until that map is available.
        if(css.perspective!=='none')return null;
        let local=new view.DOMMatrix();
        const rotate=css.rotate.split(' ');
        if(css.rotate!=='none'){
            if(rotate.length>1 && !(rotate.length===2 && rotate[0]==='z') && !(rotate.length===4 && +rotate[0]===0 && +rotate[1]===0 && +rotate[2]!==0))return null;
            const angle=rotate.at(-1),units={deg:1,rad:180/Math.PI,grad:.9,turn:360},unit=angle.match(/(deg|rad|grad|turn)$/)?.[0];
            if(!unit)return null;
            local=local.rotate(parseFloat(angle)*units[unit]*(rotate.length===4 && +rotate[2]<0 ? -1:1));
        }
        if(css.scale!=='none'){
            const scale=css.scale.split(' ').map(value=>parseFloat(value)/(value.endsWith('%') ? 100:1));
            if(scale.length>2 && scale[2]!==1)return null;
            local=local.scale(scale[0],scale[1] ?? scale[0]);
        }
        local=local.multiply(new view.DOMMatrix(css.transform==='none' ? undefined:css.transform));
        if(!local.is2D)return null;
        matrix=local.multiply(matrix);
    }
    let {a,b,c,d}=matrix;
    const sx=rect.width/(Math.abs(a)*width+Math.abs(c)*height),sy=rect.height/(Math.abs(b)*width+Math.abs(d)*height);
    a*=sx;c*=sx;b*=sy;d*=sy;
    const determinant=a*d-b*c;
    if(![a,b,c,d,determinant].every(Number.isFinite) || Math.abs(determinant)<1e-10)return null;
    const x=rect.left-Math.min(0,a*width,c*height,a*width+c*height),y=rect.top-Math.min(0,b*width,d*height,b*width+d*height);
    return {bounds:{left:0,top:0,right:width,bottom:height},content:{left,top,right:width-right,bottom:height-bottom},
        toLocal:point=>({x:(d*(point.x-x)-c*(point.y-y))/determinant,y:(a*(point.y-y)-b*(point.x-x))/determinant}),
        toParent:point=>({x:x+a*point.x+c*point.y,y:y+b*point.x+d*point.y})};
}

function frameToContent(frame,point) {
    const box=frameBox(frame);if(!box)return null;
    const local=box.toLocal(point),rect=box.content;
    return local.x>=rect.left && local.x<rect.right && local.y>=rect.top && local.y<rect.bottom ? {x:local.x-rect.left,y:local.y-rect.top}:null;
}

function frameToParent(frame,point) {
    const box=frameBox(frame);
    return box ? box.toParent({x:point.x+box.content.left,y:point.y+box.content.top}):null;
}

function componentBox(hit,point) {
    if(hit.matches('mark') && hit.parentElement.matches(COMPONENT_HIGHLIGHT_TEXT))hit=hit.parentElement;
    if(hit.namespaceURI==='http://www.w3.org/2000/svg')hit=hit.closest(CURSOR_CONTROL) || hit.closest('svg') || hit;
    if(hit.matches('.b3-list-item__arrow') && componentTreeRegion(hit))hit=hit.closest('.b3-list-item__toggle') || hit;
    while(hit.parentElement){
        const rect=hit.getBoundingClientRect();
        if(point.x>=rect.left-.5 && point.x<=rect.right+.5 && point.y>=rect.top-.5 && point.y<=rect.bottom+.5)break;
        hit=hit.parentElement;
    }
    return hit;
}

function componentPaintRect(element) {
    const rect=element.getBoundingClientRect();
    // Hit testing can include half a CSS pixel beyond the measured box.
    return {left:rect.left-.5,right:rect.right+.5,top:rect.top-.5,bottom:rect.bottom+.5};
}

function componentGeometry(element,point) {
    const box=element.matches('iframe') ? frameBox(element):null;if(element.matches('iframe') && !box)return null;
    if(box)point=box.toLocal(point);
    let bounds=box ? box.bounds:element.getBoundingClientRect();
    const paint=!box && (point.x<bounds.left || point.x>bounds.right || point.y<bounds.top || point.y>bounds.bottom);
    if(paint)bounds=componentPaintRect(element);
    const children=box ? []:componentChildren(element),text=box ? []:componentNearText(element,point) || [],image=componentImageRect(element),frame=box?.content,list=componentListRect(element),tree=element.matches('.backlinkList__item,.sy__backlink--bottom') && componentBacklinkContext(element) || element.matches('ul') && element.closest('.sy__tag,.sy__bookmark,.sy__outline');
    const edges={},relative={};let usedText=!!(element.matches('.counter') && (componentTreeRegion(element) || element.closest('.search__list')));
    for(const [axis,start,end,otherStart,otherEnd] of [['x','left','right','top','bottom'],['y','top','bottom','left','right']]) {
        const other=point[axis==='x' ? 'y':'x'];
        const entries=[{value:bounds[start],edge:{kind:box ? 'frame-box':paint ? 'paint':'self',side:'start'}},{value:bounds[end],edge:{kind:box ? 'frame-box':paint ? 'paint':'self',side:'end'}}];
        if(image)for(const [side,key] of [['start',start],['end',end]])if(image[key]>=bounds[start] && image[key]<=bounds[end])entries.push({value:image[key],edge:{kind:'image',side}});
        if(frame)for(const [side,key] of [['start',start],['end',end]])entries.push({value:frame[key],edge:{kind:'frame',side}});
        const perimeter=list && (point[axis]<list[start] || point[axis]>list[end] || tree && (point.x<list.left || point.x>list.right));
        if(perimeter)for(const [side,key] of [['start',start],['end',end]])if(list[key]>=bounds[start] && list[key]<=bounds[end])entries.push({value:list[key],edge:{kind:'list',side}});
        // At coincident bounds, prefer the nearest end row over the resizable list box.
        if(perimeter && axis==='y' && tree)for(const part of point.y-bounds.top<=bounds.bottom-point.y ? ['last','first']:['first','last']){
            const rect=componentListRect(element,part);
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.unshift({value:rect[key],edge:{kind:'list-'+part,side}});
        }
        for(const child of perimeter ? []:children){
            const rect=child.getBoundingClientRect();if(!rect.width || !rect.height || other<rect[otherStart] || other>rect[otherEnd])continue;
            const step=componentStep(child);
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.push({value:rect[key],edge:{kind:'child',side,step}});
        }
        for(const item of text)for(const [side,key] of [['start',start],['end',end]])if(item.rect[key]>=bounds[start] && item.rect[key]<=bounds[end])entries.push({value:item.rect[key],edge:{kind:'text',side,offset:item.offset}});
        const lower=entries.filter(item=>item.value<=point[axis]).sort((a,b)=>b.value-a.value)[0];
        const upper=entries.filter(item=>item.value>=point[axis]).sort((a,b)=>a.value-b.value)[0];
        if(!lower || !upper)return null;
        edges[axis]=[lower.edge,upper.edge];relative[axis]=upper.value===lower.value ? 0:(point[axis]-lower.value)/(upper.value-lower.value);
        usedText ||= lower.edge.kind==='text' || upper.edge.kind==='text';
    }
    const imagePoint=image && point.x>=image.left && point.x<=image.right && point.y>=image.top && point.y<=image.bottom ? {x:(point.x-image.left)/image.width,y:(point.y-image.top)/image.height}:null;
    return {edges,...relative,...(usedText ? {textHash:componentTextHash(element)}:{}),...(imagePoint ? {imagePoint}:{})};
}

function captureComponent(hit,plugin,point) {
    if(hit.closest('[data-private]') || componentSearchField(hit)===null || componentAssetPath(hit)===null)return null;
    const graph=hit.matches('canvas') ? captureGraph(hit,point):undefined;
    if(hit.matches('canvas') && !graph)return null;
    let original=hit;hit=componentBox(hit,point);
    const scope=componentScope(hit,plugin);if(!scope)return null;
    const route=componentRoute(scope.root,hit);if(!route)return null;
    const frames=[];
    while(hit.matches('iframe')){
        if(!frameBox(hit))return null;
        const inside=frameToContent(hit,point);if(!inside)break;
        // shortcut: cap embedded document chains at eight levels; raise with a matching protocol bound if needed.
        if(frames.length>=8)return null;
        let doc;try{doc=hit.contentDocument;}catch{}
        if(!doc?.body)return null;
        point=inside;const inner=componentHit(doc,point);
        if(!visibleElement(inner) || inner.closest('[data-private]') || componentSearchField(inner)===null || inner.matches('canvas'))return null;
        original=inner;hit=componentBox(inner,point);
        const route=componentRoute(doc.body,hit);if(!route)return null;frames.push(route);
    }
    const highlight=original.matches('mark') && hit===original.parentElement && hit.matches(COMPONENT_HIGHLIGHT_TEXT);
    const target=hit!==original && !highlight ? componentRoute(hit,original):undefined;
    if(target===null)return null;
    const geometry=componentGeometry(hit,point);if(!geometry)return null;
    const {x,y,...fields}=geometry;
    const ui={version:3,kind:'component',scope:scope.scope,route,...(frames.length===1 ? {frame:frames[0]}:frames.length ? {frames}:{}),...(target ? {target}:{}),...(graph ? {graph}:{}),...fields};
    return validUIAnchor(ui) ? {ui,x,y}:null;
}

function resolveComponent(cursor,plugin) {
    const anchor=cursor.ui;
    if(!validUIAnchor(anchor))return null;
    const root=componentRoots(anchor.scope,plugin);if(!root)return null;
    let element=componentFollow(root,anchor.route);const frames=[];
    if(!element)return null;
    if(anchor.pdf)return visibleElement(element) ? resolvePDF(element,anchor.pdf):null;
    if(anchor.graph)return visibleElement(element) && element.matches('canvas') ? resolveGraph(element,anchor.graph):null;
    for(const route of anchor.frames || (anchor.frame ? [anchor.frame]:[])){
        if(!element.matches('iframe') || !visibleElement(element) || element.closest('[data-private]'))return null;
        frames.push(element);let doc;try{doc=element.contentDocument;}catch{}
        element=doc?.body && componentFollow(doc.body,route);if(!element)return null;
    }
    if(!visibleElement(element) || element.closest('[data-private]') || element.matches('canvas') ||
        anchor.textHash && componentTextHash(element)!==anchor.textHash)return null;
    const box=element.matches('iframe') ? frameBox(element):null;if(element.matches('iframe') && !box)return null;
    const point={};
    for(const [axis,start,end] of [['x','left','right'],['y','top','bottom']]) {
        if(anchor.imagePoint){
            const rect=componentImageRect(element);if(!rect)return null;
            point[axis]=rect[start]+(rect[end]-rect[start])*anchor.imagePoint[axis];continue;
        }
        const values=anchor.edges[axis].map(edge=>{
            const target=edge.kind==='self' ? element:edge.kind==='child' ? componentChild(element,edge.step):null;
            const rect=edge.kind==='text' ? componentCharacter(element,edge.offset):edge.kind==='paint' ? componentPaintRect(element):edge.kind==='image' ? componentImageRect(element):edge.kind==='list' ? componentListRect(element):['list-first','list-last'].includes(edge.kind) ? componentListRect(element,edge.kind.slice(5)):edge.kind==='frame' ? box?.content:edge.kind==='frame-box' ? box?.bounds:box && target===element ? box.bounds:target?.getBoundingClientRect();
            return rect?.[edge.side==='start' ? start:end];
        });
        if(values.some(value=>!Number.isFinite(value)) || values[1]<values[0] ||
            values[0]===values[1] && JSON.stringify(anchor.edges[axis][0])!==JSON.stringify(anchor.edges[axis][1]))return null;
        point[axis]=values[0]+(values[1]-values[0])*cursor[axis];
    }
    if(box)Object.assign(point,box.toParent(point));
    const hit=componentHit(element.ownerDocument,point);
    const target=anchor.target ? componentFollow(element,anchor.target):element;
    const highlight=target===element && element.matches(COMPONENT_HIGHLIGHT_TEXT) && hit?.matches('mark') && hit.parentElement===element;
    const treeToggle=hit===element && element.matches('.b3-list-item__toggle') && target?.closest('svg')?.matches('.b3-list-item__arrow') && componentTreeRegion(element);
    // A blank cell must remain blank; a newly inserted child must not inherit its pointer.
    if(!visibleElement(target) || componentSearchField(target)===null || componentAssetPath(target)===null || !visibleElement(hit) || hit!==target && !highlight && !treeToggle && !(hit?.namespaceURI==='http://www.w3.org/2000/svg' && target.contains(hit)))return null;
    if(element.matches('iframe') && frameToContent(element,point))return null;
    for(const frame of frames.reverse()){
        const parentPoint=frameToParent(frame,point);if(!parentPoint)return null;Object.assign(point,parentPoint);
        if(frame.ownerDocument.elementFromPoint(point.x,point.y)!==frame)return null;
    }
    return point;
}

const textLabel = (element) => (element?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
function visibleElement(element) {
    if(!element || element.closest('.fn__none') || element.getBoundingClientRect().width<=0 || element.getBoundingClientRect().height<=0 || element.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})===false)return false;
    const view=element.ownerDocument?.defaultView;
    if(view?.getComputedStyle){
        if(view.getComputedStyle(element).visibility==='hidden')return false;
        for(let node=element;node;node=node.parentElement){const style=view.getComputedStyle(node);if(style.display==='none' || style.opacity==='0')return false;}
    }
    return true;
}

function dockPage(target) {
    if (!target) return null;
    for (const item of document.querySelectorAll('.dock__item[data-type]')) {
        const id=item.getAttribute('data-type');
        let model;
        try { model=getModelByDockType(id); } catch {}
        if (item.contains(target) || model?.parent?.panelElement?.contains(target)) {
            const title=(item.getAttribute('aria-label') || '').replace(/<[^>]*>/g,'').split('\n')[0].trim().slice(0,160);
            const page={kind:'dock',id,title};
            if(validPage(page))return page;
        }
    }
    return null;
}

function cursorRegion(element) {
    const preview=element.closest('.search__preview'),dialog=element.closest('.b3-dialog');
    if(preview){
        const key=dialog?.getAttribute('data-key') || dialog?.parentElement?.getAttribute('data-key');
        const host=dialog ? key==='dialog-globalsearch' : !!preview.closest('.layout-tab-container > [data-id]');
        return host && preview.matches('.protyle') && ['searchPreview','searchUnRefPreview'].includes(preview.id) ?
            {kind:'dock',id:'search-'+componentHash(JSON.stringify([dialog ? 'dialog':'tab',preview.id]))}:null;
    }
    if(dialog)return null;
    const backlink=componentBacklinkContext(element),editor=element.closest('.protyle');
    if(backlink && editor && backlink.panel.contains(editor))return backlink.identity ? {kind:'dock',id:'backlink-'+componentHash(JSON.stringify(backlink.identity))}:null;
    const dock=dockPage(element);
    if(dock)return {kind:'dock',id:dock.id};
    if(element.closest('.dockPanel'))return null;
    const id=element.closest('.protyle')?.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id');
    return DOCUMENT_ID.test(id || '') ? {kind:'document',id}:null;
}

function matchesRegion(element, region) {
    const local=cursorRegion(element);
    // Legacy editor anchors are only safe in the main document, never in previews or docks.
    return !!local && (region ? local.kind===region.kind && local.id===region.id : local.kind==='document');
}

function currentPage(plugin, includeDialog = true) {
    if(includeDialog) {
        if(document.querySelector('.collab-people'))return {kind:'participants',title:plugin.i18n.peopleTitle};
        if(document.querySelector('.collab-tick-form'))return {kind:'chord-settings',title:plugin.i18n.cursorSettings};
        if(document.querySelector('.collab-name-form'))return {kind:'chord-name',title:plugin.i18n.renameSelf};
    }
    const config = [...document.querySelectorAll('.config__panel')].find(visibleElement);
    const dialogs = [...document.querySelectorAll('.b3-dialog')].filter(visibleElement);
    const dialog = dialogs.at(-1);
    if (config && (!includeDialog || !dialog || dialog.contains(config))) {
        const selected = config.querySelector('.config__side .b3-list-item--focus[data-name]');
        return { kind: 'settings', section: selected?.getAttribute('data-name') || 'editor', title: plugin.i18n.pageSettings + ' · ' + textLabel(selected) };
    }
    if (includeDialog) {
        if (dialog) {
            const key = dialog.getAttribute('data-key') || dialog.parentElement?.getAttribute('data-key') || '';
            const title = textLabel(dialog.querySelector('.b3-dialog__header')) || plugin.i18n.pageDialog;
            const command = {'dialog-globalsearch':'globalSearch','dialog-history':'dataHistory','dialog-recentdocs':'recentDocs','dialog-opencard':'riffCard','dialog-viewcards':'riffCard'}[key];
            if (command) return { kind: 'command', command, title: command==='globalSearch' && title===plugin.i18n.pageDialog ? plugin.i18n.pageSearch : title };
            if(key==='dialog-commandpanel')return {kind:'control',control:'barCommand',title};
            if(plugin.pageControl)return {kind:'control',control:plugin.pageControl,title};
            return { kind: 'dialog', key, title, base: plugin.dialogBase || currentPage(plugin, false) };
        }
        if(plugin.pageControl && [...document.querySelectorAll('.b3-menu')].some(visibleElement))return {kind:'control',control:plugin.pageControl,title:plugin.controlTitle || plugin.i18n.pageWorkspace};
    }
    const dock=dockPage(plugin.surfaceTarget?.isConnected ? plugin.surfaceTarget : document.activeElement);
    if(dock)return dock;
    let tab;
    try { tab = getActiveTab?.(); } catch {}
    const title = (tab?.title || textLabel(document.querySelector('.layout__wnd--active .item--focus .item__text')) || '').slice(0,160);
    const editor = tab?.model?.editor?.protyle;
    const id = editor?.block?.rootID || plugin.currentDocument();
    if (DOCUMENT_ID.test(id || '') && (!tab || tab.model?.editor)) return { kind: 'document', id, title: title || plugin.i18n.pageDocument };
    const model = tab?.model;
    if(tab?.panelElement?.matches('.sy__graph, .sy__globalGraph'))return {kind:'dock',id:model?.type==='global' ? 'globalGraph':'graph',title};
    const path = model?.path || model?.assetPath;
    if (typeof path === 'string' && path.startsWith('assets/')) return { kind: 'asset', path, title };
    if (model?.type && !['Editor','Asset','Search'].includes(model.type)) {
        const page = { kind: 'custom', id: model.type, icon: tab?.icon || 'iconPlugin', title };
        if (validPage(page)) return page;
    }
    if (tab?.panelElement?.querySelector('.search__input')) return { kind: 'command', command:'globalSearch', title: title || plugin.i18n.pageSearch };
    return { kind: 'workspace', title: title || plugin.i18n.pageWorkspace };
}

function tabPage(head) {
    let tab, lazy={};
    try { tab=getAllTabs().find(item=>item.headElement===head); } catch {}
    try { lazy=JSON.parse(head.getAttribute('data-initdata') || '{}'); } catch {}
    const title=(tab?.title || textLabel(head.querySelector('.item__text'))).slice(0,160);
    const id=tab?.model?.editor?.protyle?.block?.rootID || lazy.rootId;
    if(DOCUMENT_ID.test(id || ''))return {kind:'document',id,title};
    const path=tab?.model?.path || lazy.path;
    if(typeof path==='string' && validPage({kind:'asset',path,title}))return {kind:'asset',path,title};
    const custom=tab?.model?.type || lazy.customModelType;
    const page={kind:'custom',id:custom,icon:tab?.icon || 'iconPlugin',title};
    return validPage(page) ? page : {kind:'workspace',title};
}

function uiClasses(element) {
    return [...element.classList].filter(name=>!/(?:--(?:focus|active|selected|hover)$|^fn__none$|^ariaLabel$)/.test(name)).sort().join(' ');
}

const CURSOR_CONTROL = 'button,input,select,textarea,[role="button"],.block__icon,.toolbar__item,.b3-switch,.b3-select,.b3-slider,.b3-text-field,[data-statusbar-entry],[data-topbar-entry],.protyle-title__icon';
const CURSOR_EXCLUDED = '.protyle-toolbar,iframe,.protyle-breadcrumb__space,.layout__resize,[data-type="NodeAttributeView"],.b3-menu,.protyle-hint';
const FILE_PARTS = {text:'.b3-list-item__text',icon:'.b3-list-item__icon',toggle:'.b3-list-item__arrow',switch:'.b3-list-item__switch',viewers:'.collab-presence-users',new:'[data-type="new"]','more-file':'[data-type="more-file"]','more-root':'[data-type="more-root"]'};

function uiFingerprint(element) {
    const result={tag:element.tagName.toLowerCase(),classes:uiClasses(element)};
    for(const attribute of ['data-statusbar-entry','data-topbar-entry','data-node-id','data-type','data-name','id','data-id']) {
        const value=element.getAttribute(attribute);
        if(value && value.length<=512){result.attribute=attribute;result.value=value;break;}
    }
    result.label=element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length && !element.matches('input,textarea,[contenteditable]') ? textLabel(element):'');
    result.label=result.label.slice(0,512);
    return result;
}

function uiAnchor(hit, plugin, point) {
    if(hit.closest(CURSOR_EXCLUDED))return null;
    let element=hit.closest(CURSOR_CONTROL);
    const make=(kind,fields={})=>({element,ui:{version:2,kind,path:[],...uiFingerprint(element),...fields}});
    if(hit.closest('.sy__file')) {
        const row=hit.closest('li[data-type="navigation-file"],li[data-type="navigation-root"]');
        const id=row?.closest('ul[data-url]')?.getAttribute('data-url'),key=row?.getAttribute('data-node-id') || '';
        const part=Object.keys(FILE_PARTS).find(part=>row?.contains(hit.closest(FILE_PARTS[part])));
        if(!DOCUMENT_ID.test(id || '') || (key && !DOCUMENT_ID.test(key)) || (!key && row.getAttribute('data-type')==='navigation-file') || !part)return null;
        element=hit.closest(FILE_PARTS[part]);
        if(part==='text') {
            const text=captureTextPoint(element,point);
            return text ? {...make('file',{id,key,part,offset:text.offset}),text}:null;
        }
        return make('file',{id,key,part});
    }
    const editor=hit.closest('.protyle');
    if(editor && !hit.closest('.dockPanel')) {
        const id=editor.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id');
        const title=hit.closest('.protyle-title__input');
        if(title) {
            element=title;
            const text=captureTextPoint(title,point);
            return text ? {...make('document',{page:{kind:'document',id,title:''},offset:text.offset}),text}:null;
        }
        if(!element || !editor.contains(element))return null;
        return make('document',{page:{kind:'document',id,title:''}});
    }
    const head=hit.closest('[data-type="tab-header"]');
    if(head) {
        const parts={label:'.item__text',icon:'.item__icon, .item__graphic',close:'.item__close'};
        const part=Object.keys(parts).find(key=>hit.closest(parts[key]));
        element=part ? hit.closest(parts[part]):head;
        return make('tab',{page:tabPage(head),part:part || 'tab'});
    }
    const tabControl=hit.closest('.item--readonly [data-type]');
    if(tabControl){element=tabControl;return make('tab-control',{id:element.getAttribute('data-type')});}
    const dock=hit.closest('.dock__item[data-type]');
    if(dock){element=dock;return make('dock',{id:dock.getAttribute('data-type')});}
    const entry=hit.closest('[data-statusbar-entry], [data-topbar-entry]');
    if(entry){element=entry;return make('status',{id:entry.getAttribute('data-statusbar-entry') || entry.getAttribute('data-topbar-entry'),attribute:entry.hasAttribute('data-statusbar-entry') ? 'data-statusbar-entry':'data-topbar-entry'});}
    const setting=hit.closest('.config__side [data-name]');
    if(setting){element=setting;return make('settings-nav',{id:setting.getAttribute('data-name')});}
    if(!element)return null;
    if(element.id && element.closest('.toolbar,#status'))return make('id',{id:element.id});
    const root=element.closest('.config__tab-container, .b3-dialog__container, .dockPanel, .layout__wnd--active, [data-type="wnd"], .toolbar') || document.body;
    const page=plugin ? currentPage(plugin):{kind:'workspace',title:''};
    if(root.classList.contains('config__tab-container'))return make('settings',{page:{...page,kind:'settings',section:root.getAttribute('data-name') || page.section}});
    if(root.classList.contains('b3-dialog__container'))return make('dialog',{page,key:root.closest('.b3-dialog')?.parentElement?.getAttribute('data-key') || ''});
    if(root.classList.contains('dockPanel')) {
        const dockPageValue=dockPage(element);
        if(dockPageValue)return make('panel',{id:dockPageValue.id});
    }
    return make(root===document.body ? 'body':root.classList.contains('toolbar') ? 'toolbar':'layout',{page});
}

function resolveUIAnchor(anchor, plugin, region) {
    // Old child-index anchors cannot identify a control after either window changes layout.
    if(anchor.version!==2)return null;
    const visible=items=>[...items].filter(visibleElement);
    const unique=items=>items.length===1 ? items[0]:null;
    if(anchor.kind==='file') {
        const rows=visible(document.querySelectorAll('.sy__file li[data-type="navigation-file"],.sy__file li[data-type="navigation-root"]'))
            .filter(row=>row.closest('ul[data-url]')?.getAttribute('data-url')===anchor.id && (row.getAttribute('data-node-id') || '')===anchor.key);
        const row=unique(rows);
        return row ? unique(visible(row.querySelectorAll(FILE_PARTS[anchor.part]))):null;
    }
    if(anchor.kind==='id') {
        const element=document.getElementById(anchor.id);
        if(anchor.page && plugin && pageKey(currentPage(plugin))!==pageKey(anchor.page))return null;
        return visibleElement(element) ? element:null;
    }
    if(anchor.kind==='dock')return unique(visible(document.querySelectorAll('.dock__item[data-type]')).filter(item=>item.getAttribute('data-type')===anchor.id));
    if(anchor.kind==='status')return unique(visible(document.querySelectorAll('['+anchor.attribute+']')).filter(item=>item.getAttribute(anchor.attribute)===anchor.id));
    if(anchor.kind==='settings-nav')return unique(visible(document.querySelectorAll('.config__side [data-name]')).filter(item=>item.getAttribute('data-name')===anchor.id));
    if(anchor.kind==='tab-control')return unique(visible(document.querySelectorAll('.layout__wnd--active .item--readonly [data-type]')).filter(item=>item.getAttribute('data-type')===anchor.id));
    if(anchor.kind==='tab') {
        const heads=visible(document.querySelectorAll('[data-type="tab-header"]')).filter(head=>{
            const page=tabPage(head);
            return pageKey(page)===pageKey(anchor.page) && (page.kind!=='workspace' || page.title===anchor.page.title);
        });
        const head=unique(heads);
        if(!head)return null;
        return anchor.part==='tab' ? head:head.querySelector({label:'.item__text',icon:'.item__icon, .item__graphic',close:'.item__close'}[anchor.part]);
    }
    let roots=[];
    if(anchor.kind==='document') {
        roots=visible(document.querySelectorAll('.protyle')).filter(editor=>editor.querySelector('.protyle-background[data-node-id]')?.getAttribute('data-node-id')===anchor.page.id && matchesRegion(editor,region));
        if(roots.length!==1)return null;
    } else if(anchor.kind==='settings') {
        roots=visible(document.querySelectorAll('.config__tab-container')).filter(root=>(root.getAttribute('data-name') || document.querySelector('.config__side .b3-list-item--focus')?.getAttribute('data-name'))===anchor.page.section);
    } else if(anchor.kind==='dialog') {
        roots=visible(document.querySelectorAll('.b3-dialog__container')).filter(root=>{
            if(anchor.key)return root.closest('.b3-dialog')?.parentElement?.getAttribute('data-key')===anchor.key;
            const form={participants:'.collab-people','chord-settings':'.collab-tick-form','chord-name':'.collab-name-form'}[anchor.page?.kind];
            return form ? !!root.querySelector(form):textLabel(root.querySelector('.b3-dialog__header'))===anchor.page?.title;
        });
    } else if(anchor.kind==='panel') {
        try { const root=getModelByDockType(anchor.id)?.parent?.panelElement;if(visibleElement(root))roots=[root]; } catch {}
    } else {
        if(anchor.kind!=='toolbar' && plugin && pageKey(currentPage(plugin))!==pageKey(anchor.page))return null;
        roots=visible(document.querySelectorAll({layout:'.layout__wnd--active',toolbar:'.toolbar',body:'body'}[anchor.kind]));
    }
    const candidates=roots.flatMap(root=>[root,...root.querySelectorAll(anchor.tag)]).filter(element=>element.tagName.toLowerCase()===anchor.tag && visibleElement(element) &&
        uiClasses(element)===anchor.classes && (!anchor.attribute || element.getAttribute(anchor.attribute)===anchor.value) && uiFingerprint(element).label===anchor.label);
    return candidates.length===1 ? candidates[0]:null;
}

function captureShortcut(event) {
    if (event.repeat || event.isComposing || !(event.ctrlKey || event.metaKey || event.altKey) || ['Control','Meta','Alt','Shift','AltGraph','Dead','Unidentified','Process'].includes(event.key)) return null;
    // Password inputs never announce key combinations, even though no typed text is shared.
    if (event.target?.closest?.('input[type="password"], [data-private]')) return null;
    let key = event.key;
    if (!/^(?:[a-zA-Z0-9]|F\d{1,2}|Arrow(?:Up|Down|Left|Right)|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|[+\-=,./;`\[\]\\])$/.test(key)) return null;
    if (key.length === 1) key = key.toUpperCase();
    return [event.ctrlKey && 'Ctrl', event.metaKey && 'Meta', event.altKey && 'Alt', event.shiftKey && 'Shift', key].filter(Boolean).join('+');
}

async function openPage(plugin, page) {
    if (!validPage(page)) throw new Error('Invalid page');
    if(page.kind!=='dialog') {
        for(const dialog of [...document.querySelectorAll('.b3-dialog')].filter(visibleElement).reverse()) {
            dialog.querySelector('.b3-dialog__scrim')?.click();
            if(dialog.isConnected) {
                if(!dialog.closest('[data-dialog-closing="true"]'))throw Error('Close the current dialog before following');
                await new Promise((resolve,reject)=>{
                    const observer=new MutationObserver(()=>{if(!dialog.isConnected){observer.disconnect();clearTimeout(timer);resolve();}});
                    const timer=setTimeout(()=>{observer.disconnect();reject(Error('Dialog did not close'));},1500);
                    observer.observe(document.body,{childList:true,subtree:true});
                    if(!dialog.isConnected){observer.disconnect();clearTimeout(timer);resolve();}
                });
            }
        }
    }
    if(page.kind==='participants')plugin.openPeople();
    else if(page.kind==='chord-settings')plugin.openSetting();
    else if(page.kind==='chord-name')plugin.openRenameDialog();
    else if(page.kind==='dock') {
        const item=[...document.querySelectorAll('.dock__item[data-type]')].find(element=>element.getAttribute('data-type')===page.id);
        if(!item)throw Error('Dock unavailable');
        if(!item.classList.contains('dock__item--active'))item.click();
    }
    else if(page.kind==='control') {
        const control=document.getElementById(page.control);if(!control)throw Error('Control unavailable');control.click();
    } else if (page.kind === 'settings') {
        openSetting(plugin.app);
        const item = document.querySelector('.config__side [data-name="' + page.section + '"]');
        if (!item) throw new Error('Settings section unavailable');
        item.click();
    } else if (page.kind === 'document') {
        await openTab({ app:plugin.app, doc:{id:page.id}, keepCursor:false, removeCurrentTab:false });
    } else if (page.kind === 'asset') {
        await openTab({ app:plugin.app, asset:{path:page.path}, keepCursor:false, removeCurrentTab:false });
    } else if (page.kind === 'custom') {
        await openTab({ app:plugin.app, custom:{id:page.id,title:page.title,icon:page.icon}, keepCursor:false, removeCurrentTab:false });
    } else if (page.kind === 'command') {
        if (!globalCommand(page.command, plugin.app, undefined, true)) throw new Error('Page unavailable');
    } else if (page.kind === 'dialog') {
        const existing = [...document.querySelectorAll('.b3-dialog')].find((element) => (element.getAttribute('data-key') || element.parentElement?.getAttribute('data-key') || '') === page.key && textLabel(element.querySelector('.b3-dialog__header')) === page.title);
        if (existing) existing.querySelector('.b3-dialog__container')?.focus();
        else {
            await openPage(plugin, page.base);
            // shortcut: action-specific dialogs have no safe public opener; open their page until SiYuan exposes one.
            showMessage(plugin.i18n.followBase,5000,'info');
        }
    }
}

function captureCursor(point, plugin) {
    const anchored=captureDocumentCursor(point);
    if (!point || document.hidden) return null;
    const hit=componentHit(document,point);
    if (!visibleElement(hit) || hit.closest('[data-private]')) return null;
    const active=document.activeElement;
    const editable=document.hasFocus?.() && active?.matches('input:not([type]),input[type="text"],input[type="search"],textarea,[contenteditable="true"]') && !active.closest('[data-private]');
    const state=editable ? (plugin?.typingTarget===active ? 'typing':'editing'):undefined;
    const activity=state ? {state}:{};
    const screen={x:Math.max(0,Math.min(1,point.x/window.innerWidth)),y:Math.max(0,Math.min(1,point.y/window.innerHeight))};
    const page=plugin ? currentPage(plugin) : {kind:'workspace',title:''};
    if (anchored) return {...anchored,screen,page,...activity};
    const pdf=capturePDF(hit,plugin,point);
    if(pdf!==undefined)return pdf ? {surface:'ui',documentId:null,blockId:null,page,screen,...pdf,...activity}:null;
    const fallback=()=>{
        const component=captureComponent(hit,plugin,point);
        return component ? {surface:'ui',documentId:null,blockId:null,page,screen,...component,...activity}:null;
    };
    const target=uiAnchor(hit,plugin,point);
    if(!target)return fallback();
    const rect=target.element.getBoundingClientRect();
    if(!validUIAnchor(target.ui) || !rect.width || !rect.height)return fallback();
    const region=cursorRegion(hit);
    const cursor={surface:'ui',documentId:null,blockId:null,page,screen,ui:target.ui,...activity,...(region ? {region}:{}),
        x:target.text ? target.text.x : Math.max(0,Math.min(1,(point.x-rect.left)/rect.width)),
        y:target.text ? target.text.y : Math.max(0,Math.min(1,(point.y-rect.top)/rect.height))};
    const local=resolveCursor(cursor,plugin);
    return local && Math.hypot(local.x-point.x,local.y-point.y)<.001 ? cursor:fallback();
}

function resolveCursor(cursor, plugin) {
    if(cursor?.surface==='ui' && cursor.ui?.version===3)return resolveComponent(cursor,plugin);
    if(cursor.surface!=='ui')return resolveDocumentCursor(cursor);
    const element=resolveUIAnchor(cursor.ui,plugin,cursor.region);
    if(!element || element.closest(CURSOR_EXCLUDED))return null;
    if(element.closest('.sy__file') && cursor.ui.kind!=='file')return null;
    if(cursor.region && !matchesRegion(element,cursor.region))return null;
    if(!['file','dock','tab','tab-control','settings-nav'].includes(cursor.ui.kind) && !element.matches(CURSOR_CONTROL) && !element.matches('.protyle-title__input'))return null;
    let rect=element.getBoundingClientRect();
    if(cursor.ui.offset!==undefined) {
        const character=characterAt(element,cursor.ui.offset);
        if(!character || /\s/.test(character.node.textContent[character.offset]))return null;
        rect=characterRect(character.node,character.offset);
    } else if(element.matches('.protyle-title__input'))return null;
    if(!rect?.width || !rect.height)return null;
    const point={x:rect.left+rect.width*cursor.x,y:rect.top+rect.height*cursor.y};
    const hit=componentHit(document,point);
    return hit && visibleElement(hit) && element.contains(hit) ? point:null;
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
                this.scheduleCursorRender(false);
            }
        });
    }

    scheduleDocumentReport() {
        this.finishRestore?.();
        this.scheduleCursorRender(false);
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
                if ((record.target.nodeType === 3 ? record.target.parentElement : record.target).closest?.(".collab-cursor-layer, .collab-editing-layer, .collab-people")) continue;
                if (record.type === "characterData") { this.scheduleCursorRender(false); this.queueActivity(); continue; }
                if (record.type === "attributes") {
                    this.scheduleDocumentReport();
                    if (record.target.matches(".protyle") || record.target.classList.contains("layout__wnd--active") ||
                        (record.oldValue || "").includes("layout__wnd--active")) this.scheduleDocumentReport();
                    this.scheduleCursorRender(false);
                    this.queueActivity();
                    continue;
                }
                const elements = [...record.addedNodes, ...record.removedNodes].filter((node) => node.nodeType === 1 && !node.matches('.collab-presence-users,.collab-editing-layer'));
                if (!elements.length) continue;
                if(elements.some((element)=>element.matches('iframe') || element.querySelector('iframe')))this.bindFrames();
                this.scheduleDocumentReport();
                if (record.target.closest(".sy__file") || elements.some((node) => node.matches(".sy__file") || node.querySelector(".sy__file"))) this.scheduleTreeRender();
                if ((record.target.closest(".layout-tab-container") && !record.target.closest(".protyle")) ||
                    elements.some((node) => node.matches(".protyle") || node.querySelector(".protyle"))) this.scheduleDocumentReport();
                this.scheduleCursorRender(false);
                this.queueActivity();
            }
        });
        this.domObserver.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "data-node-id", "hidden", "open"], attributeOldValue: true });
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
        this.scheduleCursorRender(true);
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
                this.scheduleCursorRender(true);
                this.queueActivity();
                this.watchGraphs();
            }
        };
        this.handlePointerLeave = () => {
            this.pointer = null;
            this.queueActivity();
            this.scheduleCursorRender(true);
        };
        this.handlePointerOut = (event) => { if (!event.relatedTarget) this.handlePointerLeave(); };
        this.handleCursorLayout = () => { this.scheduleCursorRender(false); this.queueActivity(); };
        this.handleVisibility = () => {
            if (document.hidden) this.handlePointerLeave();
            else { this.refreshInBackground(); this.loadCursors(); }
            this.scheduleCursorRender(false);
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
            this.scheduleDocumentReport();this.queueActivity();
        };
        this.handleKey = (event) => {
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
            const stopDocument=()=>{observer?.disconnect();observer=null;doc?.removeEventListener('pointermove',move,true);doc?.removeEventListener('keydown',this.handleKey,true);doc?.removeEventListener('scroll',this.handleCursorLayout,true);doc?.defaultView?.removeEventListener('resize',this.handleCursorLayout);doc=null;};
            const load=()=>{
                let next;try{next=frame.contentDocument;}catch{}
                if(next===doc)return;
                stopDocument();
                doc=next;if(!doc)return;
                doc.addEventListener('pointermove',move,{capture:true,passive:true});doc.addEventListener('keydown',this.handleKey,{capture:true,passive:true});doc.addEventListener('scroll',this.handleCursorLayout,{capture:true,passive:true});doc.defaultView?.addEventListener('resize',this.handleCursorLayout,{passive:true});
                observer=new MutationObserver(records=>{
                    if(this.stopped)return;
                    this.handleCursorLayout();
                    if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1 && (node.matches('iframe') || node.querySelector('iframe')))))this.bindFrames();
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
        this.cursorTimer=setInterval(()=>{if(Date.now()-this.presenceReceivedAt>=PRESENCE_TIMEOUT)this.scheduleCursorRender(false);},1000);
    }

    watchGraphs() {
        if(this.stopped || this.graphTimer || document.hidden)return;
        const local=this.pointer && document.elementFromPoint(this.pointer.x,this.pointer.y)?.matches('canvas');
        if(!local && !this.remoteCursors.some(client=>client.cursor.ui?.graph))return;
        const models=graphModels();if(!models.length)return;
        const revision=JSON.stringify(models.map(({graphEngine:engine})=>[engine.positionVersion,engine.geometryVersion,engine.camera.x,engine.camera.y,engine.camera.scale]));
        if(revision!==this.graphRevision){this.graphRevision=revision;this.scheduleCursorRender(false);this.queueActivity();}
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
            this.scheduleCursorRender(false);
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
            this.scheduleCursorRender(false);
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
            this.scheduleCursorRender(false);
        } finally { this.selectionSending = false; }
    }

    scheduleCursorRender(animate) {
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
        if (!document.hidden && Date.now() - this.presenceReceivedAt < PRESENCE_TIMEOUT) {
            for (const client of this.remoteCursors) {
                if (client.name === this.clientName || !this.clients.some((person) => person.name === client.name)) continue;
                const point = resolveCursor(client.cursor, this);
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
                    marker.append(arrow, label);
                    this.cursorLayer.append(marker);
                    this.cursorMarkers.set(client.name, marker);
                }
                const label=marker.querySelector('span');
                label.textContent=client.name + (client.cursor.state ? ' · '+this.i18n[client.cursor.state==='typing' ? 'cursorTyping':'cursorEditing']:'');
                marker.style.setProperty("--collab-cursor-hue", String(client.hue));
                const target=JSON.stringify([client.cursor.surface,client.cursor.documentId,client.cursor.blockId,client.cursor.region,client.cursor.ui]);
                marker.style.transitionDuration = animate && marker.cursorTarget===target ? `${Math.min(120, 1000 / this.tick)}ms` : "0ms";
                marker.cursorTarget=target;
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
        this.renderEditing();
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
                details.append(document.createElement('strong'),document.createElement('span'));
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
            const own=client.name===this.clientName;
            row.querySelector('strong').textContent=client.name+(own ? ' · '+this.i18n.self : '');
            const page=row.querySelector('span');page.textContent=client.page?.title || (client.documentId ? this.i18n.pageDocument : this.i18n.pageWorkspace);page.title=page.textContent;
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
        for (const event of EDITOR_EVENTS) this.eventBus.off(event, this.handleDocument);
        await Promise.allSettled([this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors), this.kernel.rpc.unbind("shortcut-shown", this.handleShortcut)]);
        await this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation).catch(() => {});
    }
};
