const textLabel = (element) => (element?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
const visibleElement = (element) => element && !element.closest('.fn__none') && element.getBoundingClientRect().width > 0;

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

function uiFingerprint(element) {
    const result={tag:element.tagName.toLowerCase(),classes:uiClasses(element)};
    for(const attribute of ['data-statusbar-entry','data-topbar-entry','data-type','data-name','id','data-id']) {
        const value=element.getAttribute(attribute);
        if(value && value.length<=512){result.attribute=attribute;result.value=value;break;}
    }
    result.label=element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length && !element.matches('input,textarea,[contenteditable]') ? textLabel(element):'');
    result.label=result.label.slice(0,512);
    return result;
}

function uiAnchor(hit, plugin) {
    let element=hit.closest('button,input,select,textarea,[role="button"],.block__icon,.b3-list-item') || hit;
    const make=(kind,fields={})=>({element,ui:{version:2,kind,path:[],...uiFingerprint(element),...fields}});
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
    const identified=hit.closest('[id]');
    if(identified && !identified.matches('body,.protyle,[data-type="wnd"],.b3-dialog__container,#status,.dock') && !identified.contains(document.querySelector('.config__panel'))) {
        element=identified;
        const page=element.closest('.protyle') ? currentPage(plugin):undefined;
        return make('id',{id:identified.id,...(page ? {page}:{})});
    }
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

function resolveUIAnchor(anchor, plugin) {
    // Old child-index anchors cannot identify a control after either window changes layout.
    if(anchor.version!==2)return null;
    const visible=items=>[...items].filter(visibleElement);
    if(anchor.kind==='id') {
        const element=document.getElementById(anchor.id);
        if(anchor.page && plugin && pageKey(currentPage(plugin))!==pageKey(anchor.page))return null;
        return visibleElement(element) ? element:null;
    }
    if(anchor.kind==='dock')return visible(document.querySelectorAll('.dock__item[data-type]')).find(item=>item.getAttribute('data-type')===anchor.id) || null;
    if(anchor.kind==='status')return visible(document.querySelectorAll('['+anchor.attribute+']')).find(item=>item.getAttribute(anchor.attribute)===anchor.id) || null;
    if(anchor.kind==='settings-nav')return visible(document.querySelectorAll('.config__side [data-name]')).find(item=>item.getAttribute('data-name')===anchor.id) || null;
    if(anchor.kind==='tab-control')return visible(document.querySelectorAll('.layout__wnd--active .item--readonly [data-type]')).find(item=>item.getAttribute('data-type')===anchor.id) || null;
    if(anchor.kind==='tab') {
        const heads=visible(document.querySelectorAll('[data-type="tab-header"]')).filter(head=>{
            const page=tabPage(head);
            return pageKey(page)===pageKey(anchor.page) && (page.kind!=='workspace' || page.title===anchor.page.title);
        });
        if(!heads.length)return null;
        const head=heads.find(item=>item.closest('.layout__wnd--active')) || heads[0];
        return anchor.part==='tab' ? head:head.querySelector({label:'.item__text',icon:'.item__icon, .item__graphic',close:'.item__close'}[anchor.part]);
    }
    let roots=[];
    if(anchor.kind==='settings') {
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
    const hit=document.elementFromPoint(point.x,point.y);
    if (!hit) return null;
    const screen={x:Math.max(0,Math.min(1,point.x/window.innerWidth)),y:Math.max(0,Math.min(1,point.y/window.innerHeight))};
    const page=plugin ? currentPage(plugin) : {kind:'workspace',title:''};
    if (anchored) return {...anchored,screen,page};
    if(hit.closest('.protyle-content, .protyle-wysiwyg'))return null;
    const target=uiAnchor(hit,plugin), rect=target.element.getBoundingClientRect();
    if(!validUIAnchor(target.ui) || !rect.width || !rect.height)return null;
    return {surface:'ui',documentId:null,blockId:null,page,screen,ui:target.ui,
        x:rect.width ? Math.max(0,Math.min(1,(point.x-rect.left)/rect.width)) : 0,
        y:rect.height ? Math.max(0,Math.min(1,(point.y-rect.top)/rect.height)) : 0};
}

function resolveCursor(cursor, plugin) {
    if(cursor.surface!=='ui')return resolveDocumentCursor(cursor);
    const element=resolveUIAnchor(cursor.ui,plugin),rect=element?.getBoundingClientRect();
    if(!rect?.width || !rect.height)return null;
    const point={x:rect.left+rect.width*cursor.x,y:rect.top+rect.height*cursor.y};
    const hit=document.elementFromPoint(point.x,point.y);
    return hit && element.contains(hit) ? point:null;
}
