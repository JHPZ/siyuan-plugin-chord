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

function uiAnchor(element) {
    const root = element.closest('.config__tab-container, .b3-dialog__container, .layout__wnd--active, [data-type="wnd"], .toolbar') || document.body;
    const path = [];
    let node = element;
    while (node && node !== root && path.length < 12) {
        const parent = node.parentElement;
        if (!parent) break;
        path.unshift([...parent.children].indexOf(node));
        node = parent;
    }
    const kind = root.classList.contains('config__tab-container') ? 'settings' : root.classList.contains('b3-dialog__container') ? 'dialog' : root === document.body ? 'body' : root.classList.contains('toolbar') ? 'toolbar' : 'layout';
    return { kind, path, tag: element.tagName.toLowerCase() };
}

function resolveUIAnchor(anchor) {
    const selectors = { settings:'.config__tab-container:not(.fn__none)', dialog:'.b3-dialog__container', layout:'.layout__wnd--active, [data-type="wnd"]', toolbar:'.toolbar', body:'body' };
    const roots=[...document.querySelectorAll(selectors[anchor.kind])];
    if(anchor.kind==='dialog')roots.reverse();
    for (const root of roots) {
        if (!visibleElement(root)) continue;
        let element = root;
        for (const index of anchor.path) element = element?.children[index];
        if (element?.tagName.toLowerCase() === anchor.tag && visibleElement(element)) return element;
    }
    return null;
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
            if(dialog.isConnected)throw Error('Close the current dialog before following');
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
    const rect=hit.getBoundingClientRect();
    return {surface:'ui',documentId:null,blockId:null,page,screen,ui:uiAnchor(hit),
        x:rect.width ? Math.max(0,Math.min(1,(point.x-rect.left)/rect.width)) : 0,
        y:rect.height ? Math.max(0,Math.min(1,(point.y-rect.top)/rect.height)) : 0};
}

function resolveCursor(cursor, plugin) {
    if (cursor.surface!=='ui') {
        const point=resolveDocumentCursor(cursor);
        if (point) return point;
    } else if (!plugin || pageKey(currentPage(plugin))===pageKey(cursor.page)) {
        const element=resolveUIAnchor(cursor.ui), rect=element?.getBoundingClientRect();
        if (rect) return {x:rect.left+rect.width*cursor.x,y:rect.top+rect.height*cursor.y};
    }
    return cursor.screen ? {x:cursor.screen.x*window.innerWidth,y:cursor.screen.y*window.innerHeight} : null;
}
