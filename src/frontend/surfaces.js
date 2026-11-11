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
    const backlink=componentBacklinkContext(element),editor=cursorEditor(element);
    if(backlink && editor && backlink.panel.contains(editor))return backlink.identity ? {kind:'dock',id:'backlink-'+componentHash(JSON.stringify(backlink.identity))}:null;
    const dock=dockPage(element);
    if(dock)return {kind:'dock',id:dock.id};
    if(element.closest('.dockPanel'))return null;
    const id=editorDocumentId(editor);
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
    const active=hit.ownerDocument.activeElement,cursor=hit.ownerDocument.defaultView.getComputedStyle(hit).cursor;
    const field=hit.closest('input:not([type]),input[type="text"],input[type="search"],textarea,[contenteditable="true"]');
    const editable=['text','vertical-text'].includes(cursor) || (!cursor || cursor==='auto') && field && !field.matches(':disabled') && !hit.closest('[contenteditable="false"]');
    const state=editable ? (plugin?.typingTarget===active && active?.contains(hit) ? 'typing':'editing'):undefined;
    const activity={...(state ? {state}:{}),...(plugin?.dragging ? {dragging:true}:{})};
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
