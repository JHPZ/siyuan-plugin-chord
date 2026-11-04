// Component identities are bounded hashes; input values and document text never enter the wire format.
function componentHash(value) {
    let a=2166136261,b=5381;
    for(let index=0;index<value.length;index++){const code=value.charCodeAt(index);a=Math.imul(a^code,16777619);b=Math.imul(b,33)^code;}
    return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}

function componentChildren(element) {
    return [...element.children].filter(child=>{
        if(child.matches('style,script,.collab-cursor-layer,.collab-editing-layer,.collab-presence-users,.fn__none,[hidden]'))return false;
        const style=child.ownerDocument.defaultView.getComputedStyle(child);
        return style.display!=='none' && style.visibility!=='hidden' && style.opacity!=='0';
    });
}

function componentKey(element) {
    const attributes=['data-node-id','data-url','data-name','data-type','data-subtype','data-statusbar-entry','data-topbar-entry','role','type','name','href','src','d','points','viewBox'];
    const values=attributes.map(name=>[name,element.getAttribute(name)]).filter(([,value])=>value).map(([name,value])=>[name,componentHash(value)]);
    if(element.matches('img'))values.push(['intrinsic',element.naturalWidth+','+element.naturalHeight]);
    if(element.id && !/^\d{14}-/.test(element.id))values.push(['id',element.id]);
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
    const label=!privateText && !values.length ? (element.getAttribute('aria-label') || element.getAttribute('title') ||
        (!element.children.length || element.matches('.b3-list-item,.b3-menu__item') ? textLabel(element):'')):'';
    const classes=[...new Set([...element.classList].filter(name=>!/^collab-|^ariaLabel$|^fn__none$/.test(name)).map(name=>name.replace(/--(?:focus|active|selected|hover)$/,'')))].sort().join(' ');
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

function componentScope(element,plugin) {
    const make=(root,kind,key)=>({root,scope:{kind,key:componentHash(key),...(kind==='document' ? {pane:componentHash(componentPane(root))}:{})}});
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
        if(tab?.headElement){const page=tabPage(tab.headElement);return make(panel,'tab',pageKey(page)+'|'+(page.kind==='custom' ? page.title:'')+'|'+graphContext(tab.model));}
    }
    return make(document.body,'global','workspace-ui');
}

function componentRoots(scope,plugin) {
    const selector={document:'.protyle',dock:'.dockPanel',dialog:'.b3-dialog',floating:COMPONENT_FLOATING,tab:'.layout-tab-container > [data-id]',global:'body'}[scope.kind];
    let roots=[...document.querySelectorAll(selector)].filter(visibleElement).filter(root=>{
        const local=componentScope(root,plugin);
        return local?.root===root && local.scope.kind===scope.kind && local.scope.key===scope.key;
    });
    if(roots.length>1 && scope.pane)roots=roots.filter(root=>componentHash(componentPane(root))===scope.pane);
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
    const doc=element.ownerDocument,caret=doc.caretPositionFromPoint?.(point.x,point.y),range=caret ? null:doc.caretRangeFromPoint?.(point.x,point.y);
    const node=caret?.offsetNode || range?.startContainer,offset=caret?.offset ?? range?.startOffset;
    if(node?.nodeType!==3 || !element.contains(node))return null;
    const prefix=doc.createRange();prefix.selectNodeContents(element);prefix.setEnd(node,offset);
    return [prefix.toString().length-1,prefix.toString().length].filter(index=>index>=0).map(index=>({offset:index,rect:componentCharacter(element,index)})).filter(item=>item.rect);
}

function componentImageRect(image) {
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

function componentGeometry(element,point) {
    const bounds=element.getBoundingClientRect(),children=componentChildren(element),text=componentNearText(element,point) || [],image=componentImageRect(element);
    const edges={},relative={};let usedText=false;
    for(const [axis,start,end,otherStart,otherEnd] of [['x','left','right','top','bottom'],['y','top','bottom','left','right']]) {
        const other=point[axis==='x' ? 'y':'x'];
        const entries=[{value:bounds[start],edge:{kind:'self',side:'start'}},{value:bounds[end],edge:{kind:'self',side:'end'}}];
        if(image)for(const [side,key] of [['start',start],['end',end]])if(image[key]>=bounds[start] && image[key]<=bounds[end])entries.push({value:image[key],edge:{kind:'image',side}});
        for(const child of children){
            if(!visibleElement(child))continue;
            const rect=child.getBoundingClientRect();if(other<rect[otherStart] || other>rect[otherEnd])continue;
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
    return {edges,...relative,...(usedText ? {textHash:componentHash(element.textContent)}:{}),...(imagePoint ? {imagePoint}:{})};
}

function captureComponent(hit,plugin,point) {
    if(hit.closest('[data-private]'))return null;
    const graph=hit.matches('canvas') ? captureGraph(hit,point):undefined;
    if(hit.matches('canvas') && !graph)return null;
    const original=hit;
    if(hit instanceof SVGElement)hit=hit.closest(CURSOR_CONTROL) || hit.closest('svg') || hit;
    while(hit.parentElement){
        const rect=hit.getBoundingClientRect();
        if(point.x>=rect.left && point.x<=rect.right && point.y>=rect.top && point.y<=rect.bottom)break;
        hit=hit.parentElement;
    }
    const scope=componentScope(hit,plugin);if(!scope)return null;
    const route=componentRoute(scope.root,hit);if(!route)return null;
    let frame;
    if(hit.matches('iframe')){
        let doc;try{doc=hit.contentDocument;}catch{}
        if(!doc?.body)return null;
        const rect=hit.getBoundingClientRect();point={x:(point.x-rect.left)*hit.offsetWidth/rect.width-hit.clientLeft,y:(point.y-rect.top)*hit.offsetHeight/rect.height-hit.clientTop};
        const inner=doc.elementFromPoint(point.x,point.y);if(!inner || inner.closest('[data-private]') || inner.matches('canvas,iframe'))return null;
        frame=componentRoute(doc.body,inner);if(!frame)return null;hit=inner;
    }
    const target=hit!==original && !frame ? componentRoute(hit,original):undefined;
    if(target===null)return null;
    const geometry=componentGeometry(hit,point);if(!geometry)return null;
    const {x,y,...fields}=geometry;
    const ui={version:3,kind:'component',scope:scope.scope,route,...(frame ? {frame}:{}),...(target ? {target}:{}),...(graph ? {graph}:{}),...fields};
    return validUIAnchor(ui) ? {ui,x,y}:null;
}

function resolveComponent(cursor,plugin) {
    const anchor=cursor.ui;
    if(!validUIAnchor(anchor))return null;
    const root=componentRoots(anchor.scope,plugin);if(!root)return null;
    let element=componentFollow(root,anchor.route),frame;
    if(!element)return null;
    if(anchor.graph)return visibleElement(element) && element.matches('canvas') ? resolveGraph(element,anchor.graph):null;
    if(anchor.frame){
        frame=element;if(!frame.matches('iframe'))return null;
        let doc;try{doc=frame.contentDocument;}catch{}
        element=doc?.body && componentFollow(doc.body,anchor.frame);if(!element)return null;
    }
    if(!visibleElement(element) || element.closest('[data-private]') || element.matches('canvas,iframe') ||
        anchor.textHash && componentHash(element.textContent)!==anchor.textHash)return null;
    const point={};
    for(const [axis,start,end] of [['x','left','right'],['y','top','bottom']]) {
        if(anchor.imagePoint){
            const rect=componentImageRect(element);if(!rect)return null;
            point[axis]=rect[start]+(rect[end]-rect[start])*anchor.imagePoint[axis];continue;
        }
        const values=anchor.edges[axis].map(edge=>{
            const target=edge.kind==='self' ? element:edge.kind==='child' ? componentChild(element,edge.step):null;
            const rect=edge.kind==='text' ? componentCharacter(element,edge.offset):edge.kind==='image' ? componentImageRect(element):target?.getBoundingClientRect();
            return rect?.[edge.side==='start' ? start:end];
        });
        if(values.some(value=>!Number.isFinite(value)) || values[1]<values[0] ||
            values[0]===values[1] && JSON.stringify(anchor.edges[axis][0])!==JSON.stringify(anchor.edges[axis][1]))return null;
        point[axis]=values[0]+(values[1]-values[0])*cursor[axis];
    }
    const hit=element.ownerDocument.elementFromPoint(point.x,point.y);
    const target=anchor.target ? componentFollow(element,anchor.target):element;
    // A blank cell must remain blank; a newly inserted child must not inherit its pointer.
    if(!target || hit!==target && !(hit instanceof SVGElement && target.contains(hit)))return null;
    if(frame){
        const rect=frame.getBoundingClientRect();point.x=rect.left+(point.x+frame.clientLeft)*rect.width/frame.offsetWidth;point.y=rect.top+(point.y+frame.clientTop)*rect.height/frame.offsetHeight;
        if(document.elementFromPoint(point.x,point.y)!==frame)return null;
    }
    return point;
}
