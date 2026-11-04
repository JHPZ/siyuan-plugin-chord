const COLLAB_ID = /^\d{14}-[a-z0-9]{7}$/;
const PAGE_COMMANDS = ['fileTree', 'outline', 'bookmark', 'tag', 'inbox', 'backlinks', 'graphView', 'globalGraph', 'globalSearch', 'dataHistory', 'riffCard', 'mainMenu', 'recentDocs'];
const PAGE_CONTROLS = ['barCommand','barWorkspace','barPlugins','barMode','barRiffCard','statusHelp'];

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
    if(!value || !Array.isArray(value.path) || value.path.length>12 || !value.path.every(index=>Number.isSafeInteger(index)&&index>=0&&index<=10000) || typeof value.tag!=='string' || !/^[a-z][a-z0-9-]{0,39}$/.test(value.tag))return false;
    if(value.version!==2)return ['settings','dialog','layout','toolbar','body'].includes(value.kind);
    if(!['document','id','dock','tab','tab-control','status','settings-nav','settings','dialog','panel','layout','toolbar','body'].includes(value.kind))return false;
    for(const field of ['id','key','value','label','classes'])if(value[field]!==undefined && (typeof value[field]!=='string' || value[field].length>512))return false;
    if(value.attribute!==undefined && !['id','data-type','data-name','data-id','data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.page!==undefined && !validPage(value.page))return false;
    if(value.kind==='document')return validPage(value.page) && value.page.kind==='document';
    if(value.kind==='status' && !['data-statusbar-entry','data-topbar-entry'].includes(value.attribute))return false;
    if(value.kind==='tab')return validPage(value.page) && ['tab','label','icon','close'].includes(value.part);
    if(['id','dock','tab-control','status','settings-nav','panel'].includes(value.kind))return typeof value.id==='string' && value.id.length>0;
    return ['settings','layout','body'].includes(value.kind) ? validPage(value.page):true;
}

function cleanUIAnchor(value) {
    if(!validUIAnchor(value))throw Error('Invalid UI anchor');
    const result={kind:value.kind,path:[...value.path],tag:value.tag};
    for(const key of ['version','id','key','part','attribute','value','label','classes'])if(value[key]!==undefined)result[key]=value[key];
    if(value.page!==undefined)result.page=cleanPage(value.page);
    return result;
}
function validShortcut(value) {
    return typeof value==='string' && value.length<=80 && /^(?:(?:Ctrl|Meta|Alt|Shift)\+){1,4}(?:[A-Z0-9]|F\d{1,2}|Arrow(?:Up|Down|Left|Right)|Enter|Escape|Tab|Backspace|Delete|Home|End|PageUp|PageDown|[+\-=,./;`\[\]\\])$/.test(value);
}
