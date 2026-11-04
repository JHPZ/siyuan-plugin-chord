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
