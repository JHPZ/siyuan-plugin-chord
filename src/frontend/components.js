// Component identities are bounded hashes; input values and document text never enter the wire format.
const COMPONENT_HIGHLIGHT_TEXT='.protyle-hint .b3-list-item__text,.search__list .b3-list-item__text,.search__list .b3-list-item__meta,.search__list [data-av-search-match],.search__list .search__av-content > .fn__code,#searchAssetPreview > p,.b3-menu[data-name^="appearanceFontFamily-"] [data-type="available-fonts"] .b3-menu__label';
const COMPONENT_FONT_MENU='.b3-menu:is([data-name="appearanceFontFamily-globalFontFamilies"],[data-name="appearanceFontFamily-fontFamilies"],[data-name="appearanceFontFamily-codeFontFamilies"])';
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
const componentPickerStyles=new Map();
const componentFieldStyles=new Map();
let componentMeasurements;

function clearComponentStyles(doc) {
    for(const styles of [componentRangeStyles,componentPickerStyles,componentFieldStyles]){
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

function componentSwitch(element) {
    if(!element.matches('input.b3-switch[type="checkbox"]') || element.closest('[data-private]'))return null;
    const view=element.ownerDocument.defaultView,css=view.getComputedStyle(element),thumb=view.getComputedStyle(element,'::after'),box=frameBox(element);
    if(!box || css.appearance!=='none' || !['relative','absolute','fixed'].includes(css.position) || thumb.content!=='""' || thumb.position!=='absolute' || thumb.display==='none' || thumb.visibility!=='visible' || Number(thumb.opacity)===0 || thumb.rotate!=='none' || thumb.scale!=='none' || thumb.translate!=='none')return null;
    const size=axis=>parseFloat(thumb[axis])+(thumb.boxSizing==='border-box' ? 0:(axis==='width'?['Left','Right']:['Top','Bottom']).reduce((n,side)=>n+parseFloat(thumb['padding'+side])+parseFloat(thumb['border'+side+'Width']),0)),width=size('width'),height=size('height');
    const inset=side=>parseFloat(css['border'+side+'Width']),position=(value,total)=>/^[-\d.]+(px|%)$/.test(value) ? parseFloat(value)*(value.endsWith('%')?total/100:1):NaN;
    const left=inset('Left')+position(thumb.left,box.bounds.right-inset('Left')-inset('Right'))+parseFloat(thumb.marginLeft),top=inset('Top')+position(thumb.top,box.bounds.bottom-inset('Top')-inset('Bottom'))+parseFloat(thumb.marginTop);
    const matrix=new view.DOMMatrix(thumb.transform==='none'?undefined:thumb.transform),origin=thumb.transformOrigin.split(' ').map((v,i)=>position(v,i?height:width));
    // shortcut: native switch knobs only translate and scale; reject custom rotated knobs until their local plane is calibrated.
    if(![width,height,left,top,...origin.slice(0,2)].every(Number.isFinite) || width<=0 || height<=0 || !matrix.is2D || matrix.b!==0 || matrix.c!==0 || matrix.a<=0 || matrix.d<=0)return null;
    const first=matrix.transformPoint({x:-origin[0],y:-origin[1]}),last=matrix.transformPoint({x:width-origin[0],y:height-origin[1]}),rect={left:left+origin[0]+first.x,top:top+origin[1]+first.y,right:left+origin[0]+last.x,bottom:top+origin[1]+last.y};
    if(rect.left<0 || rect.top<0 || rect.right>box.bounds.right || rect.bottom>box.bounds.bottom)return null;
    return {box,content:box.content,track:box.content,thumb:rect};
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

function componentTextField(element) {
    if(element.closest('[data-private]') || element.matches('input[type="password"]'))return false;
    if(componentSourceField(element))return true;
    if(element.matches('select')){
        const css=element.ownerDocument.defaultView.getComputedStyle(element);
        if(element.multiple || element.size>1 || element.querySelector('button') || css.appearance!=='base-select' || css.display!=='flex' || element.ownerDocument.defaultView.getComputedStyle(element,'::picker-icon').display!=='none' || css.getPropertyValue('-webkit-text-security')!=='none')return false;
        const option=element.selectedOptions[0];return !option?.children.length && !option?.closest('[data-private]');
    }
    const pdfNumber=element.matches('.pdf__outer input#pageNumber.toolbarField.pageNumber[type="number"]') && pdfModel(element);
    const settingField=element.matches('.config__tab-container[data-name="editor"] textarea.b3-text-field[id^="editor."]') || element.matches('input.b3-text-field[type="number"]') && COMPONENT_NUMBER_SETTINGS.get(element.closest('.config__tab-container')?.dataset.name)?.includes(element.id);
    const textSetting=element.matches('input.b3-text-field,textarea.b3-text-field') && ['text','textarea'].includes(element.type) && COMPONENT_TEXT_SETTINGS.get(element.closest('.config__tab-container')?.dataset.name)?.includes(element.id);
    return ((element.matches('textarea.search__input,input[type="search"],input#searchAssetInput,input.switch-doc__search,input.search__label,.search__header input.b3-text-field,.config__panel .config__tab-head input.b3-text-field,.config__tab-container[data-name="bazaar"] input.config-bazaar__filter,.config__tab-container[data-name="keymap"] input:is(#keymapInput,#searchByKey)') || element.matches('.pdf__outer #findbar input#findInput') && !!pdfModel(element)) && ['text','search','textarea'].includes(element.type) || pdfNumber || settingField || textSetting || componentSelectField(element) || element.matches('input.b3-text-field[data-type="font-search"]') && element.type==='text' && !!element.closest(COMPONENT_FONT_MENU)) && element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue('-webkit-text-security')==='none';
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
    if(element.matches('input,textarea') && ['text','search','number','email','url','tel','password','textarea'].includes(element.type) && !componentTextField(element))return null;
    const contains=rect=>point.x>=rect.left&&point.x<rect.right&&point.y>=rect.top&&point.y<rect.bottom;
    if(scrollbar?.areas.some(contains)){
        const part=Object.entries(scrollbar.parts).find(([,rect])=>contains(rect));if(!part)return null;
        const [kind,rect]=part;return {edges:{x:[{kind,side:'start'},{kind,side:'end'}],y:[{kind,side:'start'},{kind,side:'end'}]},x:(point.x-rect.left)/(rect.right-rect.left),y:(point.y-rect.top)/(rect.bottom-rect.top)};
    }
    const picker=element.matches('select:open') ? componentPicker(element):null,inside=rect=>rect && point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom;
    const parentPoint=point,textPlane=componentPickerElementPlane(element);if(textPlane===null || textPlane && element.textContent && typeof Intl.Segmenter!=='function')return null;
    if(picker?.toLocal)point=picker.toLocal(point);
    const onPicker=inside(picker?.bounds),select=(element.matches('select') || componentSelectField(element)) && !onPicker;if(select && !componentTextField(element))return null;
    if(!onPicker)point=parentPoint;
    // Native scrollbar thumbs need their own geometry; a reserved gutter is never ordinary padding.
    if(onPicker && inside(picker.border) && !inside(picker.viewport))return null;
    const slider=element.matches('input[type="range"]'),toggle=element.matches('input.b3-switch[type="checkbox"]'),range=slider ? componentRange(element):toggle ? componentSwitch(element):null;
    if((slider || toggle) && !range)return null;
    const box=range?.box || (element.matches('iframe') ? frameBox(element):null) || (onPicker&&picker?.toLocal ? picker:textPlane);if(element.matches('iframe') && !box)return null;
    if(box)point=box.toLocal(parentPoint);
    const onThumb=range && point.x>=range.thumb.left && point.x<=range.thumb.right && point.y>=range.thumb.top && point.y<=range.thumb.bottom;
    let bounds=textPlane ? textPlane.rect(element):box ? box.bounds:element.getBoundingClientRect();if(!bounds)return null;
    const paint=!box && (point.x<bounds.left || point.x>bounds.right || point.y<bounds.top || point.y>bounds.bottom);
    if(paint)bounds=componentPaintRect(element);
    if(onPicker)bounds=picker.bounds;
    const field=onPicker ? null:componentFieldContent(element),empty=field && !componentFieldText(element),padding=field && (point.x<field.left || point.x>=field.right || point.y<field.top || point.y>=field.bottom);
    const children=onPicker ? picker.children:box&&!textPlane || select ? []:componentChildren(element),image=onPicker ? null:componentImageRect(element,textPlane),frame=range?.content || (!textPlane&&!onPicker&&box?.content),list=componentListRect(element),tree=element.matches('.backlinkList__item,.sy__backlink--bottom') && componentBacklinkContext(element) || element.matches('ul') && element.closest('.sy__tag,.sy__bookmark,.sy__outline');
    // Person-local badges must not change shared row gaps or their text offsets.
    let text=empty || onPicker || box&&!textPlane || padding && !element.matches('select,textarea') || element.matches('.collab-person,.collab-person__details,.collab-person__details > strong') ? []:fieldText || componentNearText(element,parentPoint,textPlane) || [];
    const glyph=text.find(({rect})=>point.x>=rect.left && point.x<rect.right && point.y>=rect.top && point.y<rect.bottom),imagePoint=image && !(select && glyph) && point.x>=image.left && point.x<=image.right && point.y>=image.top && point.y<=image.bottom ? {x:(point.x-image.left)/image.width,y:(point.y-image.top)/image.height}:null;
    if(glyph){const {rect,offset}=glyph;return {edges:{x:[{kind:'text',side:'start',offset},{kind:'text',side:'end',offset}],y:[{kind:'text',side:'start',offset},{kind:'text',side:'end',offset}]},x:(point.x-rect.left)/rect.width,y:(point.y-rect.top)/rect.height,textHash:componentTextHash(element)};}
    if(select && imagePoint)return {edges:{x:[{kind:'image',side:'start'},{kind:'image',side:'end'}],y:[{kind:'image',side:'start'},{kind:'image',side:'end'}]},x:imagePoint.x,y:imagePoint.y,imagePoint};
    if(padding && !glyph)text=[];
    if(select && !glyph && !image && element.ownerDocument.defaultView.getComputedStyle(element).backgroundImage!=='none')return null;
    if(!onPicker && componentTextField(element) && !text.length && !padding && !imagePoint && !empty)return null;
    const edges={},relative={};let usedText=!!(element.matches('.counter') && (componentTreeRegion(element) || element.closest('.search__list')));
    for(const [axis,start,end,otherStart,otherEnd] of [['x','left','right','top','bottom'],['y','top','bottom','left','right']]) {
        const other=point[axis==='x' ? 'y':'x'];
        const column=axis==='x' && element.matches('.sb[data-sb-layout="col"]');
        const entries=[{value:bounds[start],edge:{kind:onPicker ? 'picker-box':box&&!textPlane ? 'frame-box':paint ? 'paint':'self',side:'start'}},{value:bounds[end],edge:{kind:onPicker ? 'picker-box':box&&!textPlane ? 'frame-box':paint ? 'paint':'self',side:'end'}}];
        if(onPicker && (other<picker.border[otherStart] || other>=picker.border[otherEnd]) && point[axis]>=picker.border[start] && point[axis]<picker.border[end]){edges[axis]=entries.map(item=>item.edge);relative[axis]=(point[axis]-bounds[start])/(bounds[end]-bounds[start]);continue;}
        if(onPicker)for(const part of point[axis]<picker.border[start] || point[axis]>=picker.border[end] ? ['content','viewport','border']:['border','viewport','content'])for(const [side,key]of [['start',start],['end',end]])entries.unshift({value:picker[part][key],edge:{kind:'picker-'+part,side}});
        if(image && (!select || !glyph && other>=image[otherStart] && other<=image[otherEnd]))for(const [side,key] of [['start',start],['end',end]])if(image[key]>=bounds[start] && image[key]<=bounds[end])entries.push({value:image[key],edge:{kind:'image',side}});
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
    if(!visibleElement(element) || element.closest('[data-private]') || element.matches('canvas') || componentBazaarPackage(element)===null ||
        anchor.textHash && componentTextHash(element)!==anchor.textHash)return null;
    const scrollbarAnchor=Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('scrollbar-')),scrollbar=scrollbarAnchor&&componentScrollbar(element);
    if(scrollbarAnchor&&!scrollbar)return null;
    // A grid crossing can be bounded entirely by option edges.
    const pickerAnchor=Object.values(anchor.edges).flat().some(edge=>edge.kind.startsWith('picker-') || edge.kind==='child' && element.matches('select')),picker=pickerAnchor && componentPicker(element);
    if(pickerAnchor && !picker)return null;
    const textPlane=componentPickerElementPlane(element);if(textPlane===null || textPlane && element.textContent && typeof Intl.Segmenter!=='function')return null;
    const select=(element.matches('select') || componentSelectField(element)) && !picker;
    if(select && !componentTextField(element))return null;
    if(!picker && componentTextField(element) && !Object.values(anchor.edges).flat().some(edge=>edge.kind==='text' || edge.kind==='field' || edge.kind==='field-viewport' || select && edge.kind==='image'))return null;
    const slider=element.matches('input[type="range"]'),toggle=element.matches('input.b3-switch[type="checkbox"]'),range=slider ? componentRange(element):toggle ? componentSwitch(element):null;
    if((slider || toggle) && (!range || !Object.values(anchor.edges).flat().some(edge=>[(toggle?'switch-':'range-')+'thumb',(toggle?'switch-':'range-')+'track','frame','frame-box'].includes(edge.kind))))return null;
    const box=range?.box || (element.matches('iframe') ? frameBox(element):null) || (picker?.toLocal ? picker:textPlane);if(element.matches('iframe') && !box)return null;
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
            const rect=edge.kind.startsWith('scrollbar-') ? scrollbar?.parts[edge.kind]:edge.kind.startsWith('picker-') ? picker?.[edge.kind==='picker-box' ? 'bounds':edge.kind.slice(7)]:edge.kind==='text' ? fieldRects ? fieldRects.get(edge.offset):componentCharacter(element,edge.offset,textPlane):edge.kind==='paint' ? componentPaintRect(element):edge.kind==='image' ? componentImageRect(element,textPlane):edge.kind==='list' ? componentListRect(element):['list-first','list-last'].includes(edge.kind) ? componentListRect(element,edge.kind.slice(5)):edge.kind==='field' ? field:edge.kind==='field-viewport' ? field?.viewport:edge.kind==='frame' ? range?.content || box?.content:edge.kind==='frame-box' ? box?.bounds:edge.kind.startsWith('switch-') ? toggle && range?.[edge.kind.slice(7)]:edge.kind.startsWith('range-') ? slider && range?.[edge.kind.slice(6)]:box?.rect&&target ? box.rect(target):box && target===element ? box.bounds:target?.getBoundingClientRect();
            return rect?.[edge.side==='start' ? start:end];
        });
        const collapsedField=field && anchor.edges[axis].every(edge=>edge.kind==='field') && field[start]===field[end];
        if(values.some(value=>!Number.isFinite(value)) || values[1]<values[0] ||
            values[0]===values[1] && JSON.stringify(anchor.edges[axis][0])!==JSON.stringify(anchor.edges[axis][1]) && !collapsedField)return null;
        point[axis]=values[0]+(values[1]-values[0])*cursor[axis];
    }
    if(box)Object.assign(point,box.toParent(point));
    if(!scrollbarAnchor&&componentScrollbar(element,point,false)?.areas.some(r=>point.x>=r.left&&point.x<r.right&&point.y>=r.top&&point.y<r.bottom))return null;
    const precise=element.matches('input,textarea') || scrollbarAnchor || picker || textPlane || select || range || fieldRects || Object.values(anchor.edges).flat().some(edge=>edge.kind==='field' || edge.kind==='field-viewport');
    const gaps=['x','y'].filter(axis=>{const [a,b]=anchor.edges[axis];return a.kind==='child' && b.kind==='child' && componentChild(element,a.step)!==componentChild(element,b.step);});
    if(precise || gaps.length){
        // Textarea text can scroll into padding, but remains clipped at the native viewport.
        const clip=element.matches('textarea') ? field?.viewport:field;
        if(fieldRects && clip && !element.matches('select') && (point.x<clip.left || point.x>=clip.right || point.y<clip.top || point.y>=clip.bottom))return null;
        const glyph=fieldRects && Object.values(anchor.edges).flat().every(edge=>edge.kind==='text' && edge.offset===offsets[0]) && {offset:offsets[0],rect:fieldRects.get(offsets[0])};
        const local=componentGeometry(element,point,scrollbarAnchor?scrollbar:undefined,glyph?.rect ? [glyph]:undefined);
        if(!local)return null;
        const same=['x','y'].every(axis=>!precise && !gaps.includes(axis) || anchor.edges[axis].every((edge,index)=>{
            const match=local.edges[axis][index],collapsed=field && (axis==='x' ? field.left===field.right:field.top===field.bottom);
            return edge.kind===match.kind && edge.offset===match.offset && (edge.side===match.side || edge.kind==='field' && collapsed) &&
                (edge.kind!=='child' || edge.step.key===match.step.key && edge.step.count===match.step.count && edge.step.index===match.step.index);
        }));
        if(select){
            const glyph=edges=>['x','y'].every(axis=>edges[axis].every(edge=>edge.kind==='text' && edge.offset===edges.x[0].offset));
            if(anchor.imagePoint ? !local.imagePoint:glyph(anchor.edges) ? !same:glyph(local.edges) || local.imagePoint)return null;
        }else if(!same)return null;
    }
    const hit=componentHit(element.ownerDocument,point);
    const target=anchor.target ? componentFollow(element,anchor.target):element;
    const highlight=target===element && element.matches(COMPONENT_HIGHLIGHT_TEXT) && hit?.matches('mark') && hit.parentElement===element;
    const treeToggle=hit===element && element.matches('.b3-list-item__toggle') && target?.closest('svg')?.matches('.b3-list-item__arrow') && componentTreeRegion(element);
    // A blank cell must remain blank; a newly inserted child must not inherit its pointer.
    if(!visibleElement(target) || componentSearchField(target)===null || componentAssetPath(target)===null || componentSuperblockDivider(target)===null || componentBazaarPackage(target)===null || !visibleElement(hit) || hit!==target && !highlight && !treeToggle && !(hit?.namespaceURI==='http://www.w3.org/2000/svg' && target.contains(hit)))return null;
    if(element.matches('iframe') && frameToContent(element,point))return null;
    for(const frame of frames.reverse()){
        const parentPoint=frameToParent(frame,point);if(!parentPoint)return null;Object.assign(point,parentPoint);
        if(frame.ownerDocument.elementFromPoint(point.x,point.y)!==frame)return null;
    }
    return point;
}
