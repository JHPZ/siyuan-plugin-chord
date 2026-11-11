const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const helpers=vm.runInNewContext(fs.readFileSync(path.join(root,'src/wire.js'),'utf8')+'\n({wirePack,wireUnpack,wireDiff,wireApply,wirePacket,wireReceive})');
const {wirePack,wireUnpack,wireDiff,wireApply,wirePacket,wireReceive}=helpers;
const json=value=>JSON.parse(JSON.stringify(value));
const fixtures=require('./helpers/wire-fixtures.cjs')();

test('compact values round trip exact doubles, Unicode and every anchor field',()=>{
    for(const fixture of fixtures) assert.deepEqual(json(wireUnpack(json(wirePack(fixture)))),json(fixture));
    const floats=[Number.MIN_VALUE,Number.MAX_VALUE,Number.EPSILON,1-Number.EPSILON,.8636779505946935,-.1063701923076923,7654321.987654321];
    const restored=wireUnpack(json(wirePack(floats)));
    floats.forEach((value,index)=>assert(Object.is(value,restored[index]),'coordinate changed'));
    assert.deepEqual(json(wireUnpack(json(wirePack({'0':'numeric key',unknownField:'保留',x:1})))),{'0':'numeric key',unknownField:'保留',x:1});
});

test('1000 consecutive updates replace exact coordinates without accumulating error',()=>{
    for(const fixture of fixtures){
        let state=json(fixture);
        for(let index=0;index<1000;index++){
            const next=json(fixture);next.x=(index+1)/1001;next.y=1-next.x;next.screen.x=index/1001;
            if(next.space)next.space.gap.ratio=Math.sin(index)**2;
            const patch=wireDiff(state,next)||[1];
            state=wireApply(state,json(patch));assert.deepEqual(json(state),next);
        }
    }
});

test('identity changes, deletions, nulls, reorders and empty arrays reconstruct full state',()=>{
    const values=[null,fixtures[0],fixtures[1],{...fixtures[1],dragging:true},{tick:10,cursors:[],editing:[]},{tick:3,cursors:[{name:'A',hue:1,cursor:fixtures[0]},{name:'B',hue:2,cursor:fixtures[1]}]}, {tick:30,cursors:[{name:'B',hue:2,cursor:fixtures[5]},{name:'A',hue:3,cursor:fixtures[0]}]}, {tick:30,cursors:[],editing:[]},null];
    let state=values[0];for(const next of values.slice(1)){state=wireApply(state,json(wireDiff(state,next)||[1]));assert.deepEqual(json(state),json(next));}
});

test('revision gaps and epoch changes refuse deltas and recover only from full snapshots',()=>{
    const first={tick:10,cursors:[],selections:[],editing:[]},second={...first,cursors:[{name:'A',hue:1,cursor:fixtures[0]}]},third={...second,tick:3};
    let baseline=wireReceive(null,json(wirePacket('epoch-a',1,null,null,first)));
    const two=wirePacket('epoch-a',2,1,first,second),three=wirePacket('epoch-a',3,2,second,third);
    assert.throws(()=>wireReceive(baseline,three),/revision/);
    baseline=wireReceive(baseline,json(two));assert.deepEqual(json(baseline.value),second);
    assert.equal(wireReceive(baseline,two),baseline,'duplicate changed baseline');
    assert.throws(()=>wireReceive(baseline,wirePacket('epoch-b',3,2,second,third)),/revision/);
    baseline=wireReceive(baseline,wirePacket('epoch-b',4,null,null,third));assert.deepEqual(json(baseline.value),third);
});

test('malformed compact data cannot mutate prototypes, expand arrays or accept duplicate keys',()=>{
    for(const value of [[3,'__proto__',[3,'polluted',true]],[3,'constructor',1],[3,0,1,'x',2],[8,1],{},Infinity])assert.throws(()=>wireUnpack(value));
    for(const patch of [[1,'__proto__',[0,[3,'polluted',true]]],[1,0,[0,1],0,[0,2]],[1,2,[0,1]],[1,0,[2]]])assert.throws(()=>wireApply([0,1],patch));
    assert.throws(()=>wireApply({},[1,'missing',[2]]));
    assert.equal({}.polluted,undefined);
    let deep=null;for(let i=0;i<70;i++)deep=[4,deep];assert.throws(()=>wireUnpack(deep),/complex/);
});

test('full snapshots retain 32 participants each selecting the supported 10000 blocks',()=>{
    const blockIds=Array.from({length:10000},(_,i)=>'20261110165117-'+i.toString(36).padStart(7,'0'));
    const state={tick:30,cursors:[],selections:[],editing:Array.from({length:32},(_,i)=>({name:'peer-'+i,hue:i,editing:{documentId:'20261110165117-doc0001',blockId:blockIds[0],blockIds}}))};
    const restored=wireUnpack(json(wirePack(state)));assert.deepEqual(json(restored),state);
});

test('steady cursor packets shrink both ways without reducing field precision',()=>{
    const rows=[];
    for(const [index,fixture]of fixtures.entries()){
        const next=json(fixture);next.x=.8343490304709141;next.y=.3103448275862069;
        if(next.space)next.space.x=.9827349871234987;
        const before={tick:10,cursors:[{name:'A',hue:134,cursor:fixture}],selections:[],editing:[]};
        const after={...before,cursors:[{name:'A',hue:134,cursor:next}]};
        const upload=JSON.stringify({jsonrpc:'2.0',id:2,method:'cursorUpdate',params:['session-example',1,2,next]});
        const compactUpload=JSON.stringify({jsonrpc:'2.0',id:2,method:'cursorDelta',params:['session-example',1,2,1,wireDiff(fixture,next)]});
        const download=JSON.stringify({jsonrpc:'2.0',method:'cursor-changed',params:[after]});
        const packet=wirePacket('epoch-example',2,1,before,after);
        const compactDownload=JSON.stringify({jsonrpc:'2.0',method:'cursor-delta',params:[packet]});
        assert.deepEqual(json(wireApply(fixture,json(wireDiff(fixture,next)))),next);
        assert(compactUpload.length<upload.length*.65);assert(compactDownload.length<download.length*.65);
        rows.push({fixture:index,upload:Buffer.byteLength(upload),compactUpload:Buffer.byteLength(compactUpload),download:Buffer.byteLength(download),compactDownload:Buffer.byteLength(compactDownload)});
    }
    console.log('Wire byte comparison:',JSON.stringify(rows));
});
