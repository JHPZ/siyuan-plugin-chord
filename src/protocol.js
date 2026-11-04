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
    return edge && ['start','end'].includes(edge.side) && (edge.kind==='self' || edge.kind==='paint' || edge.kind==='image' || edge.kind==='list' || edge.kind==='list-first' || edge.kind==='list-last' || edge.kind==='frame' || edge.kind==='frame-box' || edge.kind==='field' || edge.kind==='range-thumb' || edge.kind==='range-track' || ['picker-box','picker-border','picker-viewport','picker-content'].includes(edge.kind) ||
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
