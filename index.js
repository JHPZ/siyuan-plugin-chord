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
        (step.nameKey===undefined || typeof step.nameKey==='string' && /^[a-f0-9]{16}$/.test(step.nameKey)) &&
        Number.isSafeInteger(step.count) && step.count>0 && step.count<=10000 &&
        Number.isSafeInteger(step.index) && step.index>=0 && step.index<step.count;
}

function validComponentRoute(route) {
    return Array.isArray(route) && route.length<=32 && route.every(validComponentStep);
}

function validComponentEdge(edge) {
    return edge && ['start','end'].includes(edge.side) && (edge.kind==='self' || edge.kind==='paint' || edge.kind==='image' || edge.kind==='list' || edge.kind==='list-first' || edge.kind==='list-last' || edge.kind==='frame' || edge.kind==='frame-box' || edge.kind==='field' || edge.kind==='field-viewport' || edge.kind==='range-thumb' || edge.kind==='range-track' || edge.kind==='switch-thumb' || edge.kind==='switch-track' || edge.kind==='switch-halo' || ['checkbox-face','checkbox-background','checkbox-check','checkbox-dash','color-swatch','color-fill'].includes(edge.kind) || ['scrollbar-x-thumb','scrollbar-y-thumb','scrollbar-x-before','scrollbar-y-before','scrollbar-x-after','scrollbar-y-after','scrollbar-corner','picker-box','picker-border','picker-viewport','picker-content'].includes(edge.kind) ||
        edge.kind==='child' && validComponentStep(edge.step) ||
        edge.kind==='text' && Number.isSafeInteger(edge.offset) && edge.offset>=0 && edge.offset<=10000000);
}

function validComponentAnchor(value) {
    const scope=value.scope;
    return value.kind==='component' && scope && ['document','dock','dialog','floating','tab','global','av','calendar','tree','control'].includes(scope.kind) &&
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
    const step=s=>({key:s.key,count:s.count,index:s.index,...(s.nameKey ? {nameKey:s.nameKey}:{})});
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
const COMPONENT_HIGHLIGHT_TEXT='.protyle-hint .b3-list-item__text,.search__list .b3-list-item__text,.search__list .b3-list-item__meta,.search__list [data-av-search-match],.search__list .search__av-content > .fn__code,#searchAssetPreview > p,.b3-menu[data-name^="appearanceFontFamily-"] [data-type="available-fonts"] .b3-menu__label';
const COMPONENT_FONT_MENU='.b3-menu:is([data-name="appearanceFontFamily-globalFontFamilies"],[data-name="appearanceFontFamily-fontFamilies"],[data-name="appearanceFontFamily-codeFontFamilies"])';
const COMPONENT_DATE_FIELD='input[type="date"],input[type="time"],input[type="datetime-local"]';
const COMPONENT_NUMBER_SETTINGS=new Map([
    ["editor",["editor.cursorSurroundingLines","editor.dynamicLoadBlocks","editor.blockRefDynamicAnchorTextMaxLen","editor.backlinkExpandCount","editor.backmentionExpandCount"]],
    ["file",["fileTree.maxOpenTabCount","editor.generateHistoryInterval","editor.historyRetentionDays","fileTree.maxListCount","fileTree.largeFileWarningSize","fileTree.recentDocsMaxListCount"]],
    ["appearance",["editor.floatWindowDelay"]],
    ["flashcard",["flashcard.newCardLimit","flashcard.reviewCardLimit","flashcard.requestRetention","flashcard.maximumInterval"]],
    ["ai",["ai.editing.maxCompletionTokens","ai.editing.maxHistoryMessages","ai.editing.temperature","ai.agent.maxCompletionTokens","ai.agent.maxToolCallRounds","ai.agent.temperature","ai.agent.sessionTimeout","ai.agent.streamIdleTimeout","ai.agent.confirmTimeout","ai.agent.maxRetries","ai.web.timeout","ai.imageGeneration.requestTimeout","ai.embedding.dimensions","ai.embedding.timeout","ai.embedding.concurrency","ai.embedding.batchSize","ai.rerank.candidateCount","ai.rerank.timeout"]],
    ["ocr",["ocrThreshold_detection","ocrThreshold_box","ocrThreshold_recognition"]],
    ["search",["search.backlinkMentionKeywordsLimit","search.limit"]],
    ["sync",["sync.interval","repo.indexRetentionDays","repo.retentionIndexesDaily"]],
    ["access",["notebookCrypto.autoLockMinutes","publish.port"]],
    ["app",["networkProxyPort"]]
]);
const COMPONENT_TEXT_SETTINGS=new Map([
    ['editor',['editor.plantUMLServePath']],
    ['file',['fileTree.docCreateSavePath','fileTree.docCreateTemplatePath','fileTree.refCreateSavePath']],
    ['flashcard',['flashcard.weights']],
    ['ai',['ai.embedding.baseURL','ai.embedding.name','ai.rerank.endpoint','ai.rerank.name']],
    ['export',['export.blockRefTextLeft','export.blockRefTextRight','export.tagOpenMarker','export.tagCloseMarker','export.pdfFooter','export.pdfWatermarkStr','export.imageWatermarkStr','export.pdfWatermarkDesc','export.imageWatermarkDesc']]
]);
const componentRenderTargets=new WeakMap();
const componentRangeStyles=new Map();
const componentColorStyles=new Map();
const componentPickerStyles=new Map();
const componentFieldStyles=new Map();
const componentDateStyles=new Map();
const componentDateValues=new WeakMap();
const componentCheckboxPaint=new WeakMap();
let componentColorEditors=new WeakMap();
let componentMeasurements;

function clearComponentStyles(doc) {
    if(doc)for(const panel of doc.querySelectorAll('[data-panel="customEditor"]'))componentColorEditors.delete(panel);
    else componentColorEditors=new WeakMap();
    for(const styles of [componentRangeStyles,componentColorStyles,componentPickerStyles,componentFieldStyles,componentDateStyles]){
        if(doc){styles.get(doc)?.remove();styles.delete(doc);}
        else{for(const style of styles.values())style.remove();styles.clear();}
    }
}

function componentPickerStyle(doc) {
    if(!doc.head)return null;
    let style=componentPickerStyles.get(doc);
    if(!style){style=doc.createElement('style');style.className='collab-picker-anchor';style.textContent='select:has(> .collab-picker-unanchored)::picker(select){anchor-name:--collab-picker-measure!important}';componentPickerStyles.set(doc,style);}
    if(!style.isConnected)doc.head.append(style);
    return style;
}

function componentNativeRules(doc,kind,sources) {
    if(!doc.head || !doc.styleSheets)return null;
    const pseudo=kind.startsWith('date:')?'::-webkit-'+kind.slice(5):null,match=pseudo&&new RegExp(pseudo+'(?![\\w-])');
    const extract=rule=>{
        if(rule.styleSheet){const rules=[...rule.styleSheet.cssRules].map(extract).filter(Boolean);let text=rules.join('\n');if(!text)return '';if(rule.media.mediaText)text='@media '+rule.media.mediaText+'{'+text+'}';if(rule.supportsText)text='@supports ('+rule.supportsText+'){'+text+'}';if(rule.layerName!==null && rule.layerName!==undefined)text='@layer '+rule.layerName+'{'+text+'}';return text;}
        if(rule.selectorText){
            if(kind.startsWith('date:')){
                if(!match.test(rule.selectorText)){if(rule.cssRules?.length&&rule.cssText.includes(pseudo))throw Error('Unsupported nested native date selector');return '';}
                // shortcut: nested selector lists need a selector parser before their native styles can be mirrored.
                if(rule.cssRules?.length||rule.selectorText.includes(':is(')||rule.selectorText.includes(':where(')||rule.selectorText.includes(':not(')||rule.selectorText.includes(':has(')||rule.selectorText.includes(pseudo+':'))throw Error('Unsupported native date selector');
                const selectors=rule.selectorText.split(',').filter(selector=>match.test(selector));
                return selectors.map(selector=>selector.replaceAll(pseudo,'::before')).join(',')+'{'+rule.style.cssText+'}';
            }
            if(!rule.selectorText.includes(kind==='color'?'::-webkit-color-swatch':'::-webkit-slider-'))return '';
            let text=rule.cssText.replaceAll('::-webkit-color-swatch-wrapper','::before').replaceAll('::-webkit-color-swatch','::after').replaceAll('::-webkit-slider-thumb',':where(input.b3-slider[type="range"])::before').replaceAll('::-webkit-slider-runnable-track',':where(input.b3-slider[type="range"])::after');
            const width=rule.style.getPropertyValue('width');
            if(kind==='range' && width && rule.selectorText.includes('::-webkit-slider-runnable-track'))text=text.slice(0,-1)+';--collab-range-auto:'+(width==='auto' ? 1:0)+(rule.style.getPropertyPriority('width') ? ' !important':'')+'}';
            return text;
        }
        if(rule.cssRules){const rules=[...rule.cssRules].map(extract).filter(Boolean);return rules.length ? rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+rules.join('\n')+'}':'';}
        return '';
    };
    let rules;
    try{rules=(sources||[...doc.styleSheets]).filter(sheet=>!sheet.disabled && !sheet.ownerNode?.matches?.('.collab-range-measure,.collab-date-measure')).flatMap(sheet=>{const rules=[...sheet.cssRules].map(extract).filter(Boolean);return sheet.media.mediaText && rules.length ? ['@media '+sheet.media.mediaText+'{'+rules.join('\n')+'}']:rules;});}catch{return null;}
    return rules;
}

function componentRangeStyle(doc) {
    const rules=componentNativeRules(doc,'range');if(!rules?.length)return null;
    // Generated, hidden pseudos expose native thumb transitions without changing the input box.
    const css=':where(input.b3-slider[type="range"])::after{--collab-range-auto:1}\n'+rules.join('\n')+'\n:where(input.b3-slider[type="range"])::before,:where(input.b3-slider[type="range"])::after{content:"" !important;position:fixed !important;left:0 !important;top:0 !important;visibility:hidden !important;pointer-events:none !important}';
    let style=componentRangeStyles.get(doc);
    if(!style){style=doc.createElement('style');style.className='collab-range-measure';componentRangeStyles.set(doc,style);}
    if(style.textContent!==css)style.textContent=css;
    if(!style.isConnected)doc.head.append(style);
    return style;
}

function componentRange(element) {
    if(!element.matches('input.b3-slider[type="range"]') || element.closest('[data-private]'))return null;
    const doc=element.ownerDocument,view=doc.defaultView,css=view.getComputedStyle(element);
    // shortcut: horizontal native tracks use auto width; extend the map before accepting other track layouts.
    if(css.appearance!=='none' || css.writingMode!=='horizontal-tb' || !componentRangeStyle(doc))return null;
    const box=frameBox(element);if(!box)return null;
    const thumb=view.getComputedStyle(element,'::before'),track=view.getComputedStyle(element,'::after');
    const size=(style,axis)=>{const sides=axis==='width' ? ['Left','Right']:['Top','Bottom'];return parseFloat(style[axis])+(style.boxSizing==='border-box' ? 0:sides.reduce((sum,side)=>sum+parseFloat(style['padding'+side])+parseFloat(style['border'+side+'Width']),0));};
    const width=size(thumb,'width'),height=size(thumb,'height'),trackHeight=size(track,'height'),content=box.content,trackWidth=content.right-content.left;
    const min=Number.isFinite(parseFloat(element.min)) ? parseFloat(element.min):0,max=Number.isFinite(parseFloat(element.max)) ? parseFloat(element.max):100,value=element.valueAsNumber;
    if(![width,height,trackHeight,trackWidth,value].every(Number.isFinite) || width<=0 || height<=0 || trackHeight<=0 || trackWidth<width || track.getPropertyValue('--collab-range-auto').trim()!=='1' || track.transform!=='none' || thumb.display==='none' || track.display==='none')return null;
    const ratio=max>min ? Math.max(0,Math.min(1,(value-min)/(max-min))):0,left=content.left+(trackWidth-width)*(css.direction==='rtl' ? 1-ratio:ratio)+parseFloat(thumb.marginLeft),top=(content.top+content.bottom-trackHeight)/2;
    const matrix=new view.DOMMatrix(thumb.transform==='none' ? undefined:thumb.transform),origin=thumb.transformOrigin.split(' ').map((value,index)=>value.endsWith('%') ? parseFloat(value)*(index ? height:width)/100:parseFloat(value));
    if(!matrix.is2D || matrix.b!==0 || matrix.c!==0 || matrix.a<=0 || matrix.d<=0 || !origin.slice(0,2).every(Number.isFinite))return null;
    const points=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>{const p=matrix.transformPoint({x:x-origin[0],y:y-origin[1]});return {x:left+origin[0]+p.x,y:top+parseFloat(thumb.marginTop)+origin[1]+p.y};});
    const painted={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
    return {box,thumb:painted,content:{left:Math.max(box.bounds.left,Math.min(content.left,painted.left)),right:Math.min(box.bounds.right,Math.max(content.right,painted.right)),top:Math.max(box.bounds.top,Math.min(content.top,painted.top)),bottom:Math.min(box.bounds.bottom,Math.max(content.bottom,painted.bottom))},track:{left:content.left,right:content.right,top,bottom:top+trackHeight}};
}

function rememberColorEditor(event) {
    const action=event.target?.closest?.('[data-action="edit"],[data-action="new"]');
    if(!action || action.closest('[data-private]') || action.matches(':disabled,[aria-disabled="true"]') || !visibleElement(action))return;
    const listPanel=action.closest('[data-panel="list"]'),root=listPanel?.parentElement,panel=root?.querySelector(':scope > [data-panel="customEditor"]');
    if(!panel || visibleElement(panel))return;
    componentColorEditors.delete(panel);
    const lists=listPanel.querySelectorAll('[data-type="inlineStyleList"],[data-type="avCustomColorList"]');if(lists.length!==1)return;
    const list=lists[0],kind=list.dataset.type,row=action.closest('.b3-list-item[data-kind="custom"][data-key]'),fresh=action.dataset.action==='new';
    if(fresh ? !action.closest('[data-type="'+(kind==='inlineStyleList'?'inlineStyleButtons':'avColorButtons')+'"]') : !row || row.parentElement!==list)return;
    const key=fresh ? 'new':row.dataset.key;
    if(!fresh && !(kind==='inlineStyleList' ? DOCUMENT_ID.test(key):/^[1-9]\d*$/.test(key) && Number(key)>=15 && Number(key)<=78))return;
    const record={list,key,kind,ready:false};componentColorEditors.set(panel,record);
    // Native handlers stop bubbling; a new task runs after real click dispatch has finished.
    panel.ownerDocument.defaultView.setTimeout(()=>{
        if(componentColorEditors.get(panel)!==record || !visibleElement(panel) || !panel.closest('.b3-dialog')?.querySelector('[data-action="confirmEdit"]'))return;
        record.label=textLabel(panel.querySelector(kind==='inlineStyleList'?'[data-field="typeLabel"]':'[data-field="colorIndex"]'));
        record.ready=!!record.label;
    });
}

function componentColorContext(element) {
    const panel=element.closest('[data-panel="customEditor"]');if(!panel)return undefined;
    const record=componentColorEditors.get(panel);
    // shortcut: editors already open at plugin startup stay hidden until a native edit/new click supplies identity.
    if(!record?.ready || !visibleElement(panel) || panel.closest('[data-private]'))return null;
    const {list,key,kind,label}=record;
    if(!list.isConnected || list.dataset.type!==kind || list.closest('[data-private]') || list.closest('[data-panel="list"]')?.parentElement!==panel.parentElement ||
        textLabel(panel.querySelector(kind==='inlineStyleList'?'[data-field="typeLabel"]':'[data-field="colorIndex"]'))!==label)return null;
    if(key!=='new' && [...list.children].filter(row=>row.matches('.b3-list-item[data-kind="custom"]') && row.dataset.key===key).length!==1)return null;
    return [kind,key,label];
}

function componentColor(element) {
    if(!element.matches('input[type="color"]') || element.closest('[data-private]'))return null;
    if(componentColorContext(element)===null)return null;
    const cache=componentMeasurements && (componentMeasurements.colors ||= new WeakMap());if(cache?.has(element))return cache.get(element);
    const doc=element.ownerDocument,view=doc.defaultView,css=view.getComputedStyle(element),box=frameBox(element);
    if(!box || !['none','auto'].includes(css.appearance) || !/Chrome\//.test(view.navigator.userAgent))return null;
    const rules=componentNativeRules(doc,'color');if(!rules)return null;
    const text=':where(input[type="color"])::before{display:flex;position:static;box-sizing:border-box;width:100%;height:100%;padding:4px 2px;border:0;margin:0}\n:where(input[type="color"])::after{display:block;position:static;box-sizing:content-box;width:auto;height:auto;flex:1;min-width:0;border:1px solid #777;margin:0;padding:0}\n'+rules.join('\n')+'\n:where(input[type="color"])::before,:where(input[type="color"])::after{content:none!important}';
    let style=componentColorStyles.get(doc);if(!style){style=doc.createElement('style');style.className='collab-text-measure collab-color-measure';componentColorStyles.set(doc,style);}if(style.textContent!==text)style.textContent=text;if(!style.isConnected)doc.head.append(style);
    const wrapper=view.getComputedStyle(element,'::before'),swatch=view.getComputedStyle(element,'::after'),n=(s,key)=>parseFloat(s[key]);
    // shortcut: other native flex layouts, pseudo transforms and rounded swatches need their own geometry calibration.
    if(wrapper.display!=='flex' || wrapper.boxSizing!=='border-box' || wrapper.width!=='100%' || wrapper.height!=='100%' || wrapper.flexDirection!=='row' || wrapper.flexWrap!=='nowrap' || !['normal','stretch'].includes(wrapper.alignItems) || ['Top','Right','Bottom','Left'].some(side=>n(wrapper,'margin'+side)!==0) || swatch.flexGrow!=='1' || swatch.flexBasis!=='0%' || !['auto','stretch'].includes(swatch.alignSelf) || swatch.width!=='auto' || swatch.height!=='auto' || [wrapper,swatch].some(s=>s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<=.01||s.position!=='static'||s.writingMode!=='horizontal-tb'||s.minWidth!=='0px'||s.minHeight!=='0px'||s.maxWidth!=='none'||s.maxHeight!=='none'||s.filter!=='none'||s.clipPath!=='none'||s.transform!=='none'||s.rotate!=='none'||s.scale!=='none'||s.translate!=='none'||['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'].some(k=>parseFloat(s[k])!==0)))return null;
    const rect={},fill={};for(const [side,axis]of [['left','Left'],['right','Right'],['top','Top'],['bottom','Bottom']]){const sign=['left','top'].includes(side)?1:-1,margin=n(swatch,'margin'+axis),inset=n(wrapper,'border'+axis+'Width')+n(wrapper,'padding'+axis);if(!Number.isFinite(margin+inset)||margin<0||inset<0)return null;rect[side]=box.content[side]+sign*(margin+inset);fill[side]=rect[side]+sign*n(swatch,'border'+axis+'Width');}
    if(![...Object.values(rect),...Object.values(fill)].every(Number.isFinite) || fill.left>=fill.right || fill.top>=fill.bottom)return null;
    const result={box,swatch:rect,fill};cache?.set(element,result);return result;
}

function componentCheckbox(element) {
    if(!element.matches('input[type="checkbox"]:not(.b3-switch)'))return null;
    const view=element.ownerDocument.defaultView,css=view.getComputedStyle(element);
    if(!['auto','checkbox'].includes(css.appearance) || !/Chrome\//.test(view.navigator.userAgent))return null;
    const box=frameBox(element);if(!box)return null;
    const width=box.bounds.right,height=box.bounds.bottom,size=Math.min(width,height),left=(width-size)/2,top=(height-size)/2;
    // shortcut: native raster snapping and border/corner geometry still need separate calibration.
    return {box,face:{left,top,right:left+size,bottom:top+size}};
}

function componentCheckboxPart(element,checkbox,point) {
    const face=checkbox.face,size=face.right-face.left,x=(point.x-face.left)/size,y=(point.y-face.top)/size;
    if(size>2 && element.matches(':indeterminate')){
        const left=5/26,right=21/26,top=11/26,bottom=15/26,radius=Math.min(2/size,(right-left)/2,(bottom-top)/2);
        const dx=Math.max(left+radius-x,0,x-right+radius),dy=Math.max(top+radius-y,0,y-bottom+radius);
        if(x>=left && x<=right && y>=top && y<=bottom && dx*dx+dy*dy<=radius*radius)return 'checkbox-dash';
    }else if(size>2 && element.matches(':checked')){
        const doc=element.ownerDocument;let paint=componentCheckboxPaint.get(doc);
        if(!paint){const context=doc.createElement('canvas').getContext('2d');if(!context)return null;context.lineWidth=.16;context.lineCap='butt';context.lineJoin='miter';paint={context,path:new doc.defaultView.Path2D('M.2 .5L.4 .7L.8 .2')};componentCheckboxPaint.set(doc,paint);}
        if(paint.context.isPointInStroke(paint.path,x,y))return 'checkbox-check';
    }
    return 'checkbox-background';
}

function componentSwitch(element) {
    if(!element.matches('input.b3-switch[type="checkbox"]') || element.closest('[data-private]'))return null;
    const view=element.ownerDocument.defaultView,css=view.getComputedStyle(element),box=frameBox(element);
    if(!box || css.appearance!=='none' || !['relative','absolute','fixed'].includes(css.position))return null;
    const rect=componentSwitchPart(element,box,view.getComputedStyle(element,'::after'),css);
    if(!rect || rect.left<0 || rect.top<0 || rect.right>box.bounds.right || rect.bottom>box.bounds.bottom)return null;
    const before=view.getComputedStyle(element,'::before'),color=before.backgroundColor.match(/^rgba?\([\d.]+, [\d.]+, [\d.]+(?:, ([\d.]+))?\)$/);
    const halo=before.borderRadius==='50%' && before.backgroundImage==='none' && before.boxShadow==='none' && before.filter==='none' && color && Number(color[1]??1)>0 ? componentSwitchPart(element,box,before,css):null;
    return {box,content:box.content,track:box.content,thumb:rect,halo};
}

function componentSwitchPart(element,box,thumb,css) {
    const view=element.ownerDocument.defaultView;
    if(thumb.content!=='""' || thumb.position!=='absolute' || thumb.display==='none' || thumb.visibility!=='visible' || Number(thumb.opacity)===0 || thumb.rotate!=='none' || thumb.scale!=='none' || thumb.translate!=='none')return null;
    const size=axis=>parseFloat(thumb[axis])+(thumb.boxSizing==='border-box' ? 0:(axis==='width'?['Left','Right']:['Top','Bottom']).reduce((n,side)=>n+parseFloat(thumb['padding'+side])+parseFloat(thumb['border'+side+'Width']),0)),width=size('width'),height=size('height');
    const inset=side=>parseFloat(css['border'+side+'Width']),position=(value,total)=>/^[-\d.]+(px|%)$/.test(value) ? parseFloat(value)*(value.endsWith('%')?total/100:1):NaN;
    const left=inset('Left')+position(thumb.left,box.bounds.right-inset('Left')-inset('Right'))+parseFloat(thumb.marginLeft),top=inset('Top')+position(thumb.top,box.bounds.bottom-inset('Top')-inset('Bottom'))+parseFloat(thumb.marginTop);
    const matrix=new view.DOMMatrix(thumb.transform==='none'?undefined:thumb.transform),origin=thumb.transformOrigin.split(' ').map((v,i)=>position(v,i?height:width));
    // shortcut: native switch knobs only translate and scale; reject custom rotated knobs until their local plane is calibrated.
    if(![width,height,left,top,...origin.slice(0,2)].every(Number.isFinite) || width<=0 || height<=0 || !matrix.is2D || matrix.b!==0 || matrix.c!==0 || matrix.a<=0 || matrix.d<=0)return null;
    const first=matrix.transformPoint({x:-origin[0],y:-origin[1]}),last=matrix.transformPoint({x:width-origin[0],y:height-origin[1]}),rect={left:left+origin[0]+first.x,top:top+origin[1]+first.y,right:left+origin[0]+last.x,bottom:top+origin[1]+last.y};
    return rect;
}

function componentSwitchHaloContains(rect,point) {
    return !!rect && ((2*point.x-rect.left-rect.right)/(rect.right-rect.left))**2+((2*point.y-rect.top-rect.bottom)/(rect.bottom-rect.top))**2<=1;
}

function rememberRenderTarget({detail}) {
    const {protyle,toolbar,blockElement,renderElement}=detail || {},popup=toolbar?.subElement;
    if(!popup?.matches('.protyle-util') || !protyle?.element?.contains(popup) || !blockElement?.contains(renderElement))return;
    componentRenderTargets.set(popup,{editor:protyle.element,block:blockElement,target:renderElement,field:popup.querySelector('textarea')});
}

function componentRenderTarget(popup) {
    const context=componentRenderTargets.get(popup);
    if(!context)return null;
    const {editor,block,target,field}=context,id=block.getAttribute('data-node-id');
    if(!field || popup.querySelector('textarea')!==field || !editor.contains(popup) || !editor.querySelector('.protyle-wysiwyg')?.contains(block) || !block.contains(target) || !DOCUMENT_ID.test(id || ''))return null;
    const route=componentRoute(block,target);
    return route ? [id,componentKey(target),route]:null;
}

function componentSourceField(element) {
    const popup=element.closest('.protyle-util');
    return element.matches('textarea') && popup && componentRenderTargets.get(popup)?.field===element && !!componentRenderTarget(popup);
}

function componentSelectField(element) {
    if(!element.matches('input.b3-select[readonly][data-menu="true"]') || element.type!=='text')return false;
    const section=element.closest('.config__tab-container');
    if(section?.dataset.name==='appearance')return ['appearance.globalFontFamilies','editor.fontFamilies','editor.codeFontFamilies'].includes(element.id);
    const group=element.getAttribute('data-group'),owner=element.closest('.config-item[data-type="aiModelPicker"]');
    return section?.dataset.name==='ai' && element.getAttribute('data-type')==='groupedModelPicker' && ['editing','agent','imageGeneration'].includes(group) &&
        owner?.id==='aiModelPickerBlock-'+group && owner.dataset.name===group && section.querySelectorAll('input[data-type="groupedModelPicker"][data-group="'+group+'"]').length===1;
}

function componentFontIdentity(element) {
    if(element.matches('.config-font-family__chip.b3-chip--dragclone'))return componentFontDragTarget(element)?.font || null;
    const row=element.matches('.b3-list-item') && element.parentElement?.matches('[data-type="available-fonts"]') && element.closest(COMPONENT_FONT_MENU),chip=element.matches('.config-font-family__chip') && element.closest('.config__tab-container')?.dataset.name==='appearance' && ['globalFontFamilies','fontFamilies','codeFontFamilies'].includes(element.closest('[data-font-config-key]')?.dataset.fontConfigKey);
    const menu=!row && !chip && element.matches('.b3-menu__item') && componentFontMenuTarget(element.closest('.b3-menu'));
    if(!row && !chip && !menu)return menu===null ? null:undefined;
    const label=chip ? element:element.querySelector(':scope > .b3-menu__label'),family=menu ? menu.family:label?.dataset.family,weight=menu ? label?.style.fontWeight:label?.dataset.weight;
    if(menu){const style=element.ownerDocument.createElement('span').style;style.fontFamily=family;if(!style.fontFamily || label?.style.fontFamily!==style.fontFamily)return null;}
    return family && family.length<=512 && !/[\x00-\x1f]/.test(family) && /^\d{1,4}$/.test(weight || '') && Number(weight)>0 && Number(weight)<=1000 ? [family,Number(weight)]:null;
}

function componentFontMenuTarget(element) {
    const menu=window.siyuan?.menus?.menu,target=menu?.position?.target;
    if(!element || menu?.element!==element || !target?.matches?.('.config-font-family__chip'))return undefined;
    const font=componentFontIdentity(target),group=target.closest('[data-font-config-key]');
    if(!font || !target.isConnected || !visibleElement(target) || target.closest('[data-private]') || [...group.querySelectorAll('.config-font-family__chip')].filter(chip=>chip.dataset.family===font[0]).length!==1)return null;
    return {group:group.dataset.fontConfigKey,family:font[0]};
}

function componentFontDragTarget(clone) {
    const doc=clone.ownerDocument;
    if(clone.parentElement!==doc.body || clone.closest('[data-private]') || !visibleElement(clone) || doc.defaultView.getComputedStyle(clone).position!=='fixed' || doc.querySelectorAll('.config-font-family__chip.b3-chip--dragclone:not(.collab-text-measure)').length!==1)return null;
    const sources=[...doc.querySelectorAll('.config-font-family__chip.b3-chip--dragging:not(.b3-chip--dragclone)')].filter(source=>visibleElement(source) && !source.closest('[data-private]'));
    if(sources.length!==1)return null;
    const source=sources[0],font=componentFontIdentity(source),group=source.closest('[data-font-config-key]');
    if(!font || clone.dataset.family!==font[0] || Number(clone.dataset.weight)!==font[1] || [...group.querySelectorAll('.config-font-family__chip')].filter(chip=>chip.dataset.family===font[0]).length!==1)return null;
    return {source,font,group:group.dataset.fontConfigKey};
}

function componentDateField(element) {
    const cache=componentMeasurements && (componentMeasurements.dates ||= new WeakMap());if(cache?.has(element))return cache.get(element);
    const result=measureComponentDateField(element);cache?.set(element,result);return result;
}

function componentDateSheets(doc) {
    const cache=componentMeasurements && (componentMeasurements.dateSheets ||= new WeakMap());if(cache?.has(doc))return cache.get(doc);
    let sources=null;
    try{sources=[...doc.styleSheets].filter(sheet=>!sheet.disabled&&!sheet.ownerNode?.matches?.('.collab-range-measure,.collab-date-measure')).map(sheet=>({media:sheet.media,cssRules:[...sheet.cssRules].filter(rule=>rule.styleSheet||/::-webkit-(?:datetime-edit|calendar-picker-indicator)/.test(rule.selectorText||rule.cssText)||rule.cssRules?.length&&/::-webkit-(?:datetime-edit|calendar-picker-indicator)/.test(rule.cssText))}));}catch{}
    cache?.set(doc,sources);return sources;
}

function componentPartialDate(element,selector,style,host,styles,rects,probes,inherited,textStyle) {
    const doc=element.ownerDocument,view=doc.defaultView,base=style.textContent,values=[],states=[],rules=[],bits=[19,4,5,5,6,6,10],labels=[[' 年 ','yyyy','----'],['月','mm'],['日','dd'],['--','hh'],['--','mm'],['--','ss'],['---','fff']];
    const probe=name=>{const node=doc.createElement('i');node.style.cssText='all:initial;position:fixed;position-anchor:'+name+';left:anchor(left,-100000px);top:anchor(top,-100000px);width:anchor-size(width,0px);height:anchor-size(height,0px);visibility:hidden;pointer-events:none';host.append(node);return node;};
    const resolved=node=>{const r=node.getBoundingClientRect();return r.left>-99999&&r.width>0&&r.height>0;};
    const previous=componentDateValues.get(element),indices=Array.from({length:7},(_,index)=>index).filter(index=>rects[index+2].width&&rects[index+2].height);
    // The caller clears state anchors after glyph measurement; they do not change field geometry.
    // Verify the last decoded state against native attributes each time; unchanged fields need no bit probes.
    if(previous&&previous.length===indices.length&&previous.every((state,i)=>state.index===indices[i])){
        const checks=previous.map(state=>{const name='--collab-date-state-'+state.index+'-same',condition=state.missing?'style(--collab-date-value < 0) and style(--collab-date-placeholder:'+JSON.stringify(state.value)+')':'style(--collab-date-value >= '+Number(state.value)+') and style(--collab-date-value <= '+Number(state.value)+')',anchors=[styles[state.index+2].get('anchor-name'),'--collab-date-'+(state.index+2),'if('+condition+':'+name+';else:'+name+'-changed)'].filter(value=>value!=='none');return {state,node:probe(name),rule:selector+'::-webkit-datetime-edit-'+['year','month','day','hour','minute','second','millisecond'][state.index]+'-field{--collab-date-value:attr(aria-valuenow type(<number>),-1);--collab-date-placeholder:attr(aria-placeholder,"__missing__");anchor-name:'+anchors.join(',')+'!important}'};});
        style.textContent=base+'\n'+checks.map(check=>check.rule).join('\n');
        if(checks.every(check=>resolved(check.node)))for(const {state}of checks){values[state.index]=state.value;states.push({...state});}
    }
    if(!states.length){
    for(let index=0;index<7;index++){
        if(!rects[index+2].width||!rects[index+2].height)continue;
        const prefix='--collab-date-state-'+index,has=probe(prefix+'-has'),empty=probe(prefix+'-empty'),digits=[],placeholders=[],anchors=[styles[index+2].get('anchor-name'),'--collab-date-'+(index+2),'if(style(--collab-date-value >= 0):'+prefix+'-has;else:'+prefix+'-empty)'].filter(name=>name!=='none'),declarations=['--collab-date-value:attr(aria-valuenow type(<number>),-1)','--collab-date-placeholder:attr(aria-placeholder,"__missing__")'];
        for(let bit=0;bit<bits[index];bit++){const name=prefix+'-bit-'+bit;declarations.push('--collab-date-bit-'+bit+':mod(round(down,calc(var(--collab-date-value) / '+2**bit+'),1),2)');anchors.push('if(style(--collab-date-bit-'+bit+' > .5):'+name+';else:'+name+'-zero)');digits.push(probe(name));}
        anchors.push('if('+labels[index].map((text,i)=>{const name=prefix+'-placeholder-'+i;placeholders.push({text,node:probe(name)});return 'style(--collab-date-placeholder:'+JSON.stringify(text)+'):'+name;}).join(';')+';else:'+prefix+'-unknown)');
        rules.push(selector+'::-webkit-datetime-edit-'+['year','month','day','hour','minute','second','millisecond'][index]+'-field{'+declarations.join(';')+';anchor-name:'+anchors.join(',')+'!important}');states.push({index,has,empty,digits,placeholders});
    }
        style.textContent=base+'\n'+rules.join('\n');
        for(const state of states){
            const present=resolved(state.has);if(present===resolved(state.empty))return null;
            if(present){const value=state.digits.reduce((sum,node,bit)=>sum+(resolved(node)?2**bit:0),0);values[state.index]=String(value).padStart(state.index===0?4:state.index===6?3:2,'0');}
            else{
                // shortcut: unrecognized native placeholder labels need locale calibration before drawing.
                const matches=state.placeholders.filter(p=>resolved(p.node));if(matches.length!==1)return null;values[state.index]=matches[0].text;state.missing=true;
            }
        }
        componentDateValues.set(element,states.map(state=>({index:state.index,missing:!!state.missing,value:values[state.index]})));
    }
        const missing=states.filter(state=>state.missing);
        if(missing.length&&doc.activeElement===element){
            const value=element.value,active=doc.activeElement,scroll=[];for(let node=element;node;node=node.parentElement)scroll.push({node,x:node.scrollLeft,y:node.scrollTop});
            // A native zero buffer has no ARIA value; only equal-width candidates need temporary typography.
            const candidates=missing.map(state=>({...state,options:[values[state.index],'0'.repeat(state.index===0?4:state.index===6?3:2)].map(text=>{const span=doc.createElement('span');span.style.cssText=textStyle;for(const name of inherited)span.style.setProperty(name,styles[state.index+2].get(name));span.textContent=text;host.append(span);return {text,span};})}));
            const match=state=>{const width=probes[state.index+2].getBoundingClientRect().width,s=styles[state.index+2],inset=['padding-left','padding-right','border-left-width','border-right-width'].reduce((sum,key)=>sum+parseFloat(s.get(key)),0),matches=state.options.filter(option=>{const range=doc.createRange();range.selectNodeContents(option.span);return Math.abs(range.getBoundingClientRect().width+inset-width)<.1;});if(matches.length!==1)return false;values[state.index]=matches[0].text;return true;},ambiguous=candidates.filter(state=>!match(state));
            if(ambiguous.length){
                style.textContent+='\n'+selector+'{font-family:serif!important;letter-spacing:1px!important}';
                const family=view.getComputedStyle(element).fontFamily;for(const state of ambiguous)for(const {span}of state.options){span.style.fontFamily=family;span.style.letterSpacing='1px';}
                if(!ambiguous.every(match))return null;
                style.textContent=base;
                if(element.value!==value||doc.activeElement!==active||scroll.some(p=>p.node.scrollLeft!==p.x||p.node.scrollTop!==p.y)||probes.some((probe,i)=>{const r=probe.getBoundingClientRect();return ['left','top','width','height'].some(key=>Math.abs(r[key]-rects[i][key])>.001);}))return null;
            }
        }
        return values;
}

function measureComponentDatePlane(element) {
    const doc=element.ownerDocument,view=doc.defaultView,plane=frameBox(element),css=view.getComputedStyle(element);
    // shortcut: native transform transitions/animations need calibration that does not override their transforms.
    const durations=css.transitionDuration.split(','),delays=css.transitionDelay.split(','),transform=name=>['all','transform','transform-origin','rotate','scale','translate'].includes(name.trim());
    if(!plane || !element.showPopover || css.transitionProperty.split(',').some((name,i)=>transform(name)&&(parseFloat(durations[i%durations.length])!==0||parseFloat(delays[i%delays.length])>0)) || element.getAnimations().some(animation=>animation.effect.getKeyframes().some(frame=>Object.keys(frame).some(name=>/^(transform(?:Origin)?|rotate|scale|translate)$/.test(name)))))return null;
    const before=element.getBoundingClientRect(),active=doc.activeElement,value=element.value,scroll=[];for(let node=element;node;node=node.parentElement)scroll.push({node,x:node.scrollLeft,y:node.scrollTop});
    const path=[];for(let node=element;node&&node!==doc.documentElement;node=node.parentElement)path.unshift(node.localName+':nth-child('+([...node.parentElement.children].indexOf(node)+1)+')');
    const selector=':root > '+path.join(' > '),style=doc.createElement('style');style.className='collab-text-measure collab-date-measure';
    const rule=transform=>selector+'{transform:'+transform+'!important;transform-origin:0 0!important;rotate:none!important;scale:none!important;translate:none!important}';let result;
    try{
        // Transform-only calibration leaves layout and the native partial edit buffer intact within this task.
        style.textContent=rule('none');doc.head.append(style);const parent=frameBox(element);if(!parent)return null;
        const det=parent.a*parent.d-parent.b*parent.c;style.textContent=rule('matrix('+[parent.d/det,-parent.b/det,-parent.c/det,parent.a/det,0,0].join(',')+')');
        const neutral=frameBox(element),origin=element.getBoundingClientRect();if(!neutral || Math.max(Math.abs(neutral.a-1),Math.abs(neutral.b),Math.abs(neutral.c),Math.abs(neutral.d-1))>1e-5)return null;
        result=measureComponentDateField(element,true);if(!result)return null;
        const port=result.content.viewport;result.content.viewport={left:port.left,right:port.right,top:port.top,bottom:port.bottom,width:port.width,height:port.height};
        for(const rect of [result.content,result.content.viewport,result.image,...result.glyphs.map(glyph=>glyph.rect)].filter(Boolean)){rect.left-=origin.left;rect.right-=origin.left;rect.top-=origin.top;rect.bottom-=origin.top;}
        plane.rect=target=>target===element?{...plane.bounds,width:plane.bounds.right,height:plane.bounds.bottom}:null;result.plane=plane;
    }finally{
        style.remove();const after=element.getBoundingClientRect();if(element.value!==value || doc.activeElement!==active || scroll.some(p=>p.node.scrollLeft!==p.x||p.node.scrollTop!==p.y) || ['left','top','width','height'].some(key=>Math.abs(before[key]-after[key])>.001))result=null;
    }
    return result;
}

function measureComponentDateField(element,plane=false) {
    const doc=element.ownerDocument,view=doc.defaultView,css=view.getComputedStyle(element),before=element.getBoundingClientRect();
    // shortcut: twelve-hour fields need independent native state calibration.
    if(!doc.head||!view.CSS.supports('anchor-name','--collab-date')||css.writingMode!=='horizontal-tb')return null;
    if(!plane){let transformed=false;for(let parent=element;parent;parent=parent.parentElement){const s=view.getComputedStyle(parent),m=new view.DOMMatrix(s.transform==='none'?undefined:s.transform);transformed ||= s.zoom!=='1'||!m.is2D||m.a!==1||m.b!==0||m.c!==0||m.d!==1||s.scale!=='none'||s.rotate!=='none'||s.perspective!=='none';}if(transformed)return measureComponentDatePlane(element);}
    const ownBefore=view.getComputedStyle(element,'::before');if(!['none','normal'].includes(ownBefore.content))return null;
    const sources=componentDateSheets(doc);if(!sources)return null;
    const path=[];for(let node=element;node&&node!==doc.documentElement;node=node.parentElement)path.unshift(node.localName+':nth-child('+([...node.parentElement.children].indexOf(node)+1)+')');
    const selector=':root > '+path.join(' > '),fields=['year','month','day','hour','minute','second','millisecond','ampm'],parts=['datetime-edit','datetime-edit-fields-wrapper',...fields.map(key=>'datetime-edit-'+key+'-field'),'datetime-edit-text','calendar-picker-indicator'];
    const inherited=['font-family','font-size','font-style','font-weight','font-stretch','font-variant','font-feature-settings','font-variation-settings','font-kerning','line-height','letter-spacing','word-spacing','text-transform','direction','color','visibility'];
    const properties=[...inherited,'display','opacity','anchor-name','padding-left','padding-right','padding-top','padding-bottom','border-left-width','border-right-width','border-top-width','border-bottom-width','filter','clip-path','transform','rotate','scale','translate','background-origin','background-size','background-position','background-repeat'];
    let style=componentDateStyles.get(doc);if(!style){style=doc.createElement('style');style.className='collab-text-measure collab-date-measure';componentDateStyles.set(doc,style);}if(!style.isConnected)doc.head.append(style);
    const host=doc.createElement('div');host.className='collab-text-measure';host.setAttribute('aria-hidden','true');host.style.cssText='all:initial!important;position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;visibility:hidden!important;pointer-events:none!important';
    const styles=[],rects=[],glyphs=[];let result;
    try{
        for(let i=0;i<parts.length;i++){
            const rules=componentNativeRules(doc,'date:'+parts[i],sources);if(!rules)return null;
            const numeric=i>=2&&i<10,indicator=i===parts.length-1,parent=i===0||indicator?css:i===1?styles[0]:styles[1],inherit=inherited.map(name=>name+':'+parent.getPropertyValue(name)).join(';');
            const defaults=numeric?'display:inline;padding:1px;border:0;font:inherit!important':indicator?'display:inline-block;padding:'+(element.type==='time'?'3px':'2px')+';background-origin:content-box;background-size:contain;background-position:0% 0%;background-repeat:no-repeat':'display:inline-block;padding:'+(i===1?'1px 0':'0')+';border:0';
            if(!rules.length){
                const values=new Map(inherited.map(name=>[name,parent.getPropertyValue(name)]));
                for(const name of ['filter','clip-path','transform','rotate','scale','translate','anchor-name'])values.set(name,'none');
                values.set('display',numeric?'inline':'inline-block');values.set('opacity','1');
                for(const side of ['left','right','top','bottom']){values.set('border-'+side+'-width','0px');values.set('padding-'+side,(numeric?1:indicator?element.type==='time'?3:2:i===1&&['top','bottom'].includes(side)?1:0)+'px');}
                values.getPropertyValue=name=>values.get(name)||'';styles.push(values);continue;
            }
            style.textContent=':where('+selector+')::before{'+inherit+';'+defaults+'}\n'+rules.join('\n').replaceAll('::before',':where('+selector+')::before')+'\n:where('+selector+')::before{content:none!important}';
            const current=view.getComputedStyle(element,'::before'),values=new Map(properties.map(name=>[name,current.getPropertyValue(name)]));values.getPropertyValue=name=>values.get(name)||'';styles.push(values);
        }
        style.textContent=parts.map((part,i)=>selector+'::-webkit-'+part+'{anchor-name:'+(styles[i].get('anchor-name')==='none'?'':styles[i].get('anchor-name')+',')+'--collab-date-'+i+'!important}').join('\n');
        const probes=parts.map((_,i)=>{const probe=doc.createElement('i');probe.style.cssText='all:initial;position:fixed;position-anchor:--collab-date-'+i+';left:anchor(left,-100000px);top:anchor(top,-100000px);width:anchor-size(width,0px);height:anchor-size(height,0px);visibility:hidden;pointer-events:none';host.append(probe);return probe;});element.parentElement.append(host);
        if(plane){host.setAttribute('popover','manual');host.showPopover();if(!host.matches(':popover-open'))return null;}
        probes.forEach(probe=>rects.push(probe.getBoundingClientRect()));
        const hiddenLayout=[0,1].some(i=>styles[i].get('display')==='none');
        const after=element.getBoundingClientRect();if(['left','top','width','height'].some(key=>Math.abs(before[key]-after[key])>.001)||rects[9].width||!rects[1].width&&!hiddenLayout)return null;
        const visible=i=>{if(styles[i].get('visibility')!=='visible')return false;for(const index of i===parts.length-1?[i]:[0,1,i]){const s=styles[index];if(s.get('display')==='none'||Number(s.get('opacity'))<=.01||s.get('filter')!=='none'||s.get('clip-path')!=='none')return false;}return true;};
        const paint=i=>{const color=styles[i].get('color');return visible(i)&&!(color.startsWith('rgba(')&&/,\s*0\)$/.test(color)||/\/\s*0%?\)$/.test(color));};
        let zoom=1;for(let parent=element;parent;parent=parent.parentElement)zoom*=Number(view.getComputedStyle(parent).zoom)||1;
        // Preserve native font quantization at its effective zoom, then measure in the neutral plane.
        const textStyle='all:initial;position:fixed;left:0;top:0;display:inline-block;white-space:pre;visibility:hidden;pointer-events:none;zoom:'+css.zoom+';transform:scale('+1/zoom+');transform-origin:0 0';
        const tokens=[...element.value.matchAll(/\d+/g)],raw=element.type==='time'?[null,null,null,...tokens.map(token=>token[0])]:tokens.map(token=>token[0]);
        // Optional empty seconds/milliseconds can serialize as valid zero values while still displaying placeholders.
        const partial=!element.value||element.validity.badInput||rects[7].width&&Number(raw[5]||0)===0||rects[8].width&&Number(raw[6]||0)===0,values=partial?componentPartialDate(element,selector,style,host,styles,rects,probes,inherited,textStyle):raw;
        if(!values)return null;
        if(element.type==='date')values.length=3;
        if(values[6]&&/^\d+$/.test(values[6]))values[6]=values[6].padEnd(3,'0');
        const number=new Intl.NumberFormat(view.navigator.language,{useGrouping:false}),numericRects=[],numerics=[];
        for(let index=0;index<7;index++){
            const r=rects[index+2],s=styles[index+2];if(!r.width||!r.height)continue;
            const value=values[index]??(index>=5?'0'.repeat(index===6?3:2):null);if(value===null)return null;
            const text=partial&&!/^\d+$/.test(value)?value:number.format(Number(value)).padStart(value.length,'0');if((!partial&&!/^\d+$/.test(text))||text.length!==value.length||s.get('display')!=='inline')return null;
            const span=doc.createElement('span');span.style.cssText=textStyle;for(const name of inherited)span.style.setProperty(name,s.get(name));span.textContent=text;host.append(span);numerics.push({index,r,s,text,span});
        }
        for(const {index,r,s,text,span}of numerics){
            const range=doc.createRange();range.selectNodeContents(span);const total=range.getBoundingClientRect(),inset=side=>parseFloat(s.get('padding-'+side))+parseFloat(s.get('border-'+side+'-width')),left=inset('left'),right=inset('right'),top=inset('top'),bottom=inset('bottom');
            if(![left,right,top,bottom].every(Number.isFinite)||Math.abs(total.width+left+right-r.width)>.1||Math.abs(total.height+top+bottom-r.height)>.1)return null;
            numericRects.push({index,rect:r});if(!paint(index+2))continue;
            for(let offset=0;offset<text.length;offset++){range.setStart(span.firstChild,offset);range.setEnd(span.firstChild,offset+1);const g=range.getBoundingClientRect();glyphs.push({offset:index*16+offset,rect:{left:r.left+left+g.left-total.left,right:r.left+left+g.right-total.left,top:r.top+top,bottom:r.top+top+g.height,width:g.width,height:g.height}});}
        }
        const literal=rects[10];numericRects.sort((a,b)=>a.rect.left-b.rect.left);
        if(paint(10)&&literal.width&&literal.height)for(let i=1;i<numericRects.length;i++){const a=numericRects[i-1],b=numericRects[i];if(b.rect.left>a.rect.right)glyphs.push({offset:1024+a.index*16+b.index,rect:{left:a.rect.right,right:b.rect.left,top:literal.top,bottom:literal.bottom,width:b.rect.left-a.rect.right,height:literal.height}});}
        const button=rects[11],buttonStyle=styles[11],image=button.width&&button.height&&visible(11)&&!element.disabled&&!element.readOnly?{left:button.left+parseFloat(buttonStyle.get('padding-left')),right:button.right-parseFloat(buttonStyle.get('padding-right')),top:button.top+parseFloat(buttonStyle.get('padding-top')),bottom:button.bottom-parseFloat(buttonStyle.get('padding-bottom'))}:null;
        if(image){image.width=image.right-image.left;image.height=image.bottom-image.top;}
        // Keep the full glyph ratio when only part is visible; resolve clips the final point to the viewport.
        result={content:hiddenLayout?{left:before.left,right:before.right,top:before.top,bottom:before.bottom,viewport:before}:{left:rects[1].left,right:rects[1].right,top:rects[1].top,bottom:rects[1].bottom,viewport:rects[0]},glyphs:glyphs.filter(({rect:r})=>r.right>rects[0].left&&r.left<rects[0].right&&r.bottom>rects[0].top&&r.top<rects[0].bottom),image,text:partial?values:null};
    }finally{host.remove();style.textContent='';}
    return result;
}

function componentTextField(element) {
    if(element.closest('[data-private]') || element.matches('input[type="password"]'))return false;
    if(element.matches(COMPONENT_DATE_FIELD))return true;
    if(componentSourceField(element))return true;
    if(element.matches('select')){
        const css=element.ownerDocument.defaultView.getComputedStyle(element);
        if(element.multiple || element.size>1 || element.querySelector('button') || css.appearance!=='base-select' || css.display!=='flex' || element.ownerDocument.defaultView.getComputedStyle(element,'::picker-icon').display!=='none' || css.getPropertyValue('-webkit-text-security')!=='none')return false;
        const option=element.selectedOptions[0];return !option?.children.length && !option?.closest('[data-private]');
    }
    const pdfNumber=element.matches('.pdf__outer input#pageNumber.toolbarField.pageNumber[type="number"]') && pdfModel(element);
    const settingField=element.matches('.config__tab-container[data-name="editor"] textarea.b3-text-field[id^="editor."]') || element.matches('input.b3-text-field[type="number"]') && COMPONENT_NUMBER_SETTINGS.get(element.closest('.config__tab-container')?.dataset.name)?.includes(element.id);
    const textSetting=element.matches('input.b3-text-field,textarea.b3-text-field') && ['text','textarea'].includes(element.type) && COMPONENT_TEXT_SETTINGS.get(element.closest('.config__tab-container')?.dataset.name)?.includes(element.id);
    const colorName=element.matches('label > input.b3-text-field[data-field="name"]') && element.type==='text' && componentColorContext(element)?.[0]==='inlineStyleList' && element.closest('[data-panel="customEditor"]').querySelectorAll('[data-field="name"]').length===1;
    return ((element.matches('textarea.search__input,input[type="search"],input#searchAssetInput,input.switch-doc__search,input.search__label,.search__header input.b3-text-field,.config__panel .config__tab-head input.b3-text-field,.config__tab-container[data-name="bazaar"] input.config-bazaar__filter,.config__tab-container[data-name="keymap"] input:is(#keymapInput,#searchByKey)') || element.matches('.pdf__outer #findbar input#findInput') && !!pdfModel(element)) && ['text','search','textarea'].includes(element.type) || pdfNumber || settingField || textSetting || colorName || componentSelectField(element) || element.matches('input.b3-text-field[data-type="font-search"]') && element.type==='text' && !!element.closest(COMPONENT_FONT_MENU)) && element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue('-webkit-text-security')==='none';
}

function componentFieldText(field) {
    if(field.matches('select'))return field.selectedOptions[0]?.label || '';
    return field.value || field.getAttribute('placeholder') || '';
}

function componentFieldStyle(doc) {
    if(!doc.head)return null;
    let style=componentFieldStyles.get(doc);
    if(!style){style=doc.createElement('style');style.className='collab-text-measure';style.textContent='.collab-field-measure::-webkit-scrollbar{width:var(--collab-field-scrollbar-width)!important;height:var(--collab-field-scrollbar-height)!important}';componentFieldStyles.set(doc,style);}
    if(!style.isConnected)doc.head.append(style);
    return style;
}

function componentFieldContent(field) {
    if(!field.matches('input,select,textarea') || !componentTextField(field))return null;
    if(field.matches(COMPONENT_DATE_FIELD))return componentDateField(field)?.content || null;
    const cache=componentMeasurements?.fields;if(cache?.has(field))return cache.get(field);
    const css=field.ownerDocument.defaultView.getComputedStyle(field),rect=field.getBoundingClientRect(),inset=side=>parseFloat(css['border'+side+'Width'])+parseFloat(css['padding'+side]);
    if(field.type==='number' && (field.validity.badInput || css.appearance!=='none'))return null;
    const left=inset('Left'),right=inset('Right'),top=inset('Top'),bottom=inset('Bottom'),sx=rect.width/(parseFloat(css.width)+(css.boxSizing==='border-box' ? 0:left+right)),sy=rect.height/(parseFloat(css.height)+(css.boxSizing==='border-box' ? 0:top+bottom));
    if(![left,right,top,bottom,sx,sy].every(Number.isFinite) || sx<=0 || sy<=0)return null;
    const content=field.matches('textarea') ? componentFieldMeasure(field,mirror=>{
        const marker=field.ownerDocument.createElement('i');marker.style.cssText='position:absolute;inset:0;padding:0;margin:0;border:0;visibility:hidden;pointer-events:none';mirror.append(marker);
        const port=marker.getBoundingClientRect(),viewport={left:port.left+field.scrollLeft*sx,right:port.right+field.scrollLeft*sx,top:port.top+field.scrollTop*sy,bottom:port.bottom+field.scrollTop*sy};
        return {left:viewport.left+parseFloat(css.paddingLeft)*sx,right:viewport.right-parseFloat(css.paddingRight)*sx,top:viewport.top+parseFloat(css.paddingTop)*sy,bottom:viewport.bottom-parseFloat(css.paddingBottom)*sy,viewport};
    }):{left:rect.left+left*sx,right:rect.right-right*sx,top:rect.top+top*sy,bottom:rect.bottom-bottom*sy};
    cache?.set(field,content);return content;
}

function componentFieldMeasure(field,run) {
    if(field.matches(COMPONENT_DATE_FIELD)){const date=componentDateField(field);return date?run(null,offset=>date.glyphs.find(g=>g.offset===offset)?.rect):null;}
    if(typeof Intl.Segmenter!=='function')return null;
    const doc=field.ownerDocument,css=doc.defaultView.getComputedStyle(field);
    if(field.type==='number' && (field.validity.badInput || css.appearance!=='none'))return null;
    if(field.matches('textarea')&&!componentFieldStyle(doc))return null;
    const bounds=field.getBoundingClientRect(),mirror=doc.createElement('div'),value=componentFieldText(field);
    mirror.className='collab-text-measure';mirror.setAttribute('aria-hidden','true');mirror.textContent=value+'\u200b';
    for(const name of ['box-sizing','width','height','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-style','overflow-x','overflow-y','scrollbar-gutter','font-family','font-size','font-style','font-weight','font-stretch','font-variant','font-feature-settings','font-variation-settings','font-kerning','line-height','letter-spacing','word-spacing','tab-size','white-space','word-break','overflow-wrap','text-indent','text-align','text-transform','direction','writing-mode','text-orientation'])mirror.style.setProperty(name,css.getPropertyValue(name));
    if(field.matches('textarea')){const bar=doc.defaultView.getComputedStyle(field,'::-webkit-scrollbar');mirror.classList.add('collab-field-measure');mirror.style.setProperty('--collab-field-scrollbar-width',bar.width);mirror.style.setProperty('--collab-field-scrollbar-height',bar.height);mirror.style.scrollbarWidth=css.scrollbarWidth;mirror.style.scrollbarColor=css.scrollbarColor;}
    if(field.matches('select'))for(const name of ['display','flex-direction','flex-wrap','align-items','justify-content','gap'])mirror.style.setProperty(name,css.getPropertyValue(name));
    if(!field.matches('select') && !field.value && field.getAttribute('placeholder')){
        const placeholder=doc.defaultView.getComputedStyle(field,'::placeholder');
        for(const name of ['font-family','font-size','font-style','font-weight','font-stretch','font-variant','font-feature-settings','font-variation-settings','font-kerning','letter-spacing','word-spacing','text-transform'])mirror.style.setProperty(name,placeholder.getPropertyValue(name));
    }
    if(field.matches('input')){
        const inset=['padding-top','padding-bottom','border-top-width','border-bottom-width'].reduce((sum,name)=>sum+parseFloat(css.getPropertyValue(name)),0);
        mirror.style.lineHeight=(parseFloat(css.height)-(css.boxSizing==='border-box' ? inset:0))+'px';
        mirror.style.whiteSpace='pre';mirror.style.overflowWrap='normal';mirror.style.wordBreak='normal';mirror.style.overflow='hidden';
    }
    mirror.style.cssText+=';position:fixed;left:'+bounds.left+'px;top:'+bounds.top+'px;margin:0;opacity:0;pointer-events:auto;z-index:2147483647;transform-origin:0 0;';
    // Keep ancestor zoom during layout: scaling alone loses native font and border quantization.
    let zoom=1;for(let parent=field;parent&&parent!==doc.body;parent=parent.parentElement)zoom*=Number(doc.defaultView.getComputedStyle(parent).zoom)||1;mirror.style.zoom=String(zoom);
    let pageZoom=zoom;for(let parent=doc.body;parent;parent=parent.parentElement)pageZoom*=Number(doc.defaultView.getComputedStyle(parent).zoom)||1;
    if(pageZoom!==1)for(const name of ['width','height','border-top-width','border-right-width','border-bottom-width','border-left-width'])mirror.style.setProperty(name,(Math.round(parseFloat(css.getPropertyValue(name))*pageZoom*64)/(pageZoom*64)+.000001)+'px');
    doc.body.append(mirror);
    try{
        const rect=mirror.getBoundingClientRect();if(!rect.width || !rect.height)return null;
        const layout=doc.defaultView.getComputedStyle(mirror),size=axis=>parseFloat(layout[axis])+(layout.boxSizing==='border-box' ? 0:(axis==='width'?['Left','Right']:['Top','Bottom']).reduce((sum,side)=>sum+parseFloat(layout['padding'+side])+parseFloat(layout['border'+side+'Width']),0));
        mirror.style.left=(bounds.left+(bounds.left-rect.left)*size('width')/rect.width)+'px';mirror.style.top=(bounds.top+(bounds.top-rect.top)*size('height')/rect.height)+'px';
        mirror.style.transform='scale('+bounds.width/rect.width+','+bounds.height/rect.height+')';mirror.scrollTop=field.scrollTop;mirror.scrollLeft=field.scrollLeft;
        const segments=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value);
        const position=offset=>offset>=0 && offset<value.length ? segments.containing(offset).index:offset===value.length ? offset:-1;
        const character=offset=>{
            if(!Number.isInteger(offset) || offset<0 || offset>value.length)return null;
            const segment=segments.containing(offset),start=segment?.index ?? offset,end=segment ? start+segment.segment.length:offset+1;
            const range=doc.createRange();range.setStart(mirror.firstChild,start);range.setEnd(mirror.firstChild,end);const r=range.getBoundingClientRect();return r.height ? r:null;
        };
        return run(mirror,character,position,segments);
    }finally{mirror.remove();}
}
function componentVisualHit(doc,point) {
    const cache=componentMeasurements?.visualHits;let probes=cache?.get(doc);
    try{
        if(!probes){
            probes=[];
            const clones=[...doc.querySelectorAll('.config-font-family__chip.b3-chip--dragclone:not(.collab-text-measure)')].filter(visibleElement);
            if(clones.some(clone=>{const rect=clone.getBoundingClientRect();return point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom;}))for(const clone of clones){
                // A hidden hit proxy preserves native stacking order without mutating the pointer-transparent drag node.
                const probe=clone.cloneNode(true),original=[clone,...clone.querySelectorAll('*')],nodes=[probe,...probe.querySelectorAll('*')];probe.classList.add('collab-text-measure');probe.setAttribute('aria-hidden','true');probe.style.setProperty('opacity','0','important');
                for(const node of nodes)node.style.setProperty('pointer-events','auto','important');
                probes.push({probe,original,nodes});clone.after(probe);
            }
            // Geometry is stable during this synchronous render; all peers share its hit proxies.
            if(probes.length || !clones.length)cache?.set(doc,probes);
        }
        const hit=doc.elementFromPoint(point.x,point.y);
        for(const {original,nodes}of probes){const index=nodes.indexOf(hit);if(index>=0)return original[index];}
        return hit;
    }finally{if(!cache?.has(doc))for(const {probe}of probes || [])probe.remove();}
}

function componentHit(doc,point) {
    const hit=componentVisualHit(doc,point),item=hit?.matches('input.b3-form__upload[type="file"]') && hit.closest('.b3-menu__item');
    if(!hit?.closest('[data-private]'))for(let element=hit;element;element=element.parentElement){
        const scrollbar=componentScrollbar(element,point,false);
        // Chromium can hit the clipped content beneath a native scrollbar corner.
        if(scrollbar?.areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom))return element;
    }
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
        if(child.matches('style,script,.collab-cursor-layer,.collab-editing-layer,.collab-presence-users,.collab-text-measure,.fn__none,[hidden]'))return false;
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

function componentSuperblockDivider(element) {
    const handle=element.closest('.sb__resize');if(!handle)return undefined;
    const ids=[handle.previousElementSibling?.getAttribute('data-node-id'),handle.nextElementSibling?.getAttribute('data-node-id')];
    return ids.every(id=>DOCUMENT_ID.test(id || '')) ? ids.sort():null;
}

function componentBazaarPackage(element) {
    const root=element.closest('#configBazaarReadme');if(!root)return undefined;
    const sides=root.querySelectorAll(':scope > .item__body > .item__side');if(sides.length!==1)return null;
    const {name,packageType}=sides[0].dataset;
    return name && name.length<=512 && !/[\x00-\x1f]/.test(name) && ['plugins','themes','icons','templates','widgets'].includes(packageType) ? [packageType,name]:null;
}

function componentKey(element) {
    const font=componentFontIdentity(element);
    const thumbnailImage=element.matches('.thumbnail img') && pdfModel(element);
    const attributes=['data-node-id','data-command-id','data-font-config-key','data-url','data-name','data-type','data-subtype','data-page-number','data-annotation-id','data-statusbar-entry','data-topbar-entry','role','type','name','href','src','d','points','viewBox'];
    const values=attributes.filter(name=>name!=='src' || !thumbnailImage).map(name=>[name,element.getAttribute(name)]).filter(([,value])=>value).map(([name,value])=>[name,componentHash(value)]);
    if(element.matches('input[type="color"][data-field]'))values.push(['color-field',componentHash(element.dataset.field)]);
    if(element.matches('[data-type="themeColorEditor"] > div')){const fields=[...element.querySelectorAll('input[type="color"][data-field]')].map(e=>e.dataset.field).sort();if(fields.length)values.push(['color-group',componentHash(JSON.stringify(fields))]);}
    if(element.matches('[data-panel="builtinEditor"],[data-panel="customEditor"]')&&element.querySelector('[data-type="themeColorEditor"]'))values.push(['color-editor',element.dataset.panel,componentHash(element.dataset.panel==='customEditor' ? JSON.stringify(componentColorContext(element)):textLabel(element.querySelector('[data-role="title"]')))]);
    if(font!==undefined)values.push(['font',componentHash(JSON.stringify(font))]);
    if(element.matches('.b3-menu')){const target=componentFontMenuTarget(element);if(target!==undefined)values.push(['font-target',componentHash(JSON.stringify(target))]);}
    if(element.matches('#configBazaarReadme'))values.push(['bazaar-package',componentHash(JSON.stringify(componentBazaarPackage(element)))]);
    if(element.matches('.config-range__desktop')){const field=element.querySelector(':scope > input.b3-slider[type="range"][id]');if(field)values.push(['range-control',componentHash(field.id)]);}
    const pdfNumber=element.matches('.pdf__outer input#pageNumber.toolbarField.pageNumber[type="number"]') && pdfModel(element);
    if(pdfNumber)values.push(['pdf-file',componentHash(pdfNumber.pdfObject.pdfDocument.fingerprints[0])]);
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
    if(element.matches('.protyle-util'))values.push(['render-target',componentRenderTarget(element)]);
    if(element.matches('.sb__resize'))values.push(['between',componentSuperblockDivider(element)]);
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
    const privateText=element.matches('select') || element.closest('input,textarea,[contenteditable],[data-private]');
    const label=!privateText && !values.length && !(element.matches('.counter') && (tree || element.closest('.search__list'))) ? (element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length || element.matches('.b3-list-item,.b3-menu__item') || element.matches(COMPONENT_HIGHLIGHT_TEXT) ? textLabel(element):'')):'';
    const classes=[...new Set([...element.classList].filter(name=>!/^collab-|^ariaLabel$|^fn__none$|^protyle-wysiwyg--select$|^b3-menu__item--(?:current|show|group-first|group-last)$|^b3-list-item__arrow--open$/.test(name) && !(font && element.matches('.config-font-family__chip') && name==='b3-chip--dragging') && !(pdfNumber && name==='loading' && element.ownerDocument.defaultView.getComputedStyle(element).backgroundImage==='none') && !(name==='selected' && element.matches('.thumbnail')) && !(name==='wrapContainers' && element.matches('.pdf__outer #findbar')) && !(element.matches('.pdf__outer') && ['pdf__outer--maximized','sidebarOpen'].includes(name))).map(name=>name.replace(/--(?:focus|active|selected|hover)$/,'')))].sort().join(' ');
    return componentHash(JSON.stringify([element.tagName.toLowerCase(),classes,values,label]));
}

function componentPane(element) {
    const wnd=element.closest('.layout__wnd,[data-type="wnd"]');
    return wnd ? [...wnd.querySelectorAll('[data-type="tab-header"]')].map(head=>pageKey(tabPage(head))).sort().join('|'):'';
}

function componentSiblings(parent,key,nameKey) {
    // Name hashes narrow candidates; full identity and duplicate counts still decide the match.
    const cache=componentMeasurements?.siblings;
    if(!cache)return componentChildren(parent).filter(child=>(!nameKey || componentHash(child.getAttribute('data-name') || '')===nameKey) && componentKey(child)===key);
    if(!cache.has(parent))cache.set(parent,{children:componentChildren(parent),names:null,keys:new Map()});
    const entry=cache.get(parent);
    if(nameKey && !entry.names){
        entry.names=new Map();
        for(const child of entry.children){
            const name=componentHash(child.getAttribute('data-name') || '');
            if(!entry.names.has(name))entry.names.set(name,[]);
            entry.names.get(name).push(child);
        }
    }
    const bucket=nameKey || '';
    if(!entry.keys.has(bucket)){
        const groups=new Map();
        for(const child of nameKey ? entry.names.get(nameKey) || []:entry.children){
            const identity=componentKey(child);
            if(!groups.has(identity))groups.set(identity,[]);
            groups.get(identity).push(child);
        }
        entry.keys.set(bucket,groups);
    }
    return entry.keys.get(bucket).get(key) || [];
}

function componentStep(element) {
    const key=componentKey(element),name=element.getAttribute('data-name'),nameKey=name ? componentHash(name):undefined,siblings=componentSiblings(element.parentElement,key,nameKey);
    return {key,count:siblings.length,index:siblings.indexOf(element),...(nameKey ? {nameKey}:{})};
}

function componentChild(parent,step) {
    const children=componentSiblings(parent,step.key,step.nameKey);
    return children.length===step.count && !(children.length>1 && children.some(child=>componentFontIdentity(child)!==undefined)) ? children[step.index]:null;
}

function componentRoute(root,element) {
    const route=[];
    for(let node=element;node!==root;node=node.parentElement){
        if(!node?.parentElement || route.length>=32)return null;
        const step=componentStep(node),font=componentFontIdentity(node);if(font!==undefined && (!font || step.count!==1))return null;
        route.unshift(step);
    }
    return route;
}

function componentFollow(root,route) {
    const cache=componentMeasurements?.routes,key=cache&&JSON.stringify(route),origin=root;
    if(cache?.get(root)?.has(key))return cache.get(root).get(key);
    for(const step of route){root=componentChild(root,step);if(!root)return null;}
    if(cache){if(!cache.has(origin))cache.set(origin,new Map());cache.get(origin).set(key,root);}
    return root;
}

const COMPONENT_FLOATING='.b3-menu,.block__popover,.protyle-hint,.tooltip,.b3-tooltip,.config-font-family__chip.b3-chip--dragclone';
const COMPONENT_AV_REGIONS='.av__cell[data-col-id],.av__cell[data-field-id],.av__calc[data-col-id],.av__gallery-field,.av__firstcol,.av__row[data-id],.av__gallery-item[data-id],.av__row--header,.av__row--footer,.av__group-title,.av__body[data-group-id]';
const COMPONENT_CALENDAR_REGIONS='.av__calendar,.av__calendar-day,.av__calendar-week,.av__calendar-week-row,.av__calendar-week-number,.av__calendar-days,.av__calendar-events,.av__calendar-weekdays > div,.av__calendar-item,.av__calendar-field,.av__calendar-undated-item[data-calendar-undated-row]';
const COMPONENT_CONTROL_REGIONS='[data-type="tab-header"],.dock__item[data-type],[data-statusbar-entry],[data-topbar-entry],.config__side [data-name],.layout__wnd--active .item--readonly [data-type],.toolbar [id],#status [id]';

function componentControlRegion(element) {
    if(element.closest('.protyle,.dockPanel'))return null;
    const root=element.closest(COMPONENT_CONTROL_REGIONS);if(!root)return null;
    if(root.matches('[data-type="tab-header"]')){
        const page=tabPage(root);return {root,identity:['tab',pageKey(page),['workspace','custom'].includes(page.kind) ? page.title:'']};
    }
    if(root.matches('.dock__item[data-type]'))return {root,identity:['dock',root.getAttribute('data-type')]};
    if(root.matches('.config__side [data-name]'))return {root,identity:['settings-nav',root.getAttribute('data-name')]};
    if(root.closest('.b3-dialog'))return null;
    for(const name of ['data-statusbar-entry','data-topbar-entry'])if(root.hasAttribute(name))return {root,identity:[name,root.getAttribute(name)]};
    if(root.matches('.item--readonly [data-type]'))return {root,identity:['tab-control',root.getAttribute('data-type')]};
    return {root,identity:['id',root.id]};
}

function componentBacklinkContext(element) {
    const panel=element.closest('.sy__backlink,.sy__backlink--bottom');if(!panel)return null;
    let model;try{model=getModelByDockType('backlink');}catch{}
    if(model?.element!==panel){try{model=getAllTabs().flatMap(tab=>[tab.model,tab.model?.backlink]).find(item=>item?.element===panel);}catch{model=null;}}
    const section=element.closest('.backlinkList,.backlinkMList'),mention=!!element.closest('.backlinkMList,.backlinkMList__header');
    return {panel,section,identity:DOCUMENT_ID.test(model?.blockId || '') ? [model.type,model.blockId,mention ? 'mention':'backlink']:null};
}

function componentTextHash(element) {
    if(element.matches(COMPONENT_DATE_FIELD)){
        const date=componentDateField(element);
        return date?componentHash(JSON.stringify([element.type,date.text||element.value,element.ownerDocument.defaultView.navigator.language,element.lang])):'';
    }
    if(componentTextField(element))return componentHash(componentFieldText(element));
    if(element.matches('select'))return '';
    if(element.matches('#searchAssetPreview,#searchAssetPreview > p'))return componentHash(element.innerText);
    const text=element.matches('.block__logo--counter') && element.closest('.sy__backlink,.sy__backlink--bottom') ? [...element.childNodes].filter(node=>node.nodeType!==1 || !node.matches('.counter')).map(node=>node.textContent).join(''):element.textContent;
    return componentHash(text);
}

function componentTreeRegion(element) {
    const files=element.closest('.sy__file'),file=files && element.closest('li[data-type="navigation-file"],li[data-type="navigation-root"]');
    if(file && files.contains(file)){
        const notebook=file.closest('ul[data-url]')?.getAttribute('data-url'),id=file.getAttribute('data-node-id') || '';
        return {panel:files,root:file,identity:DOCUMENT_ID.test(notebook || '') && (id ? DOCUMENT_ID.test(id):file.getAttribute('data-type')==='navigation-root') ? ['file',notebook,id]:null};
    }
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
    if(componentColorContext(element)===null)return null;
    const make=(root,kind,key)=>({root,scope:{kind,key:componentHash(key),...(kind==='document' ? {pane:componentHash(componentPane(root))}:{})}});
    const popup=element.closest('.protyle-util');
    if(popup?.querySelector('textarea') && !componentRenderTarget(popup))return null;
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
    const control=componentControlRegion(element);
    if(control)return make(control.root,'control',JSON.stringify(control.identity));
    const dialog=element.closest('.b3-dialog');
    if(dialog)return make(dialog,'dialog',(dialog.getAttribute('data-key') || dialog.parentElement?.getAttribute('data-key') || '')+'|'+textLabel(dialog.querySelector('.b3-dialog__header')));
    const floating=element.closest(COMPONENT_FLOATING);
    if(floating && !floating.closest('.protyle,.dockPanel')){
        if(floating.matches('.b3-chip--dragclone')){
            const target=componentFontDragTarget(floating),base=target && componentScope(target.source,plugin);
            return base ? make(floating,'floating',JSON.stringify(['font-drag',base.scope,target.group,...target.font])):null;
        }
        if(componentFontMenuTarget(floating)===null)return null;
        const pdf=floating.closest('.pdf__outer') && pdfModel(floating),context=pdf ? 'pdf:'+pdf.pdfObject.pdfDocument.fingerprints[0]:plugin ? pageKey(plugin.dialogBase || currentPage(plugin,false)):'';
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
    const cache=componentMeasurements?.roots,key=cache&&JSON.stringify(scope);
    if(cache?.has(key))return cache.get(key);
    const root=findComponentRoots(scope,plugin);cache?.set(key,root);return root;
}

function findComponentRoots(scope,plugin) {
    if(scope.kind==='control'){
        const roots=[...document.querySelectorAll(COMPONENT_CONTROL_REGIONS)].filter(root=>{
            const region=componentControlRegion(root);return region?.root===root && componentHash(JSON.stringify(region.identity))===scope.key && visibleElement(root);
        });
        return roots.length===1 ? roots[0]:null;
    }
    if(scope.kind==='tree'){
        const roots=[...document.querySelectorAll('.sy__file li[data-type="navigation-file"],.sy__file li[data-type="navigation-root"],.sy__tag li[data-treetype],.sy__bookmark li[data-treetype],.sy__tag ul,.sy__bookmark ul,.sy__outline li[data-treetype],.sy__outline ul,.sy__outline > .b3-list-item,.sy__outline > .fn__flex-1,.backlinkList,.backlinkMList,.backlinkList__item,.backlinkList__item > li,.backlinkList__header .counter,.backlinkMList__header .counter')].filter(root=>{
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

function componentCharacter(element,offset,plane) {
    const character=characterAt(element,offset);
    if(!character)return null;
    const range=element.ownerDocument.createRange();range.setStart(character.node,character.offset);range.setEnd(character.node,character.offset+1);
    const rect=range.getBoundingClientRect();
    if(!plane)return rect.width && rect.height ? rect:null;
    if(range.getClientRects().length!==1)return null;
    const vertical=element.ownerDocument.defaultView.getComputedStyle(character.node.parentElement).writingMode!=='horizontal-tb';
    if(typeof Intl.Segmenter!=='function')return null;
    plane.segments ||= new WeakMap();let segments=plane.segments.get(character.node);if(!segments){segments=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(character.node.textContent);plane.segments.set(character.node,segments);}
    // A caret inside a surrogate pair or joined glyph can report the whole glyph box.
    range.setStart(character.node,segments.containing(character.offset).index);range.collapse(true);const caret=range.getBoundingClientRect(),{a,b,c,d}=plane;
    const center=plane.toLocal({x:(rect.left+rect.right)/2,y:(rect.top+rect.bottom)/2});
    let width,height;
    if(vertical){width=Math.abs(a)>=Math.abs(b) ? caret.width/Math.abs(a):caret.height/Math.abs(b);height=Math.abs(c)>=Math.abs(d) ? (rect.width-Math.abs(a)*width)/Math.abs(c):(rect.height-Math.abs(b)*width)/Math.abs(d);}
    else{height=Math.abs(c)>=Math.abs(d) ? caret.width/Math.abs(c):caret.height/Math.abs(d);width=Math.abs(a)>=Math.abs(b) ? (rect.width-Math.abs(c)*height)/Math.abs(a):(rect.height-Math.abs(d)*height)/Math.abs(b);}
    if(![width,height,center.x,center.y].every(Number.isFinite) || width<=0 || height<=0)return null;
    return {left:center.x-width/2,right:center.x+width/2,top:center.y-height/2,bottom:center.y+height/2,width,height};
}

function componentNearText(element,point,plane) {
    if(element.matches(COMPONENT_DATE_FIELD))return componentDateField(element)?.glyphs || [];
    if(componentTextField(element))return componentFieldMeasure(element,(mirror,character,position,segments)=>{
        const doc=element.ownerDocument,caret=doc.caretPositionFromPoint?.(point.x,point.y),range=caret ? null:doc.caretRangeFromPoint?.(point.x,point.y),node=caret?.offsetNode || range?.startContainer,offset=caret?.offset ?? range?.startOffset;
        if(node!==mirror.firstChild)return null;
        const end=mirror.firstChild.length-1,emptyLine=end===0 || mirror.firstChild.data.charCodeAt(end-1)===10;
        const candidates=[...new Set([position(offset-1),position(offset)])].map(offset=>({offset,rect:character(offset)})).filter(item=>item.rect && (item.offset<end || emptyLine));
        const inside=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);if(inside)return [inside];
        for(const {index}of segments){const rect=character(index);if(rect)candidates.push({offset:index,rect});}
        const endRect=emptyLine && character(end);if(endRect)candidates.push({offset:end,rect:endRect});
        const hit=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);if(hit)return [hit];
        const distance=rect=>Math.max(rect.top-point.y,point.y-rect.bottom,0),nearest=Math.min(...candidates.map(item=>distance(item.rect)));
        // Use the closest line endpoint, independent of native caret rounding and earlier wraps.
        let endpoint,delta=Infinity;for(const item of candidates){if(distance(item.rect)!==nearest)continue;const dx=Math.max(item.rect.left-point.x,point.x-item.rect.right,0);if(dx<delta || dx===delta && item.offset>(endpoint?.offset ?? -1)){endpoint=item;delta=dx;}}
        return endpoint ? [endpoint]:[];
    });
    if(element.matches('input,select,textarea,[data-type="NodeSuperBlock"]') || element.closest('[data-private]'))return null;
    if(componentTreeRegion(element)?.root===element || element.matches('.backlinkList__header,.backlinkMList__header') && element.closest('.sy__backlink,.sy__backlink--bottom'))return null;
    const doc=element.ownerDocument,caret=doc.caretPositionFromPoint?.(point.x,point.y),range=caret ? null:doc.caretRangeFromPoint?.(point.x,point.y);
    if(plane)point=plane.toLocal(point);
    const node=caret?.offsetNode || range?.startContainer,offset=caret?.offset ?? range?.startOffset;
    if(node?.nodeType!==3 || !element.contains(node)){
        // Native upload inputs and pointer-transparent drag clones hide visible labels from caret hit testing.
        const upload=element.matches('.b3-menu__label') && element.querySelector('input.b3-form__upload[type="file"]');
        if((!upload || Number(doc.defaultView.getComputedStyle(upload).opacity)>.01) && !element.closest('.config-font-family__chip.b3-chip--dragclone'))return null;
        let nearest;
        for(let index=0;index<element.textContent.length;index++){
            const rect=componentCharacter(element,index,plane);if(!rect)continue;
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
    const candidates=[prefix.toString().length-1,prefix.toString().length].filter(index=>index>=0).map(index=>({offset:index,rect:componentCharacter(element,index,plane)})).filter(item=>item.rect);
    const inside=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);
    if(inside)return [inside];
    // Bidi run boundaries can return a caret at the opposite visual end.
    const start=prefix.toString().length-offset;
    for(let index=0;index<node.length;index++){
        const position=start+index;
        const rect=componentCharacter(element,position,plane);if(rect)candidates.push({offset:position,rect});
    }
    const hit=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);
    if(hit)return [hit];
    const distance=rect=>Math.max(rect.top-point.y,point.y-rect.bottom,0),nearest=Math.min(...candidates.map(item=>distance(item.rect)));
    // Inverse projection can separate otherwise aligned glyph rows by tiny roundoff.
    return candidates.filter(item=>distance(item.rect)<=nearest+(plane ? .001:0));
}

function componentImageRect(image,plane) {
    if(image.matches(COMPONENT_DATE_FIELD))return componentDateField(image)?.image || null;
    if(image.matches('select') || componentSelectField(image))return componentSelectImage(image);
    if(image.matches('.av__gallery-cover'))image=image.querySelector(':scope > img.av__gallery-img');
    if(!image || !visibleElement(image))return null;
    if(!image.matches('img') || !image.naturalWidth || !image.naturalHeight)return null;
    const style=image.ownerDocument.defaultView.getComputedStyle(image),rect=plane ? plane.rect(image):image.getBoundingClientRect();if(!rect)return null;
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

function componentPickerTransformed(css) {
    const matrix=new DOMMatrix(css.transform==='none' ? undefined:css.transform);
    return !matrix.is2D || matrix.a<=0 || matrix.d<=0 || Math.abs(matrix.b)>1e-10 || Math.abs(matrix.c)>1e-10 || css.rotate!=='none' || css.scale!=='none' && css.scale.split(' ').some(value=>!(parseFloat(value)>0));
}

function componentPlaneRects(root,plane,origin) {
    const doc=root.ownerDocument,view=doc.defaultView,rects=new Map(),marker=parent=>{const m=doc.createElement('div');m.className='collab-text-measure';m.inert=true;m.setAttribute('aria-hidden','true');m.style.cssText='all:initial!important;display:block!important;position:absolute!important;inset:auto!important;left:0!important;top:0!important;width:0!important;height:0!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important;pointer-events:none!important;';parent.append(m);return m;};
    return target=>{
        if(target===root)return {...plane.bounds,width:plane.bounds.right-plane.bounds.left,height:plane.bounds.bottom-plane.bounds.top};
        if(rects.has(target))return rects.get(target);
        let zoom=1,transformed=false;for(let e=target;e&&e!==root;e=e.parentElement){const s=view.getComputedStyle(e);if(s.display!=='inline'||e.namespaceURI!=='http://www.w3.org/1999/xhtml')transformed ||= s.transform!=='none'||s.rotate!=='none'||s.scale!=='none'||s.translate!=='none';zoom*=parseFloat(s.zoom)||1;}
        if(transformed){const box=frameBox(target,root,plane);if(!box)return null;const points=[[0,0],[box.bounds.right,0],[0,box.bounds.bottom],[box.bounds.right,box.bounds.bottom]].map(([x,y])=>plane.toLocal(box.toParent({x,y}))),r={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};r.width=r.right-r.left;r.height=r.bottom-r.top;rects.set(target,r);return r;}
        const native=target.getBoundingClientRect(),css=view.getComputedStyle(target),n=name=>parseFloat(css[name]),width=(n('width')+(css.boxSizing==='border-box'?0:n('paddingLeft')+n('paddingRight')+n('borderLeftWidth')+n('borderRightWidth')))*zoom,height=(n('height')+(css.boxSizing==='border-box'?0:n('paddingTop')+n('paddingBottom')+n('borderTopWidth')+n('borderBottomWidth')))*zoom,{a,b,c,d}=plane;
        if(width>0&&height>0&&Math.abs(native.width-Math.abs(a)*width-Math.abs(c)*height)<.01&&Math.abs(native.height-Math.abs(b)*width-Math.abs(d)*height)<.01){const center=plane.toLocal({x:(native.left+native.right)/2,y:(native.top+native.bottom)/2}),r={left:center.x-width/2,right:center.x+width/2,top:center.y-height/2,bottom:center.y+height/2,width,height};rects.set(target,r);return r;}
        const indicator=marker(target),rule=doc.createElement('style');indicator.classList.add('collab-plane-box');rule.className='collab-text-measure';const names=view.getComputedStyle(target).anchorName;rule.textContent='*:has(> .collab-plane-box){anchor-name:'+(names==='none' ? '':names+', ')+'--collab-plane-target!important}';doc.head.append(rule);
        const zero=origin?null:marker(root),probe=marker(root);probe.style.cssText+='left:anchor(--collab-plane-target left,-1234567px)!important;top:anchor(--collab-plane-target top,-1234567px)!important;width:anchor-size(--collab-plane-target width,0px)!important;height:anchor-size(--collab-plane-target height,0px)!important;';
        try{const originPoint=origin||plane.toLocal(zero.getBoundingClientRect()),s=view.getComputedStyle(probe),left=parseFloat(s.left),top=parseFloat(s.top),width=parseFloat(s.width),height=parseFloat(s.height),during=target.getBoundingClientRect();if(left===-1234567||top===-1234567||![left,top,width,height].every(Number.isFinite)||width<=0||height<=0||['left','right','top','bottom'].some(k=>Math.abs(native[k]-during[k])>.001))return null;const r={left:originPoint.x+left,top:originPoint.y+top,right:originPoint.x+left+width,bottom:originPoint.y+top+height,width,height};rects.set(target,r);return r;}finally{probe.remove();zero?.remove();indicator.remove();rule.remove();}
    };
}

function componentPickerElementPlane(element) {
    const select=element.closest('select:open');if(!select||select===element)return undefined;
    const view=element.ownerDocument.defaultView,css=view.getComputedStyle(select,'::picker(select)');let own=false;
    for(let e=element;e&&e!==select;e=e.parentElement){const s=view.getComputedStyle(e);if(s.display!=='inline'||e.namespaceURI!=='http://www.w3.org/1999/xhtml')own ||= s.transform!=='none'||s.rotate!=='none'||s.scale!=='none'||s.translate!=='none';}
    if(!own&&!componentPickerTransformed(css))return undefined;
    const picker=componentPicker(select);if(!picker)return null;if(!own)return picker.toLocal?picker:null;
    const size=axis=>parseFloat(css[axis])+(css.boxSizing==='border-box'?0:(axis==='width'?['Left','Right']:['Top','Bottom']).reduce((sum,side)=>sum+parseFloat(css['padding'+side])+parseFloat(css['border'+side+'Width']),0)),basis=picker.toLocal?picker:{a:(picker.bounds.right-picker.bounds.left)/size('width'),b:0,c:0,d:(picker.bounds.bottom-picker.bounds.top)/size('height')};
    for(let root=element;root&&root!==select;root=root.parentElement){const style=view.getComputedStyle(root);if(style.display==='inline'&&root.namespaceURI==='http://www.w3.org/1999/xhtml')continue;const plane=frameBox(root,select,basis);if(!plane)return null;plane.rect=componentPlaneRects(root,plane);return plane;}
    return null;
}

function componentPickerPlane(element,css) {
    const doc=element.ownerDocument,view=doc.defaultView,children=componentChildren(element).filter(child=>(child!==element.firstElementChild || !child.matches('button'))&&child.getBoundingClientRect().width&&child.getBoundingClientRect().height),before=children.map(child=>child.getBoundingClientRect()),markers=[];
    const marker=(position,rules,parent=element)=>{const m=doc.createElement('div');m.className='collab-text-measure';m.inert=true;m.setAttribute('aria-hidden','true');m.style.cssText='all:initial!important;display:block!important;position:'+position+'!important;inset:auto!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important;pointer-events:none!important;'+rules;parent.append(m);return m;};
    const anchor=css.anchorName==='none' ? '--collab-picker-measure':css.anchorName.split(',')[0].trim(),n=name=>parseFloat(css[name]);
    if(css.anchorName==='none'&&!componentPickerStyle(doc))return null;
    try{
        const top=marker('fixed','left:anchor('+anchor+' left)!important;top:anchor('+anchor+' top)!important;width:anchor-size('+anchor+' width,0px)!important;height:anchor-size('+anchor+' height,0px)!important;');top.classList.add('collab-picker-measure');if(css.anchorName==='none')top.classList.add('collab-picker-unanchored');top.setAttribute('popover','manual');markers.push(top);top.showPopover();
        const port=marker('absolute','inset:0!important;');markers.push(port);
        for(const [x,y]of [[0,0],[100,0],[0,100],[100,100]])markers.push(marker('absolute','left:'+x+'%!important;top:'+y+'%!important;width:0!important;height:0!important;'));
        const points=markers.slice(2).map(m=>m.getBoundingClientRect()),portCSS=view.getComputedStyle(port),pw=parseFloat(portCSS.width),ph=parseFloat(portCSS.height),width=n('width')+(css.boxSizing==='border-box' ? 0:n('borderLeftWidth')+n('borderRightWidth')+n('paddingLeft')+n('paddingRight')),height=n('height')+(css.boxSizing==='border-box' ? 0:n('borderTopWidth')+n('borderBottomWidth')+n('paddingTop')+n('paddingBottom'));
        const a=(points[1].x-points[0].x)/pw,b=(points[1].y-points[0].y)/pw,c=(points[2].x-points[0].x)/ph,d=(points[2].y-points[0].y)/ph,det=a*d-b*c,rect=top.getBoundingClientRect();
        if(![a,b,c,d,det,width,height,pw,ph].every(Number.isFinite) || Math.abs(det)<1e-10 || Math.min(width,height,pw,ph)<=0 || Math.hypot(points[3].x-points[1].x-points[2].x+points[0].x,points[3].y-points[1].y-points[2].y+points[0].y)>.01 || Math.abs(rect.width-Math.abs(a)*width-Math.abs(c)*height)>.1 || Math.abs(rect.height-Math.abs(b)*width-Math.abs(d)*height)>.1)return null;
        const x=rect.left-Math.min(0,a*width,c*height,a*width+c*height),y=rect.top-Math.min(0,b*width,d*height,b*width+d*height),toLocal=p=>({x:(d*(p.x-x)-c*(p.y-y))/det,y:(a*(p.y-y)-b*(p.x-x))/det}),toParent=p=>({x:x+a*p.x+c*p.y,y:y+b*p.x+d*p.y}),origin=toLocal(points[0]),localRect=componentPlaneRects(element,{bounds:{left:0,top:0,right:width,bottom:height},a,b,c,d,toLocal,toParent},origin);
        for(const child of children)if(!localRect(child))return null;
        if(children.some((child,index)=>{const r=child.getBoundingClientRect();return ['left','right','top','bottom'].some(k=>Math.abs(r[k]-before[index][k])>.001);}))return null;
        const horizontal=css.writingMode==='horizontal-tb',scrollbarX=css.scrollbarWidth==='none' ? 0:Math.max(0,width-n('borderLeftWidth')-n('borderRightWidth')-pw),scrollbarY=css.scrollbarWidth==='none' ? 0:Math.max(0,height-n('borderTopWidth')-n('borderBottomWidth')-ph),both=css.scrollbarGutter.includes('both-edges'),gl=horizontal ? both ? scrollbarX/2:css.direction==='rtl' ? scrollbarX:0:0,gt=!horizontal&&both ? scrollbarY/2:0;
        const bounds={left:0,top:0,right:width,bottom:height},border={left:n('borderLeftWidth'),right:width-n('borderRightWidth'),top:n('borderTopWidth'),bottom:height-n('borderBottomWidth')},viewport={left:border.left+gl,right:border.right-(scrollbarX-gl),top:border.top+gt,bottom:border.bottom-(scrollbarY-gt)},content={left:viewport.left+n('paddingLeft'),right:viewport.right-n('paddingRight'),top:viewport.top+n('paddingTop'),bottom:viewport.bottom-n('paddingBottom')};
        return {bounds,border,viewport,content,children,twoAxes:!horizontal||css.display==='grid'||css.display==='flex',scrollbarX,scrollbarY,a,b,c,d,toLocal,toParent,rect:localRect};
    }finally{markers.forEach(m=>m.remove());}
}

function componentPicker(element) {
    const cache=componentMeasurements?.pickers;
    if(cache?.has(element))return cache.get(element);
    const result=measureComponentPicker(element);
    cache?.set(element,result);return result;
}

function measureComponentPicker(element) {
    if(!element.matches('select:open') || element.closest('[data-private]'))return null;
    const doc=element.ownerDocument,view=doc.defaultView,css=view.getComputedStyle(element,'::picker(select)'),anchored=typeof view.HTMLElement.prototype.showPopover==='function' && view.CSS.supports('left','anchor(--collab-picker-measure left)') && view.CSS.supports('width','anchor-size(--collab-picker-measure width)'),horizontal=css.writingMode==='horizontal-tb',matrix=new view.DOMMatrix(css.transform==='none' ? undefined:css.transform);
    // shortcut: projective and multicolumn pickers still need a projective fragment map.
    if(css.appearance!=='base-select' || !anchored && (['visible','clip'].includes(css.overflowX) || ['visible','clip'].includes(css.overflowY)) || !(anchored ? ['block','flow-root','grid','flex']:['block']).includes(css.display) || css.visibility!=='visible' || Number(css.opacity)<=.01 || !(anchored ? ['horizontal-tb','vertical-rl','vertical-lr','sideways-rl','sideways-lr']:['horizontal-tb']).includes(css.writingMode) || !matrix.is2D || !anchored && (css.transform!=='none' || css.scale!=='none' || css.translate!=='none' || css.rotate!=='none') || css.columnCount!=='auto')return null;
    if(componentPickerTransformed(css))return anchored ? componentPickerPlane(element,css):null;
    const children=componentChildren(element).filter(child=>child!==element.firstElementChild || !child.matches('button')),before=children.map(child=>child.getBoundingClientRect());
    const anchor=css.anchorName==='none' ? '--collab-picker-measure':css.anchorName.split(',')[0].trim();
    const markers=[anchored ? 'fixed':'sticky','absolute'].map(position=>{const marker=doc.createElement('div');marker.className='collab-text-measure'+(position==='fixed' ? ' collab-picker-measure':'');marker.setAttribute('aria-hidden','true');marker.inert=true;
        marker.style.cssText='all:initial!important;display:block!important;position:'+position+'!important;box-sizing:content-box!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important;pointer-events:none!important;'+(position==='sticky' ? 'top:0!important;left:0!important;width:100%!important;height:1px!important;margin-bottom:-1px!important;':position==='fixed' ? 'inset:auto!important;left:anchor('+anchor+' left)!important;top:anchor('+anchor+' top)!important;width:anchor-size('+anchor+' width,0px)!important;height:anchor-size('+anchor+' height,0px)!important;':'inset:0!important;');return marker;});
    if(anchored){markers[0].setAttribute('popover','manual');if(css.anchorName==='none'){if(!componentPickerStyle(doc))return null;markers[0].classList.add('collab-picker-unanchored');}element.append(markers[0]);}else element.insertBefore(markers[0],children[0] || null);
    element.append(markers[1]);
    try{
        if(anchored)markers[0].showPopover();
        const port=markers[1].getBoundingClientRect(),top=markers[0].getBoundingClientRect(),n=name=>parseFloat(css[name]);
        const width=n('width')+(css.boxSizing==='border-box' ? 0:n('borderLeftWidth')+n('borderRightWidth')+n('paddingLeft')+n('paddingRight')),height=n('height')+(css.boxSizing==='border-box' ? 0:n('borderTopWidth')+n('borderBottomWidth')+n('paddingTop')+n('paddingBottom'));
        const sx=anchored ? top.width/width:top.width/parseFloat(view.getComputedStyle(markers[0]).width),sy=anchored ? top.height/height:top.height;
        if(![sx,sy].every(value=>Number.isFinite(value)&&value>0) || children.some((child,index)=>{const rect=child.getBoundingClientRect(),old=before[index];return ['left','right','top','bottom'].some(side=>Math.abs(rect[side]-old[side])>.001);}))return null;
        // Anchor quantization must not invent a gutter when native scrollbars are hidden.
        const scrollbarX=css.scrollbarWidth==='none' ? 0:Math.max(0,width-n('borderLeftWidth')-n('borderRightWidth')-port.width/sx),scrollbarY=css.scrollbarWidth==='none' ? 0:Math.max(0,height-n('borderTopWidth')-n('borderBottomWidth')-port.height/sy);
        const both=css.scrollbarGutter.includes('both-edges'),gutterLeft=horizontal ? both ? scrollbarX/2:css.direction==='rtl' ? scrollbarX:0:0,gutterTop=!horizontal && both ? scrollbarY/2:0;
        const bounds={left:anchored ? top.left:top.left-(n('paddingLeft')+n('borderLeftWidth')+gutterLeft)*sx,top:anchored ? top.top:top.top-(n('paddingTop')+n('borderTopWidth')+gutterTop)*sy};bounds.right=bounds.left+width*sx;bounds.bottom=bounds.top+height*sy;
        const border={left:bounds.left+n('borderLeftWidth')*sx,right:bounds.right-n('borderRightWidth')*sx,top:bounds.top+n('borderTopWidth')*sy,bottom:bounds.bottom-n('borderBottomWidth')*sy},viewport={left:border.left+gutterLeft*sx,right:border.right-(scrollbarX-gutterLeft)*sx,top:border.top+gutterTop*sy,bottom:border.bottom-(scrollbarY-gutterTop)*sy};
        const content={left:viewport.left+n('paddingLeft')*sx,right:viewport.right-n('paddingRight')*sx,top:viewport.top+n('paddingTop')*sy,bottom:viewport.bottom-n('paddingBottom')*sy};
        if(![...Object.values(bounds),...Object.values(content)].every(Number.isFinite) || content.bottom<content.top)return null;
        return {bounds,border,viewport,content,children,twoAxes:!horizontal || css.display==='grid' || css.display==='flex',scrollbarX:scrollbarX*sx,scrollbarY:scrollbarY*sy};
    }finally{markers.forEach(marker=>marker.remove());}
}

function componentSelectImage(element) {
    // shortcut: embedded SVG icons expose intrinsic size; add sizing before accepting raster or external icons.
    const view=element.ownerDocument.defaultView,css=view.getComputedStyle(element),url=css.backgroundImage.match(/^url\("(data:image\/svg\+xml[^"\n]*)"\)$/)?.[1];
    if(!url || css.backgroundRepeat!=='no-repeat' || css.backgroundOrigin!=='padding-box')return null;
    let svg;try{const comma=url.indexOf(',');svg=new view.DOMParser().parseFromString(/;base64$/.test(url.slice(0,comma)) ? view.atob(url.slice(comma+1)):decodeURIComponent(url.slice(comma+1)),'image/svg+xml').documentElement;}catch{return null;}
    if(svg.localName!=='svg')return null;
    const length=value=>/^\d+(?:\.\d+)?(?:px)?$/.test(value || '') ? parseFloat(value):NaN;
    let width=length(svg.getAttribute('width')),height=length(svg.getAttribute('height'));
    if(![width,height].every(value=>value>0))return null;
    const rect=element.getBoundingClientRect(),n=name=>parseFloat(css[name]),left=n('borderLeftWidth'),top=n('borderTopWidth'),fullWidth=n('width')+(css.boxSizing==='border-box' ? 0:left+n('borderRightWidth')+n('paddingLeft')+n('paddingRight')),fullHeight=n('height')+(css.boxSizing==='border-box' ? 0:top+n('borderBottomWidth')+n('paddingTop')+n('paddingBottom')),w=fullWidth-left-n('borderRightWidth'),h=fullHeight-top-n('borderBottomWidth'),sx=rect.width/fullWidth,sy=rect.height/fullHeight;
    const size=css.backgroundSize.split(' '),resolve=(value,available)=>/^-?[\d.]+%$/.test(value) ? parseFloat(value)*available/100:length(value);
    if(size[0]==='contain' || size[0]==='cover'){const factor=(size[0]==='contain' ? Math.min:Math.max)(w/width,h/height);width*=factor;height*=factor;}
    else {const a=size[0]==='auto' ? null:resolve(size[0],w),b=!size[1] || size[1]==='auto' ? null:resolve(size[1],h),ratio=width/height;width=a ?? (b===null ? width:b*ratio);height=b ?? (a===null ? height:a/ratio);}
    const position=css.backgroundPosition.match(/calc\([^)]*\)|\S+/g) || [],offset=(value,available)=>{const calc=value?.match(/^calc\(([-\d.]+)% ([+-]) ([\d.]+)px\)$/);return calc ? available*Number(calc[1])/100+(calc[2]==='-' ? -1:1)*Number(calc[3]):resolve(value,available);};
    const x=left+offset(position[0],w-width),y=top+offset(position[1],h-height);
    if(![x,y,width,height,sx,sy].every(Number.isFinite) || width<=0 || height<=0 || sx<=0 || sy<=0)return null;
    return {left:rect.left+x*sx,right:rect.left+(x+width)*sx,top:rect.top+y*sy,bottom:rect.top+(y+height)*sy,width:width*sx,height:height*sy};
}

function frameBox(frame,root,basis) {
    const view=frame.ownerDocument.defaultView,style=view.getComputedStyle(frame),rect=frame.getBoundingClientRect();
    const inset=side=>parseFloat(style['border'+side+'Width'])+parseFloat(style['padding'+side]);
    const left=inset('Left'),top=inset('Top'),right=inset('Right'),bottom=inset('Bottom');
    const width=parseFloat(style.width)+(style.boxSizing==='border-box' ? 0:left+right),height=parseFloat(style.height)+(style.boxSizing==='border-box' ? 0:top+bottom);
    if(![width,height,left,top,right,bottom].every(Number.isFinite) || width<=left+right || height<=top+bottom)return null;
    let matrix=new view.DOMMatrix();
    for(let element=frame;element&&element!==root;element=element.parentElement){
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
    if(basis)matrix=new view.DOMMatrix([basis.a,basis.b,basis.c,basis.d,0,0]).multiply(matrix);
    let {a,b,c,d}=matrix;
    const sx=rect.width/(Math.abs(a)*width+Math.abs(c)*height),sy=rect.height/(Math.abs(b)*width+Math.abs(d)*height);
    a*=sx;c*=sx;b*=sy;d*=sy;
    const determinant=a*d-b*c;
    if(![a,b,c,d,determinant].every(Number.isFinite) || Math.abs(determinant)<1e-10)return null;
    const x=rect.left-Math.min(0,a*width,c*height,a*width+c*height),y=rect.top-Math.min(0,b*width,d*height,b*width+d*height);
    return {a,b,c,d,bounds:{left:0,top:0,right:width,bottom:height},content:{left,top,right:width-right,bottom:height-bottom},
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
    if(hit.matches('select:open'))return hit;
    if(hit.matches('input.b3-switch[type="checkbox"]'))return hit;
    if(hit.matches('mark') && hit.parentElement.matches(COMPONENT_HIGHLIGHT_TEXT))hit=hit.parentElement;
    if(hit.namespaceURI==='http://www.w3.org/2000/svg')hit=(hit.closest('select:open option') ? hit.closest('svg'):hit.closest(CURSOR_CONTROL) || hit.closest('svg')) || hit;
    if(hit.matches('.b3-list-item__arrow') && componentTreeRegion(hit))hit=hit.closest('.b3-list-item__toggle') || hit;
    // Overflowing option text still belongs to the native option hit by the browser.
    if(hit.closest('select:open option'))return hit;
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

function componentScrollbar(element,point,parts=true) {
    const cache=parts ? componentMeasurements?.scrollbars:componentMeasurements?.scrollbarAreas;
    if(cache?.has(element))return cache.get(element);
    const result=measureComponentScrollbar(element,point,parts);
    if(!parts || !result || !point || result.areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom))cache?.set(element,result);
    return result;
}

function measureComponentScrollbar(element,point,parts) {
    if(!(element.offsetWidth>element.clientWidth || element.offsetHeight>element.clientHeight))return;
    const doc=element.ownerDocument,view=doc.defaultView,css=view.getComputedStyle(element),n=side=>parseFloat(css['border'+side+'Width']);
    const vertical=['auto','scroll'].includes(css.overflowY) && element.scrollHeight>element.clientHeight && element.offsetWidth-element.clientWidth-n('Left')-n('Right')>.5,horizontal=['auto','scroll'].includes(css.overflowX) && element.scrollWidth>element.clientWidth && element.offsetHeight-element.clientHeight-n('Top')-n('Bottom')>.5;
    if(!vertical&&!horizontal)return;
    const r=element.getBoundingClientRect(),bar=view.getComputedStyle(element,'::-webkit-scrollbar'),width=parseFloat(bar.width)||element.offsetWidth-element.clientWidth-n('Left')-n('Right'),height=parseFloat(bar.height)||element.offsetHeight-element.clientHeight-n('Top')-n('Bottom'),left=Math.round(r.left+n('Left')),right=Math.round(r.right-n('Right')),top=Math.round(r.top+n('Top')),bottom=Math.round(r.bottom-n('Bottom'));
    const vx=css.direction==='rtl' ? left:right-width,hy=bottom-height,areas=[];
    if(vertical)areas.push({left:vx,right:vx+width,top,bottom:horizontal?hy:bottom});
    if(horizontal)areas.push({left:vertical&&css.direction==='rtl'?left+width:left,right:vertical&&css.direction!=='rtl'?vx:right,top:hy,bottom});
    if(vertical&&horizontal)areas.push({left:vx,right:vx+width,top:hy,bottom});
    const result={areas,parts:{}};
    if(!parts || point&&!areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom))return result;
    // shortcut: native minimums, buttons, picker scroll state and transformed bars need separate calibration.
    for(let parent=element;parent;parent=parent.parentElement){const s=view.getComputedStyle(parent),matrix=new view.DOMMatrix(s.transform==='none'?undefined:s.transform);if(!matrix.is2D||matrix.a!==1||matrix.b!==0||matrix.c!==0||matrix.d!==1||s.scale!=='none'||s.rotate!=='none'||s.perspective!=='none'||s.zoom!=='1')return result;}
    if(css.writingMode!=='horizontal-tb' || css.scrollbarWidth!=='auto' || css.scrollbarColor!=='auto' || ![bar.width,bar.height].every(v=>/^\d+(?:\.\d+)?px$/.test(v)) || bar.display==='none' || element.matches('select:open'))return result;
    const safe=rule=>{
        if(rule.media?.mediaText&&!view.matchMedia(rule.media.mediaText).matches)return true;
        if(rule.conditionText&&rule.constructor.name==='CSSSupportsRule'&&!view.CSS.supports(rule.conditionText))return true;
        if(rule.styleSheet)return [...rule.styleSheet.cssRules].every(safe);
        if(rule.selectorText){if(!rule.selectorText.includes('::-webkit-scrollbar'))return true;for(const selector of rule.selectorText.split(',')){
            const match=selector.match(/^(.*?)::(-webkit-scrollbar(?:-thumb|-track-piece|-track|-button|-corner)?)(.*)$/);if(!match || !element.matches(match[1].trim()||'*'))continue;
            if(match[2]==='-webkit-scrollbar-button'&&rule.style.display!=='none' || match[2]==='-webkit-scrollbar-track-piece')return false;
            if(/:(horizontal|vertical|start|end|decrement|increment|single-button|double-button|no-button)\b/.test(match[3])&&[...rule.style].some(name=>/width|height|margin|display/.test(name)))return false;
        }return true;}
        return !rule.cssRules || [...rule.cssRules].every(safe);
    };
    try{if(![...doc.styleSheets].filter(s=>!s.disabled).every(s=>(!s.media.mediaText||view.matchMedia(s.media.mediaText).matches)&&[...s.cssRules].every(safe) || s.media.mediaText&&!view.matchMedia(s.media.mediaText).matches))return result;}catch{return result;}
    const thumb=view.getComputedStyle(element,'::-webkit-scrollbar-thumb'),track=view.getComputedStyle(element,'::-webkit-scrollbar-track');
    if([thumb,track].some(s=>s.display==='none'||s.visibility!=='visible'||Number(s.opacity)<=.01||s.transform!=='none'||['Top','Right','Bottom','Left'].some(side=>parseFloat(s['margin'+side])!==0)))return result;
    let nativeLimit;
    if(['width','height'].some(axis=>thumb[axis]==='auto')){
        if(!/Windows/.test(view.navigator.userAgent))return result;
        const host=doc.createElement('div'),marker=doc.createElement('div');host.className='collab-text-measure';host.style.cssText='all:initial!important;position:fixed!important;visibility:hidden!important;pointer-events:none!important';marker.style.cssText='all:initial;display:block;width:100px;height:100px;border:0;padding:0;overflow:scroll;scrollbar-width:auto;scrollbar-color:auto';
        // A shadow root isolates native metrics without invalidating the document's stylesheets.
        try{host.attachShadow({mode:'closed'}).append(marker);doc.body.append(host);nativeLimit=2*Math.max(marker.offsetWidth-marker.clientWidth,marker.offsetHeight-marker.clientHeight);}finally{host.remove();}
        if(!(nativeLimit>0))return result;
    }
    for(const [axis,area]of [...(vertical?[['y',areas[0]]]:[]),...(horizontal?[['x',areas[vertical?1:0]]]:[])]){
        const start=axis==='x'?'left':'top',end=axis==='x'?'right':'bottom',size=axis==='x'?'width':'height',length=area[end]-area[start],visible=axis==='x'?element.clientWidth:element.clientHeight,total=axis==='x'?element.scrollWidth:element.scrollHeight,offset=axis==='x'?(css.direction==='rtl'?total-visible+element.scrollLeft:element.scrollLeft):element.scrollTop;
        const value=text=>/^(?:\d+(?:\.\d+)?)px$/.test(text)?Math.trunc(parseFloat(text)):NaN,min=value(thumb[size==='width'?'minWidth':'minHeight']),max=thumb[size==='width'?'maxWidth':'maxHeight']==='none'?Infinity:value(thumb[size==='width'?'maxWidth':'maxHeight']),explicit=value(thumb[size]),proportional=Math.round(length*visible/total);
        if(!Number.isFinite(min)||Number.isNaN(max)||thumb[size]==='auto'&&proportional<Math.min(max,Math.max(min,nativeLimit)))continue;
        const minimum=thumb[size]==='auto'?min:Math.max(min,Math.min(max,explicit)),thumbLength=Math.min(length,Math.max(proportional,minimum));if(!Number.isFinite(thumbLength)||thumbLength<=0)continue;
        const raw=Math.max(0,Math.min(total-visible,offset))*(length-thumbLength)/(total-visible),position=raw>0&&raw<1?1:Math.trunc(raw),rect={...area,[start]:area[start]+position,[end]:area[start]+position+thumbLength};
        result.parts['scrollbar-'+axis+'-thumb']=rect;
        if(rect[start]>area[start])result.parts['scrollbar-'+axis+'-before']={...area,[end]:rect[start]};
        if(rect[end]<area[end])result.parts['scrollbar-'+axis+'-after']={...area,[start]:rect[end]};
    }
    if(vertical&&horizontal)result.parts['scrollbar-corner']=areas[2];
    return result;
}

function componentGeometry(element,point,scrollbar=componentScrollbar(element,point),fieldText) {
    if(element.matches(COMPONENT_DATE_FIELD)){
        const date=componentDateField(element);if(!date)return null;
        const viewport=date.content.viewport,bounds=date.plane?{...date.plane.bounds,width:date.plane.bounds.right,height:date.plane.bounds.bottom}:element.getBoundingClientRect(),image=date.image;
        if(date.plane)point=date.plane.toLocal(point);
        if(!(image&&point.x>=image.left&&point.x<image.right&&point.y>=image.top&&point.y<image.bottom)&&(point.y<viewport.top||point.y>=viewport.bottom)){
            const above=point.y<viewport.top,start=above?bounds.top:viewport.bottom,end=above?viewport.top:bounds.bottom;
            if(point.x<bounds.left||point.x>=bounds.right||point.y<start||point.y>=end)return null;
            return {edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:above?[{kind:'self',side:'start'},{kind:'field-viewport',side:'start'}]:[{kind:'field-viewport',side:'end'},{kind:'self',side:'end'}]},x:(point.x-bounds.left)/bounds.width,y:(point.y-start)/(end-start)};
        }
        if(date.plane)point=date.plane.toParent(point);
    }
    if(element.matches('input,textarea') && ['text','search','number','email','url','tel','password','textarea'].includes(element.type) && !componentTextField(element))return null;
    const contains=rect=>point.x>=rect.left&&point.x<rect.right&&point.y>=rect.top&&point.y<rect.bottom;
    if(scrollbar?.areas.some(contains)){
        const part=Object.entries(scrollbar.parts).find(([,rect])=>contains(rect));if(!part)return null;
        const [kind,rect]=part;return {edges:{x:[{kind,side:'start'},{kind,side:'end'}],y:[{kind,side:'start'},{kind,side:'end'}]},x:(point.x-rect.left)/(rect.right-rect.left),y:(point.y-rect.top)/(rect.bottom-rect.top)};
    }
    const picker=element.matches('select:open') ? componentPicker(element):null,inside=rect=>rect && point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom;
    const parentPoint=point,textPlane=element.matches(COMPONENT_DATE_FIELD)?componentDateField(element)?.plane:componentPickerElementPlane(element);if(textPlane===null || textPlane && element.textContent && typeof Intl.Segmenter!=='function')return null;
    if(picker?.toLocal)point=picker.toLocal(point);
    const onPicker=inside(picker?.bounds),select=(element.matches('select') || componentSelectField(element)) && !onPicker;if(select && !componentTextField(element))return null;
    if(!onPicker)point=parentPoint;
    // Native scrollbar thumbs need their own geometry; a reserved gutter is never ordinary padding.
    if(onPicker && inside(picker.border) && !inside(picker.viewport))return null;
    const slider=element.matches('input[type="range"]'),toggle=element.matches('input.b3-switch[type="checkbox"]'),range=slider ? componentRange(element):toggle ? componentSwitch(element):null;
    if((slider || toggle) && !range)return null;
    const color=element.matches('input[type="color"]') ? componentColor(element):null;if(element.matches('input[type="color"]')&&!color)return null;
    const checkbox=componentCheckbox(element);
    const box=range?.box || color?.box || checkbox?.box || (element.matches('iframe') ? frameBox(element):null) || (onPicker&&picker?.toLocal ? picker:textPlane);if(element.matches('iframe') && !box)return null;
    if(box)point=box.toLocal(parentPoint);
    const onThumb=range && point.x>=range.thumb.left && point.x<=range.thumb.right && point.y>=range.thumb.top && point.y<=range.thumb.bottom;
    let bounds=textPlane ? textPlane.rect(element):box ? box.bounds:element.getBoundingClientRect();if(!bounds)return null;
    if(color && inside(color.fill))return {edges:{x:[{kind:'color-fill',side:'start'},{kind:'color-fill',side:'end'}],y:[{kind:'color-fill',side:'start'},{kind:'color-fill',side:'end'}]},x:(point.x-color.fill.left)/(color.fill.right-color.fill.left),y:(point.y-color.fill.top)/(color.fill.bottom-color.fill.top)};
    if(checkbox && inside(checkbox.face)){
        const kind=componentCheckboxPart(element,checkbox,point);if(!kind)return null;
        return {edges:{x:[{kind,side:'start'},{kind,side:'end'}],y:[{kind,side:'start'},{kind,side:'end'}]},x:(point.x-checkbox.face.left)/(checkbox.face.right-checkbox.face.left),y:(point.y-checkbox.face.top)/(checkbox.face.bottom-checkbox.face.top)};
    }
    if(toggle && (point.x<bounds.left || point.x>bounds.right || point.y<bounds.top || point.y>bounds.bottom)){
        if(!componentSwitchHaloContains(range.halo,point))return null;
        return {edges:{x:[{kind:'switch-halo',side:'start'},{kind:'switch-halo',side:'end'}],y:[{kind:'switch-halo',side:'start'},{kind:'switch-halo',side:'end'}]},x:(point.x-range.halo.left)/(range.halo.right-range.halo.left),y:(point.y-range.halo.top)/(range.halo.bottom-range.halo.top)};
    }
    const paint=!box && (point.x<bounds.left || point.x>bounds.right || point.y<bounds.top || point.y>bounds.bottom);
    if(paint)bounds=componentPaintRect(element);
    if(onPicker)bounds=picker.bounds;
    const field=onPicker ? null:componentFieldContent(element),empty=field && (element.matches(COMPONENT_DATE_FIELD) ? !componentDateField(element).glyphs.length:!componentFieldText(element)),padding=field && (!inside(field) || element.matches(COMPONENT_DATE_FIELD) && !inside(field.viewport));
    const children=onPicker ? picker.children:box&&!textPlane || select ? []:componentChildren(element),image=onPicker ? null:componentImageRect(element,textPlane),frame=range?.content || (!checkbox&&!color&&!textPlane&&!onPicker&&box?.content),list=componentListRect(element),tree=element.matches('.backlinkList__item,.sy__backlink--bottom') && componentBacklinkContext(element) || element.matches('ul') && element.closest('.sy__tag,.sy__bookmark,.sy__outline');
    // Person-local badges must not change shared row gaps or their text offsets.
    let text=empty || onPicker || box&&!textPlane || padding && !element.matches('select,textarea') || element.matches('.collab-person,.collab-person__details,.collab-person__details > strong') ? []:fieldText || componentNearText(element,parentPoint,textPlane) || [];
    const glyph=text.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom),imagePoint=image && !(select && glyph) && point.x>=image.left && point.x<=image.right && point.y>=image.top && point.y<=image.bottom ? {x:(point.x-image.left)/image.width,y:(point.y-image.top)/image.height}:null;
    if(glyph){const {rect,offset}=glyph;return {edges:{x:[{kind:'text',side:'start',offset},{kind:'text',side:'end',offset}],y:[{kind:'text',side:'start',offset},{kind:'text',side:'end',offset}]},x:(point.x-rect.left)/rect.width,y:(point.y-rect.top)/rect.height,textHash:componentTextHash(element)};}
    if((select || element.matches(COMPONENT_DATE_FIELD)) && imagePoint)return {edges:{x:[{kind:'image',side:'start'},{kind:'image',side:'end'}],y:[{kind:'image',side:'start'},{kind:'image',side:'end'}]},x:imagePoint.x,y:imagePoint.y,imagePoint};
    if(padding && !glyph)text=[];
    if(select && !glyph && !image && element.ownerDocument.defaultView.getComputedStyle(element).backgroundImage!=='none')return null;
    if(!onPicker && componentTextField(element) && !text.length && !padding && !imagePoint && !empty)return null;
    const edges={},relative={};let usedText=!!(element.matches('.counter') && (componentTreeRegion(element) || element.closest('.search__list')));
    for(const [axis,start,end,otherStart,otherEnd] of [['x','left','right','top','bottom'],['y','top','bottom','left','right']]) {
        const other=point[axis==='x' ? 'y':'x'];
        const column=axis==='x' && element.matches('.sb[data-sb-layout="col"]');
        const entries=[{value:bounds[start],edge:{kind:onPicker ? 'picker-box':box&&!textPlane ? 'frame-box':paint ? 'paint':'self',side:'start'}},{value:bounds[end],edge:{kind:onPicker ? 'picker-box':box&&!textPlane ? 'frame-box':paint ? 'paint':'self',side:'end'}}];
        if(color)for(const kind of ['fill','swatch'])for(const [side,key]of [['start',start],['end',end]])entries.unshift({value:color[kind][key],edge:{kind:'color-'+kind,side}});
        if(checkbox)for(const [side,key]of [['start',start],['end',end]])entries.unshift({value:checkbox.face[key],edge:{kind:'checkbox-face',side}});
        if(onPicker && (other<picker.border[otherStart] || other>=picker.border[otherEnd]) && point[axis]>=picker.border[start] && point[axis]<picker.border[end]){edges[axis]=entries.map(item=>item.edge);relative[axis]=(point[axis]-bounds[start])/(bounds[end]-bounds[start]);continue;}
        if(onPicker)for(const part of point[axis]<picker.border[start] || point[axis]>=picker.border[end] ? ['content','viewport','border']:['border','viewport','content'])for(const [side,key]of [['start',start],['end',end]])entries.unshift({value:picker[part][key],edge:{kind:'picker-'+part,side}});
        if(image && (!(select || element.matches(COMPONENT_DATE_FIELD)) || !glyph && other>=image[otherStart] && other<=image[otherEnd]))for(const [side,key] of [['start',start],['end',end]])if(image[key]>=bounds[start] && image[key]<=bounds[end])entries.push({value:image[key],edge:{kind:'image',side}});
        if(frame && !onThumb && !(range && axis==='x' && point.x>=range.thumb.left && point.x<=range.thumb.right))for(const [side,key] of [['start',start],['end',end]])entries.push({value:frame[key],edge:{kind:toggle?'switch-track':'frame',side}});
        if(range)for(const part of onThumb || axis==='x' && point.x>=range.thumb.left && point.x<=range.thumb.right ? ['thumb']:['thumb','track']){
            const rect=range[part];if(axis==='y' && (point.x<rect.left || point.x>rect.right))continue;
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.push({value:rect[key],edge:{kind:(toggle?'switch-':'range-')+part,side}});
        }
        if(field?.viewport)for(const [side,key] of [['start',start],['end',end]])entries.push({value:field.viewport[key],edge:{kind:'field-viewport',side}});
        // A collapsed content box still has visible padding on each outward side.
        if(field && !text.some(item=>point[axis]>=item.rect[start] && point[axis]<item.rect[end]))for(const [side,key] of point[axis]>=field[end] ? [['end',end],['start',start]]:[['start',start],['end',end]]){
            const entry={value:field[key],edge:{kind:'field',side}};
            if(select)entries.unshift(entry);else entries.push(entry);
        }
        const perimeter=list && (point[axis]<list[start] || point[axis]>list[end] || tree && (point.x<list.left || point.x>list.right));
        if(perimeter)for(const [side,key] of [['start',start],['end',end]])if(list[key]>=bounds[start] && list[key]<=bounds[end])entries.push({value:list[key],edge:{kind:'list',side}});
        // At coincident bounds, prefer the nearest end row over the resizable list box.
        if(perimeter && axis==='y' && tree)for(const part of point.y-bounds.top<=bounds.bottom-point.y ? ['last','first']:['first','last']){
            const rect=componentListRect(element,part);
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.unshift({value:rect[key],edge:{kind:'list-'+part,side}});
        }
        const references=(perimeter || onPicker && (axis==='x' && !picker.twoAxes || !inside(picker.content)) ? []:children).map(child=>({child,rect:box?.rect ? box.rect(child):child.getBoundingClientRect()})).filter(({rect})=>rect?.width && rect.height);
        const beside=onPicker && picker.twoAxes && [otherEnd,otherStart].map((key,index)=>references.filter(({rect})=>point[axis]>=rect[start] && point[axis]<=rect[end] && (index ? rect[key]>=other:rect[key]<=other)).sort((a,b)=>index ? a.rect[key]-b.rect[key]:b.rect[key]-a.rect[key])[0]?.child);
        const adjacent=beside && beside.every(Boolean) ? beside:null;
        const distance=rect=>Math.max(rect[otherStart]-other,other-rect[otherEnd],0);
        const nearest=onPicker && picker.twoAxes ? [start,end].map((key,index)=>Math.min(...references.filter(({rect})=>index ? rect[key]>=point[axis]:rect[key]<=point[axis]).map(({rect})=>distance(rect)))):[0,0];
        for(const {child,rect} of references){
            for(const [side,key] of [['start',start],['end',end]])if((onPicker || rect[key]>=bounds[start] && rect[key]<=bounds[end]) && (column || (adjacent ? adjacent.includes(child):distance(rect)<=nearest[rect[key]>point[axis] ? 1:0]))){
                // At grid crossings, keep shared row edges independent of column distance.
                const entry={value:rect[key],edge:{kind:'child',side,child:onPicker && !adjacent ? references.find(({rect:r})=>box?.rect ? Math.abs(r[key]-rect[key])<.001:r[key]===rect[key]).child:child}};
                if(onPicker || column && child.hasAttribute('data-node-id'))entries.unshift(entry);else entries.push(entry);
            }
        }
        for(const item of text)for(const [side,key] of [['start',start],['end',end]])if(item.rect[key]>=bounds[start] && item.rect[key]<=bounds[end])entries.push({value:item.rect[key],edge:{kind:'text',side,offset:item.offset}});
        // A visible picker gap keeps its neighbors even when their edges scroll out of view.
        const childEntries=onPicker ? entries.filter(item=>item.edge.kind==='child'):[];
        // Inverting transformed boxes introduces tiny errors between otherwise coincident row edges.
        const compare=(a,b)=>box?.rect&&Math.abs(a.value-b.value)<.001 ? 0:a.value-b.value;
        const pair=[childEntries.filter(item=>item.value<=point[axis]).sort((a,b)=>compare(b,a))[0],childEntries.filter(item=>item.value>=point[axis]).sort(compare)[0]];
        const lower=pair.every(Boolean) ? pair[0]:entries.filter(item=>item.value<=point[axis]).sort((a,b)=>compare(b,a))[0];
        const upper=pair.every(Boolean) ? pair[1]:entries.filter(item=>item.value>=point[axis]).sort(compare)[0];
        if(!lower || !upper)return null;
        // Build sibling identities only for the chosen boundaries, not every candidate in a large list.
        edges[axis]=[lower.edge,upper.edge].map(edge=>edge.kind==='child' ? {kind:edge.kind,side:edge.side,step:componentStep(edge.child)}:edge);relative[axis]=upper.value===lower.value ? 0:(point[axis]-lower.value)/(upper.value-lower.value);
        usedText ||= lower.edge.kind==='text' || upper.edge.kind==='text';
    }
    return {edges,...relative,...(usedText ? {textHash:componentTextHash(element)}:{}),...(imagePoint ? {imagePoint}:{})};
}

function captureComponent(hit,plugin,point) {
    const previous=componentMeasurements;componentMeasurements ||= {};
    try{return captureMeasuredComponent(hit,plugin,point);}finally{componentMeasurements=previous;}
}

function captureMeasuredComponent(hit,plugin,point) {
    if(hit.closest('[data-private]') || componentSearchField(hit)===null || componentAssetPath(hit)===null || componentSuperblockDivider(hit)===null || componentBazaarPackage(hit)===null)return null;
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
        if(!visibleElement(inner) || inner.closest('[data-private]') || componentSearchField(inner)===null || componentSuperblockDivider(inner)===null || componentBazaarPackage(inner)===null || inner.matches('canvas'))return null;
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
    const previous=componentMeasurements;componentMeasurements ||= {};
    try{return resolveMeasuredComponent(cursor,plugin);}finally{componentMeasurements=previous;}
}

function resolveMeasuredComponent(cursor,plugin) {
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
    if(!visibleElement(element) || element.closest('[data-private]') || element.matches('canvas') || componentBazaarPackage(element)===null || componentColorContext(element)===null ||
        anchor.textHash && componentTextHash(element)!==anchor.textHash)return null;
    const scrollbarAnchor=Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('scrollbar-')),scrollbar=scrollbarAnchor&&componentScrollbar(element);
    if(scrollbarAnchor&&!scrollbar)return null;
    // A grid crossing can be bounded entirely by option edges.
    const pickerAnchor=Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('picker-') || edge.kind==='child' && element.matches('select')),picker=pickerAnchor && componentPicker(element);
    if(pickerAnchor && !picker)return null;
    const textPlane=element.matches(COMPONENT_DATE_FIELD)?componentDateField(element)?.plane:componentPickerElementPlane(element);if(textPlane===null || textPlane && element.textContent && typeof Intl.Segmenter!=='function')return null;
    const select=(element.matches('select') || componentSelectField(element)) && !picker;
    if(select && !componentTextField(element))return null;
    if(!picker && componentTextField(element) && !Object.values(anchor.edges).flat().some(edge=>edge.kind==='text' || edge.kind==='field' || edge.kind==='field-viewport' || (select || element.matches(COMPONENT_DATE_FIELD)) && edge.kind==='image'))return null;
    const slider=element.matches('input[type="range"]'),toggle=element.matches('input.b3-switch[type="checkbox"]'),range=slider ? componentRange(element):toggle ? componentSwitch(element):null;
    if((slider || toggle) && (!range || !Object.values(anchor.edges).flat().some(edge=>[(toggle?'switch-':'range-')+'thumb',(toggle?'switch-':'range-')+'track',...(toggle?['switch-halo']:[]),'frame','frame-box'].includes(edge.kind))))return null;
    const haloAnchor=toggle && Object.values(anchor.edges).flat().every(edge=>edge.kind==='switch-halo');
    const color=element.matches('input[type="color"]') ? componentColor(element):null;if(element.matches('input[type="color"]')&&!color)return null;
    const checkbox=componentCheckbox(element);
    if(color && !Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('color-')))return null;
    if(checkbox && !Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('checkbox-')))return null;
    const box=range?.box || color?.box || checkbox?.box || (element.matches('iframe') ? frameBox(element):null) || (picker?.toLocal ? picker:textPlane);if(element.matches('iframe') && !box)return null;
    const offsets=[...new Set(Object.values(anchor.edges).flat().filter(edge=>edge.kind==='text').map(edge=>edge.offset))];
    const field=picker ? null:componentFieldContent(element),fieldRects=offsets.length && componentTextField(element) ? componentFieldMeasure(element,(_,character)=>new Map(offsets.map(offset=>[offset,character(offset)]))):null;
    const point={};
    for(const [axis,start,end] of [['x','left','right'],['y','top','bottom']]) {
        if(anchor.imagePoint){
            const rect=componentImageRect(element,textPlane);if(!rect)return null;
            point[axis]=rect[start]+(rect[end]-rect[start])*anchor.imagePoint[axis];continue;
        }
        const values=anchor.edges[axis].map(edge=>{
            const target=edge.kind==='self' ? element:edge.kind==='child' ? componentChild(element,edge.step):null;
            const rect=edge.kind.startsWith('color-') ? color?.[edge.kind.slice(6)]:edge.kind.startsWith('checkbox-') ? checkbox?.face:edge.kind.startsWith('scrollbar-') ? scrollbar?.parts[edge.kind]:edge.kind.startsWith('picker-') ? picker?.[edge.kind==='picker-box' ? 'bounds':edge.kind.slice(7)]:edge.kind==='text' ? fieldRects ? fieldRects.get(edge.offset):componentCharacter(element,edge.offset,textPlane):edge.kind==='paint' ? componentPaintRect(element):edge.kind==='image' ? componentImageRect(element,textPlane):edge.kind==='list' ? componentListRect(element):['list-first','list-last'].includes(edge.kind) ? componentListRect(element,edge.kind.slice(5)):edge.kind==='field' ? field:edge.kind==='field-viewport' ? field?.viewport:edge.kind==='frame' ? range?.content || box?.content:edge.kind==='frame-box' ? box?.bounds:edge.kind.startsWith('switch-') ? toggle && range?.[edge.kind.slice(7)]:edge.kind.startsWith('range-') ? slider && range?.[edge.kind.slice(6)]:box?.rect&&target ? box.rect(target):box && target===element ? box.bounds:target?.getBoundingClientRect();
            return rect?.[edge.side==='start' ? start:end];
        });
        const collapsedField=field && anchor.edges[axis].every(edge=>edge.kind==='field') && field[start]===field[end];
        if(values.some(value=>!Number.isFinite(value)) || values[1]<values[0] ||
            values[0]===values[1] && JSON.stringify(anchor.edges[axis][0])!==JSON.stringify(anchor.edges[axis][1]) && !collapsedField)return null;
        point[axis]=values[0]+(values[1]-values[0])*cursor[axis];
    }
    if(haloAnchor && !componentSwitchHaloContains(range.halo,point))return null;
    if(box)Object.assign(point,box.toParent(point));
    if(!scrollbarAnchor&&componentScrollbar(element,point,false)?.areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom))return null;
    const precise=element.matches('input,textarea') || scrollbarAnchor || picker || textPlane || select || range || fieldRects || Object.values(anchor.edges).flat().some(edge=>edge.kind==='field' || edge.kind==='field-viewport');
    const gaps=['x','y'].filter(axis=>{const [a,b]=anchor.edges[axis];return a.kind==='child' && b.kind==='child' && componentChild(element,a.step)!==componentChild(element,b.step);});
    if(!haloAnchor && (precise || gaps.length)){
        // Native text can extend into padding, but remains clipped at its edit viewport.
        const clip=element.matches('textarea,'+COMPONENT_DATE_FIELD) ? field?.viewport:field;
        const clipPoint=element.matches(COMPONENT_DATE_FIELD)&&box?box.toLocal(point):point;
        if(fieldRects && clip && !element.matches('select') && (clipPoint.x<clip.left || clipPoint.x>=clip.right || clipPoint.y<clip.top || clipPoint.y>=clip.bottom))return null;
        const glyph=fieldRects && Object.values(anchor.edges).flat().every(edge=>edge.kind==='text' && edge.offset===offsets[0]) && {offset:offsets[0],rect:fieldRects.get(offsets[0])};
        const local=componentGeometry(element,point,scrollbarAnchor?scrollbar:undefined,glyph?.rect ? [glyph]:undefined);
        if(!local)return null;
        const same=['x','y'].every(axis=>!precise && !gaps.includes(axis) || anchor.edges[axis].every((edge,index)=>{
            const match=local.edges[axis][index],collapsed=field && (axis==='x' ? field.left===field.right:field.top===field.bottom);
            const colorKey=axis==='x' ? edge.side==='start'?'left':'right':edge.side==='start'?'top':'bottom',sameColor=color && [edge.kind,match.kind].every(kind=>['color-fill','color-swatch'].includes(kind)) && color.fill[colorKey]===color.swatch[colorKey];
            return (edge.kind===match.kind || sameColor) && edge.offset===match.offset && (edge.side===match.side || edge.kind==='field' && collapsed) &&
                (edge.kind!=='child' || edge.step.key===match.step.key && edge.step.count===match.step.count && edge.step.index===match.step.index);
        }));
        if(select){
            const glyph=edges=>['x','y'].every(axis=>edges[axis].every(edge=>edge.kind==='text' && edge.offset===edges.x[0].offset));
            if(anchor.imagePoint ? !local.imagePoint:glyph(anchor.edges) ? !same:glyph(local.edges) || local.imagePoint)return null;
        }else if(!same)return null;
    }
    const hit=componentHit(element.ownerDocument,point);
    const target=anchor.target ? componentFollow(element,anchor.target):element;
    if(target!==element && target?.matches('input.b3-switch[type="checkbox"]'))return null;
    const highlight=target===element && element.matches(COMPONENT_HIGHLIGHT_TEXT) && hit?.matches('mark') && hit.parentElement===element;
    const treeToggle=hit===element && element.matches('.b3-list-item__toggle') && target?.closest('svg')?.matches('.b3-list-item__arrow') && componentTreeRegion(element);
    // A blank cell must remain blank; a newly inserted child must not inherit its pointer.
    if(!visibleElement(target) || target.closest('[data-private]') || componentSearchField(target)===null || componentAssetPath(target)===null || componentSuperblockDivider(target)===null || componentBazaarPackage(target)===null || !visibleElement(hit) || hit.closest('[data-private]') || hit!==target && !highlight && !treeToggle && !(hit?.namespaceURI==='http://www.w3.org/2000/svg' && target.contains(hit)))return null;
    if(element.matches('iframe') && frameToContent(element,point))return null;
    for(const frame of frames.reverse()){
        const parentPoint=frameToParent(frame,point);if(!parentPoint)return null;Object.assign(point,parentPoint);
        if(frame.ownerDocument.elementFromPoint(point.x,point.y)!==frame)return null;
    }
    return point;
}

const textLabel = (element) => (element?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
function visibleElement(element) {
    if(!element)return false;
    const cache=componentMeasurements && (componentMeasurements.visibility ||= new WeakMap());if(cache?.has(element))return cache.get(element);
    const visible=measureVisibleElement(element);cache?.set(element,visible);return visible;
}

function measureVisibleElement(element) {
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
    if (!point || document.hidden) return null;
    const hit=componentHit(document,point);
    if (!visibleElement(hit) || hit.closest('[data-private]')) return null;
    const active=document.activeElement;
    const editable=document.hasFocus?.() && active?.matches('input:not([type]),input[type="text"],input[type="search"],textarea,[contenteditable="true"]') && !active.closest('[data-private]');
    const state=editable ? (plugin?.typingTarget===active ? 'typing':'editing'):undefined;
    const activity=state ? {state}:{};
    const screen={x:Math.max(0,Math.min(1,point.x/window.innerWidth)),y:Math.max(0,Math.min(1,point.y/window.innerHeight))};
    const page=plugin ? currentPage(plugin) : {kind:'workspace',title:''};
    const scrollbar=componentScrollbar(hit,point,false),onScrollbar=scrollbar?.areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom);
    const anchored=!onScrollbar && captureDocumentCursor(point);
    if (anchored&&!onScrollbar) return {...anchored,screen,page,...activity};
    const pdf=capturePDF(hit,plugin,point);
    if(pdf!==undefined)return pdf ? {surface:'ui',documentId:null,blockId:null,page,screen,...pdf,...activity}:null;
    const component=captureComponent(hit,plugin,point);
    return component ? {surface:'ui',documentId:null,blockId:null,page,screen,...component,...activity}:null;
}

function resolveCursor(cursor, plugin) {
    // Legacy whole-box ratios cannot preserve glyphs or gaps after receiver reflow.
    if(cursor?.surface==='ui')return cursor.ui?.version===3 ? resolveComponent(cursor,plugin):null;
    return resolveDocumentCursor(cursor);
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
            const stopDocument=()=>{observer?.disconnect();observer=null;doc?.removeEventListener('click',rememberColorEditor,true);doc?.removeEventListener('pointermove',move,true);doc?.removeEventListener('keydown',this.handleKey,true);doc?.removeEventListener('scroll',this.handleCursorLayout,true);doc?.removeEventListener('input',this.handleCursorLayout,true);doc?.removeEventListener('change',this.handleCursorLayout,true);doc?.defaultView?.removeEventListener('resize',this.handleCursorLayout);if(doc)clearComponentStyles(doc);doc=null;};
            const load=()=>{
                let next;try{next=frame.contentDocument;}catch{}
                if(next===doc)return;
                stopDocument();
                doc=next;if(!doc)return;
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
        document.querySelectorAll(".sy__file .collab-presence").forEach((row) => this.clearRow(row));
        this.eventBus.off("kernel-plugin-state-change", this.handleKernelState);
        this.eventBus.off("open-noneditableblock", this.handleRenderTarget);
        for (const event of EDITOR_EVENTS) this.eventBus.off(event, this.handleDocument);
        await Promise.allSettled([this.kernel.rpc.unbind("presence-changed", this.handlePresence), this.kernel.rpc.unbind("cursor-changed", this.handleCursors), this.kernel.rpc.unbind("shortcut-shown", this.handleShortcut)]);
        await this.kernel.rpc.call.presenceLeave(this.sessionId, this.generation).catch(() => {});
    }
};
