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
