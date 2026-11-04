// Component identities are bounded hashes; input values and document text never enter the wire format.
const COMPONENT_HIGHLIGHT_TEXT='.protyle-hint .b3-list-item__text,.search__list .b3-list-item__text,.search__list .b3-list-item__meta,.search__list [data-av-search-match],.search__list .search__av-content > .fn__code,#searchAssetPreview > p';
const componentRenderTargets=new WeakMap();
const componentRangeStyles=new Map();

function clearRangeStyles() {
    for(const style of componentRangeStyles.values())style.remove();
    componentRangeStyles.clear();
}

function componentRangeStyle(doc) {
    if(!doc.head || !doc.styleSheets)return null;
    const extract=rule=>{
        if(rule.styleSheet){const rules=[...rule.styleSheet.cssRules].map(extract).filter(Boolean);let text=rules.join('\n');if(!text)return '';if(rule.media.mediaText)text='@media '+rule.media.mediaText+'{'+text+'}';if(rule.supportsText)text='@supports ('+rule.supportsText+'){'+text+'}';if(rule.layerName!==null && rule.layerName!==undefined)text='@layer '+rule.layerName+'{'+text+'}';return text;}
        if(rule.selectorText){
            if(!rule.selectorText.includes('::-webkit-slider-'))return '';
            let text=rule.cssText.replaceAll('::-webkit-slider-thumb',':where(input.b3-slider[type="range"])::before').replaceAll('::-webkit-slider-runnable-track',':where(input.b3-slider[type="range"])::after');
            const width=rule.style.getPropertyValue('width');
            if(width && rule.selectorText.includes('::-webkit-slider-runnable-track'))text=text.slice(0,-1)+';--collab-range-auto:'+(width==='auto' ? 1:0)+(rule.style.getPropertyPriority('width') ? ' !important':'')+'}';
            return text;
        }
        if(rule.cssRules){const rules=[...rule.cssRules].map(extract).filter(Boolean);return rules.length ? rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+rules.join('\n')+'}':'';}
        return '';
    };
    let rules;
    try{rules=[...doc.styleSheets].filter(sheet=>!sheet.disabled && sheet.ownerNode?.className!=='collab-range-measure').flatMap(sheet=>{const rules=[...sheet.cssRules].map(extract).filter(Boolean);return sheet.media.mediaText && rules.length ? ['@media '+sheet.media.mediaText+'{'+rules.join('\n')+'}']:rules;});}catch{return null;}
    if(!rules.length)return null;
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

function componentTextField(element) {
    if(element.closest('[data-private]') || element.matches('input[type="password"]'))return false;
    if(componentSourceField(element))return true;
    const pdfNumber=element.matches('.pdf__outer input#pageNumber.toolbarField.pageNumber[type="number"]') && pdfModel(element);
    return ((element.matches('textarea.search__input,input[type="search"],input#searchAssetInput,input.switch-doc__search,input.search__label,.search__header input.b3-text-field') || element.matches('.pdf__outer #findbar input#findInput') && !!pdfModel(element)) && ['text','search','textarea'].includes(element.type) || pdfNumber) && element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue('-webkit-text-security')==='none';
}

function componentFieldText(field) {
    return field.value || field.getAttribute('placeholder') || '';
}

function componentFieldContent(field) {
    if(!field.matches('input') || !componentTextField(field))return null;
    const css=field.ownerDocument.defaultView.getComputedStyle(field),rect=field.getBoundingClientRect(),inset=side=>parseFloat(css['border'+side+'Width'])+parseFloat(css['padding'+side]);
    if(field.type==='number' && css.appearance!=='none')return null;
    const left=inset('Left'),right=inset('Right'),top=inset('Top'),bottom=inset('Bottom'),sx=rect.width/(parseFloat(css.width)+(css.boxSizing==='border-box' ? 0:left+right)),sy=rect.height/(parseFloat(css.height)+(css.boxSizing==='border-box' ? 0:top+bottom));
    if(![left,right,top,bottom,sx,sy].every(Number.isFinite) || sx<=0 || sy<=0)return null;
    return {left:rect.left+left*sx,right:rect.right-right*sx,top:rect.top+top*sy,bottom:rect.bottom-bottom*sy};
}

function componentFieldMeasure(field,run) {
    if(typeof Intl.Segmenter!=='function')return null;
    const doc=field.ownerDocument,css=doc.defaultView.getComputedStyle(field);
    if(field.type==='number' && (field.validity.badInput || css.appearance!=='none'))return null;
    const bounds=field.getBoundingClientRect(),mirror=doc.createElement('div'),value=componentFieldText(field);
    mirror.className='collab-text-measure';mirror.setAttribute('aria-hidden','true');mirror.textContent=value+'\u200b';
    for(const name of ['box-sizing','width','height','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-style','overflow-x','overflow-y','scrollbar-gutter','font-family','font-size','font-style','font-weight','font-stretch','font-variant','font-feature-settings','font-variation-settings','font-kerning','line-height','letter-spacing','word-spacing','tab-size','white-space','word-break','overflow-wrap','text-indent','text-align','text-transform','direction','writing-mode','text-orientation'])mirror.style.setProperty(name,css.getPropertyValue(name));
    if(!field.value && field.getAttribute('placeholder')){
        const placeholder=doc.defaultView.getComputedStyle(field,'::placeholder');
        for(const name of ['font-family','font-size','font-style','font-weight','font-stretch','font-variant','font-feature-settings','font-variation-settings','font-kerning','letter-spacing','word-spacing','text-transform'])mirror.style.setProperty(name,placeholder.getPropertyValue(name));
    }
    if(field.matches('input')){
        const inset=['padding-top','padding-bottom','border-top-width','border-bottom-width'].reduce((sum,name)=>sum+parseFloat(css.getPropertyValue(name)),0);
        mirror.style.lineHeight=(parseFloat(css.height)-(css.boxSizing==='border-box' ? inset:0))+'px';
        mirror.style.whiteSpace='pre';mirror.style.overflowWrap='normal';mirror.style.wordBreak='normal';mirror.style.overflow='hidden';
    }
    mirror.style.cssText+=';position:fixed;left:'+bounds.left+'px;top:'+bounds.top+'px;margin:0;opacity:0;pointer-events:auto;z-index:2147483647;transform-origin:0 0;';
    doc.body.append(mirror);
    try{
        const rect=mirror.getBoundingClientRect();if(!rect.width || !rect.height)return null;
        mirror.style.transform='scale('+bounds.width/rect.width+','+bounds.height/rect.height+')';mirror.scrollTop=field.scrollTop;mirror.scrollLeft=field.scrollLeft;
        const segments=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value);
        const position=offset=>offset>=0 && offset<value.length ? segments.containing(offset).index:offset===value.length ? offset:-1;
        const character=offset=>{
            if(!Number.isInteger(offset) || offset<0 || offset>value.length)return null;
            const segment=segments.containing(offset),start=segment?.index ?? offset,end=segment ? start+segment.segment.length:offset+1;
            const range=doc.createRange();range.setStart(mirror.firstChild,start);range.setEnd(mirror.firstChild,end);const r=range.getBoundingClientRect();return r.height ? r:null;
        };
        return run(mirror,character,position);
    }finally{mirror.remove();}
}
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

function componentKey(element) {
    const thumbnailImage=element.matches('.thumbnail img') && pdfModel(element);
    const attributes=['data-node-id','data-command-id','data-url','data-name','data-type','data-subtype','data-page-number','data-annotation-id','data-statusbar-entry','data-topbar-entry','role','type','name','href','src','d','points','viewBox'];
    const values=attributes.filter(name=>name!=='src' || !thumbnailImage).map(name=>[name,element.getAttribute(name)]).filter(([,value])=>value).map(([name,value])=>[name,componentHash(value)]);
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
    const privateText=element.closest('input,textarea,[contenteditable],[data-private]');
    const label=!privateText && !values.length && !(element.matches('.counter') && (tree || element.closest('.search__list'))) ? (element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length || element.matches('.b3-list-item,.b3-menu__item') || element.matches(COMPONENT_HIGHLIGHT_TEXT) ? textLabel(element):'')):'';
    const classes=[...new Set([...element.classList].filter(name=>!/^collab-|^ariaLabel$|^fn__none$|^protyle-wysiwyg--select$|^b3-menu__item--(?:current|show|group-first|group-last)$|^b3-list-item__arrow--open$/.test(name) && !(pdfNumber && name==='loading' && element.ownerDocument.defaultView.getComputedStyle(element).backgroundImage==='none') && !(name==='selected' && element.matches('.thumbnail')) && !(name==='wrapContainers' && element.matches('.pdf__outer #findbar')) && !(element.matches('.pdf__outer') && ['pdf__outer--maximized','sidebarOpen'].includes(name))).map(name=>name.replace(/--(?:focus|active|selected|hover)$/,'')))].sort().join(' ');
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
    if(componentTextField(element))return componentHash(componentFieldText(element));
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
    const dialog=element.closest('.b3-dialog');
    if(dialog)return make(dialog,'dialog',(dialog.getAttribute('data-key') || dialog.parentElement?.getAttribute('data-key') || '')+'|'+textLabel(dialog.querySelector('.b3-dialog__header')));
    const floating=element.closest(COMPONENT_FLOATING);
    if(floating && !floating.closest('.protyle,.dockPanel')){
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
    if(componentTextField(element))return componentFieldMeasure(element,(mirror,character,position)=>{
        const doc=element.ownerDocument,caret=doc.caretPositionFromPoint?.(point.x,point.y),range=caret ? null:doc.caretRangeFromPoint?.(point.x,point.y),node=caret?.offsetNode || range?.startContainer,offset=caret?.offset ?? range?.startOffset;
        if(node!==mirror.firstChild)return null;
        const candidates=[...new Set([position(offset-1),position(offset)])].map(offset=>({offset,rect:character(offset)})).filter(item=>item.rect);
        const inside=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);if(inside)return [inside];
        const distance=rect=>Math.max(rect.top-point.y,point.y-rect.bottom,0),nearest=Math.min(...candidates.map(item=>distance(item.rect)));
        return candidates.filter(item=>distance(item.rect)===nearest);
    });
    if(element.matches('input,textarea,[data-type="NodeSuperBlock"]') || element.closest('[data-private]'))return null;
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
    if(inside)return [inside];
    // Bidi run boundaries can return a caret at the opposite visual end.
    const start=prefix.toString().length-offset;
    for(let index=0;index<node.length;index++){
        const position=start+index;
        const rect=componentCharacter(element,position);if(rect)candidates.push({offset:position,rect});
    }
    const hit=candidates.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom);
    if(hit)return [hit];
    const distance=rect=>Math.max(rect.top-point.y,point.y-rect.bottom,0),nearest=Math.min(...candidates.map(item=>distance(item.rect)));
    return candidates.filter(item=>distance(item.rect)===nearest);
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
    const slider=element.matches('input[type="range"]'),range=slider ? componentRange(element):null;
    if(slider && !range)return null;
    const box=range?.box || (element.matches('iframe') ? frameBox(element):null);if(element.matches('iframe') && !box)return null;
    if(box)point=box.toLocal(point);
    const onThumb=range && point.x>=range.thumb.left && point.x<=range.thumb.right && point.y>=range.thumb.top && point.y<=range.thumb.bottom;
    let bounds=box ? box.bounds:element.getBoundingClientRect();
    const paint=!box && (point.x<bounds.left || point.x>bounds.right || point.y<bounds.top || point.y>bounds.bottom);
    if(paint)bounds=componentPaintRect(element);
    const field=componentFieldContent(element),padding=field && (point.x<field.left || point.x>=field.right || point.y<field.top || point.y>=field.bottom);
    const children=box ? []:componentChildren(element),text=box || padding ? []:componentNearText(element,point) || [],image=componentImageRect(element),frame=range?.content || box?.content,list=componentListRect(element),tree=element.matches('.backlinkList__item,.sy__backlink--bottom') && componentBacklinkContext(element) || element.matches('ul') && element.closest('.sy__tag,.sy__bookmark,.sy__outline');
    if(componentTextField(element) && !text.length && !padding)return null;
    const edges={},relative={};let usedText=!!(element.matches('.counter') && (componentTreeRegion(element) || element.closest('.search__list')));
    for(const [axis,start,end,otherStart,otherEnd] of [['x','left','right','top','bottom'],['y','top','bottom','left','right']]) {
        const other=point[axis==='x' ? 'y':'x'];
        const column=axis==='x' && element.matches('.sb[data-sb-layout="col"]');
        const entries=[{value:bounds[start],edge:{kind:box ? 'frame-box':paint ? 'paint':'self',side:'start'}},{value:bounds[end],edge:{kind:box ? 'frame-box':paint ? 'paint':'self',side:'end'}}];
        if(image)for(const [side,key] of [['start',start],['end',end]])if(image[key]>=bounds[start] && image[key]<=bounds[end])entries.push({value:image[key],edge:{kind:'image',side}});
        if(frame && !onThumb && !(range && axis==='x' && point.x>=range.thumb.left && point.x<=range.thumb.right))for(const [side,key] of [['start',start],['end',end]])entries.push({value:frame[key],edge:{kind:'frame',side}});
        if(range)for(const part of onThumb || axis==='x' && point.x>=range.thumb.left && point.x<=range.thumb.right ? ['thumb']:['thumb','track']){
            const rect=range[part];if(axis==='y' && (point.x<rect.left || point.x>rect.right))continue;
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.push({value:rect[key],edge:{kind:'range-'+part,side}});
        }
        // A collapsed content box still has visible padding on each outward side.
        if(field && !text.some(item=>point[axis]>=item.rect[start] && point[axis]<item.rect[end]))for(const [side,key] of point[axis]>=field[end] ? [['end',end],['start',start]]:[['start',start],['end',end]])entries.push({value:field[key],edge:{kind:'field',side}});
        const perimeter=list && (point[axis]<list[start] || point[axis]>list[end] || tree && (point.x<list.left || point.x>list.right));
        if(perimeter)for(const [side,key] of [['start',start],['end',end]])if(list[key]>=bounds[start] && list[key]<=bounds[end])entries.push({value:list[key],edge:{kind:'list',side}});
        // At coincident bounds, prefer the nearest end row over the resizable list box.
        if(perimeter && axis==='y' && tree)for(const part of point.y-bounds.top<=bounds.bottom-point.y ? ['last','first']:['first','last']){
            const rect=componentListRect(element,part);
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end])entries.unshift({value:rect[key],edge:{kind:'list-'+part,side}});
        }
        for(const child of perimeter ? []:children){
            const rect=child.getBoundingClientRect();if(!rect.width || !rect.height || (other<rect[otherStart] || other>rect[otherEnd]) && !column)continue;
            const step=componentStep(child);
            for(const [side,key] of [['start',start],['end',end]])if(rect[key]>=bounds[start] && rect[key]<=bounds[end]){
                const entry={value:rect[key],edge:{kind:'child',side,step}};
                if(column && child.hasAttribute('data-node-id'))entries.unshift(entry);else entries.push(entry);
            }
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
    if(hit.closest('[data-private]') || componentSearchField(hit)===null || componentAssetPath(hit)===null || componentSuperblockDivider(hit)===null)return null;
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
        if(!visibleElement(inner) || inner.closest('[data-private]') || componentSearchField(inner)===null || componentSuperblockDivider(inner)===null || inner.matches('canvas'))return null;
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
    if(componentTextField(element) && !Object.values(anchor.edges).flat().some(edge=>edge.kind==='text' || edge.kind==='field'))return null;
    const slider=element.matches('input[type="range"]'),range=slider ? componentRange(element):null;
    if(slider && (!range || !Object.values(anchor.edges).flat().some(edge=>['range-thumb','range-track','frame','frame-box'].includes(edge.kind))))return null;
    const box=range?.box || (element.matches('iframe') ? frameBox(element):null);if(element.matches('iframe') && !box)return null;
    const offsets=[...new Set(Object.values(anchor.edges).flat().filter(edge=>edge.kind==='text').map(edge=>edge.offset))];
    const field=componentFieldContent(element),fieldRects=offsets.length && componentTextField(element) ? componentFieldMeasure(element,(_,character)=>new Map(offsets.map(offset=>[offset,character(offset)]))):null;
    const point={};
    for(const [axis,start,end] of [['x','left','right'],['y','top','bottom']]) {
        if(anchor.imagePoint){
            const rect=componentImageRect(element);if(!rect)return null;
            point[axis]=rect[start]+(rect[end]-rect[start])*anchor.imagePoint[axis];continue;
        }
        const values=anchor.edges[axis].map(edge=>{
            const target=edge.kind==='self' ? element:edge.kind==='child' ? componentChild(element,edge.step):null;
            const rect=edge.kind==='text' ? fieldRects ? fieldRects.get(edge.offset):componentCharacter(element,edge.offset):edge.kind==='paint' ? componentPaintRect(element):edge.kind==='image' ? componentImageRect(element):edge.kind==='list' ? componentListRect(element):['list-first','list-last'].includes(edge.kind) ? componentListRect(element,edge.kind.slice(5)):edge.kind==='field' ? field:edge.kind==='frame' ? range?.content || box?.content:edge.kind==='frame-box' ? box?.bounds:edge.kind.startsWith('range-') ? range?.[edge.kind.slice(6)]:box && target===element ? box.bounds:target?.getBoundingClientRect();
            return rect?.[edge.side==='start' ? start:end];
        });
        const collapsedField=field && anchor.edges[axis].every(edge=>edge.kind==='field') && field[start]===field[end];
        if(values.some(value=>!Number.isFinite(value)) || values[1]<values[0] ||
            values[0]===values[1] && JSON.stringify(anchor.edges[axis][0])!==JSON.stringify(anchor.edges[axis][1]) && !collapsedField)return null;
        point[axis]=values[0]+(values[1]-values[0])*cursor[axis];
    }
    if(box)Object.assign(point,box.toParent(point));
    if(range || fieldRects || Object.values(anchor.edges).flat().some(edge=>edge.kind==='field')){
        // Padding is visible whitespace; text underneath it is clipped by the native input.
        if(fieldRects && field && (point.x<field.left || point.x>=field.right || point.y<field.top || point.y>=field.bottom))return null;
        const local=componentGeometry(element,point);
        if(!local || !['x','y'].every(axis=>anchor.edges[axis].every((edge,index)=>{
            const match=local.edges[axis][index],collapsed=field && (axis==='x' ? field.left===field.right:field.top===field.bottom);
            return edge.kind===match.kind && edge.offset===match.offset && (edge.side===match.side || edge.kind==='field' && collapsed);
        })))return null;
    }
    const hit=componentHit(element.ownerDocument,point);
    const target=anchor.target ? componentFollow(element,anchor.target):element;
    const highlight=target===element && element.matches(COMPONENT_HIGHLIGHT_TEXT) && hit?.matches('mark') && hit.parentElement===element;
    const treeToggle=hit===element && element.matches('.b3-list-item__toggle') && target?.closest('svg')?.matches('.b3-list-item__arrow') && componentTreeRegion(element);
    // A blank cell must remain blank; a newly inserted child must not inherit its pointer.
    if(!visibleElement(target) || componentSearchField(target)===null || componentAssetPath(target)===null || componentSuperblockDivider(target)===null || !visibleElement(hit) || hit!==target && !highlight && !treeToggle && !(hit?.namespaceURI==='http://www.w3.org/2000/svg' && target.contains(hit)))return null;
    if(element.matches('iframe') && frameToContent(element,point))return null;
    for(const frame of frames.reverse()){
        const parentPoint=frameToParent(frame,point);if(!parentPoint)return null;Object.assign(point,parentPoint);
        if(frame.ownerDocument.elementFromPoint(point.x,point.y)!==frame)return null;
    }
    return point;
}
