// Run with node tests/browser.test.cjs, then open the printed local URL.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const frontendSource = fs.readFileSync(path.join(root, "index.js"), "utf8");
const helpers = fs.readFileSync(path.join(root,'src/protocol.js'),'utf8')+'\n'+fs.readFileSync(path.join(root, 'src/frontend/anchors.js'), 'utf8').split('\n').slice(1).join('\n')+'\n'+fs.readFileSync(path.join(root,'src/frontend/graphs.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/frontend/pdf.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/frontend/components.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'src/frontend/surfaces.js'),'utf8');
const selectionMethods = frontendSource.slice(frontendSource.indexOf('    renderSelections() {'), frontendSource.indexOf('    clearRow(')).replace('renderSelections() {','function renderSelections() {') +
    frontendSource.slice(frontendSource.indexOf('    async sendSelection() {'), frontendSource.indexOf('    scheduleCursorRender(')).replace('async sendSelection() {','async function sendSelection() {');
const treeMethods = frontendSource.slice(frontendSource.indexOf('    clearRow('), frontendSource.indexOf('    openMenu() {'))
    .replace('clearRow(row) {', 'function clearRow(row) {').replace('renderTreePresence() {', 'function renderTreePresence() {');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>协作光标浏览器回归</title>
<style>
${fs.readFileSync(path.join(root, "index.css"), "utf8")}
:root{--b3-theme-background:white;--b3-theme-on-background:#20252b;--b3-border-radius:4px;--b3-border-color:#d3d7dd;--b3-list-hover:#edf0f4;--b3-theme-primary:#3574c8}
body{margin:24px;font:16px/1.5 sans-serif;color:#20252b;background:#fafafa}
h1{font-size:24px}#results{font-size:14px;white-space:pre-wrap}
.workspace{display:flex;gap:20px;align-items:flex-start}.sy__file{width:280px;height:320px;overflow:auto;background:#fff}
.sy__file li{display:flex;align-items:center;height:36px;box-sizing:border-box;padding:5px;list-style:none}.sy__file ul{margin:0;padding:0}
.protyle{width:720px;background:white}.protyle-content{height:340px;overflow:auto;border:1px solid #888}
.protyle-wysiwyg{padding:16px;font-size:20px;line-height:32px}.p{margin-bottom:16px}[contenteditable]{outline:none}
.list{padding-left:24px}.occluder{position:fixed;inset:0;background:white;z-index:9}
</style><h1>协作光标浏览器回归</h1><pre id="results">Running…</pre><div class="workspace">
<div class="sy__file"><ul data-url="20261030165150-book001">
${Array.from({ length: 25 }, (_, i) => `<li data-type="navigation-file" data-node-id="20261030165150-row${String(i).padStart(4,"0")}"><span class="b3-list-item__toggle"><span class="b3-list-item__arrow">›</span></span><span class="b3-list-item__icon">📄</span><span class="b3-list-item__text">文档 ${i + 1}</span></li>`).join("")}
</ul></div><div class="protyle"><div class="protyle-background" data-node-id="20261030165150-doc0001"></div><div class="protyle-content"><div class="protyle-wysiwyg">
<div class="p" data-node-id="20261030165150-block01"><div contenteditable="true">${"长篇文档定位验证，每个字符必须跟随本地换行和滚动。".repeat(50)}<strong>内联加粗文字</strong>${"继续验证跨节点字符偏移。".repeat(20)}</div></div>
<div class="list" data-node-id="20261030165150-list001"><div data-node-id="20261030165150-item001">1.<div class="p" data-node-id="20261030165150-para001"><div contenteditable="true">普通列表项目</div></div>
<div class="list" data-node-id="20261030165150-list002"><div data-node-id="20261030165150-item002">a.<div class="p" data-node-id="20261030165150-para002"><div contenteditable="true">嵌套列表项目同样按文字定位</div></div></div></div></div></div>
<div class="p" data-node-id="20261030165150-block02"><div contenteditable="true">${"第二段内容用于验证鼠标静止时滚动切换锚点。".repeat(35)}</div></div>
</div></div></div></div><script>${helpers}\n${selectionMethods}\n${treeMethods}</script><script>
const dockModels=new Map();
function getModelByDockType(type){return dockModels.get(type);}
const testTabs=[];
function getAllTabs(){return testTabs;}
const viewerMenus=[];
class Menu {
    constructor() { this.items=[];viewerMenus.push(this); }
    addItem(item) { this.items.push(item); }
    open(position) { this.position=position; }
}
const results = [];
const settleDialog = () => new Promise(resolve=>setTimeout(resolve,60));
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const assert = (value, message) => { if (!value) throw new Error(message); };
const near = (a,b) => Math.abs(a-b) < 1;
function componentRoundTrip(point,plugin) {
    const anchor=captureCursor(point,plugin);assert(anchor && validCursor(anchor),'missing anchor at '+JSON.stringify(point));
    const resolved=resolveCursor(anchor,plugin);assert(resolved && near(point.x,resolved.x) && near(point.y,resolved.y),'round trip drift: '+JSON.stringify({point,anchor,resolved}));
    return anchor;
}
function projectedFramePoint(element,point) {
    const probe=element.ownerDocument.createElement('i');probe.style.cssText=element.style.cssText;
    probe.style.border='none';probe.style.padding='0';probe.style.pointerEvents='none';probe.style.opacity='0';
    const markers=[[0,0],[100,0],[0,100]].map(([x,y])=>{const marker=element.ownerDocument.createElement('i');marker.style.cssText='position:absolute;width:0;height:0;left:'+x+'px;top:'+y+'px';probe.append(marker);return marker;});
    element.parentElement.append(probe);
    try{const [o,x,y]=markers.map(marker=>marker.getBoundingClientRect());return {x:o.left+(x.left-o.left)*point.x/100+(y.left-o.left)*point.y/100,y:o.top+(x.top-o.top)*point.x/100+(y.top-o.top)*point.y/100};}finally{probe.remove();}
}
const block = document.querySelector('[data-node-id="20261030165150-block01"]');
const scroller = document.querySelector('.protyle-content');
function rectAt(element, offset) { const character = characterAt(cursorTextRoot(element), offset); return characterRect(character.node, character.offset); }
async function expose(element, offset) {
    const rect = rectAt(element, offset);
    scroller.scrollTop += rect.top - scroller.getBoundingClientRect().top - 120;
    await frame();
    const current = rectAt(element, offset);
    return { x: current.left + current.width / 2, y: current.top + current.height / 2 };
}
async function test(name, run) {
    try { await run(); results.push('PASS ' + name); }
    catch(error) { results.push('FAIL ' + name + ': ' + error.message); }
    document.getElementById('results').textContent = results.join('\\n');
}
(async () => {
    await test('文档树人数在 emoji 前，点击查看名单，不触发文档行点击', async () => {
        const row=document.querySelector('.sy__file li');
        const viewer={name:'chord-test',i18n:{viewers:'Viewers: '+String.fromCharCode(36)+'{count}'},
            clients:[{name:'<b>A</b>',hue:120,documentId:row.dataset.nodeId},{name:'B',hue:215,documentId:row.dataset.nodeId}],clearRow,openPeople:id=>viewer.openedPeople=id};
        renderTreePresence.call(viewer);
        const count=row.querySelector('.collab-presence-users'), icon=row.querySelector('.b3-list-item__icon');
        assert(count.tagName==='BUTTON' && count.textContent==='2','not a count button');
        assert(count.nextElementSibling===icon && count.previousElementSibling.classList.contains('b3-list-item__toggle'),'wrong count placement');
        let rowClicks=0;const onClick=()=>rowClicks++;row.addEventListener('click',onClick);
        count.click();assert(rowClicks===0,'count click navigated to the document');
        assert(viewer.openedPeople===row.dataset.nodeId,'participant list did not open for this document');
        count.focus();assert(document.activeElement===count,'count cannot receive keyboard focus');
        renderTreePresence.call(viewer);assert(document.activeElement===count,'unchanged rendering lost focus');
        const style=getComputedStyle(count);assert(style.pointerEvents!=='none' && parseFloat(style.height)>=22,'count not interactive or clipped');
        row.removeEventListener('click',onClick);viewer.clients=[];renderTreePresence.call(viewer);
        assert(!row.querySelector('.collab-presence-users') && !row.classList.contains('collab-presence'),'stale viewer count left behind');
    });
    await test('文字字符精确定位', async () => {
        const point = await expose(block, 150);
        const anchor = captureCursor(point);
        assert(anchor?.text?.offset === 150, JSON.stringify(anchor));
        const resolved = resolveCursor(anchor);
        assert(resolved && near(resolved.x, point.x) && near(resolved.y, point.y), 'round trip drift');
        window.savedAnchor = anchor;
    });
    await test('不同窗口宽度重新换行', async () => {
        document.querySelector('.protyle').style.width = '420px';
        const expected = await expose(block, 150);
        const resolved = resolveCursor(window.savedAnchor);
        assert(resolved && near(resolved.x, expected.x) && near(resolved.y, expected.y), 'reflow drift');
    });
    await test('接收端滚动保持内容锚点', async () => {
        const before = resolveCursor(window.savedAnchor);
        scroller.scrollTop += 32;
        await frame();
        const after = resolveCursor(window.savedAnchor);
        assert(before && after && near(before.y - after.y, 32), 'scroll drift');
    });
    await test('发送端鼠标静止时滚动重新取锚点', async () => {
        const point = await expose(block, 150);
        const before = captureCursor(point);
        scroller.scrollTop += 32;
        await frame();
        const after = captureCursor(point);
        assert(after?.text && before.text.offset !== after.text.offset, 'stationary pointer not remapped');
    });
    await test('嵌套列表使用最内层段落', async () => {
        const nested = document.querySelector('[data-node-id="20261030165150-para002"]');
        const point = await expose(nested, 4);
        const anchor = captureCursor(point);
        assert(anchor?.blockId === '20261030165150-para002' && anchor.text?.offset === 4, JSON.stringify(anchor));
    });
    await test('文档树按文档与字符定位，宽度和滚动变化不漂移', async () => {
        const tree=document.querySelector('.sy__file'),row=tree.querySelectorAll('li')[4],label=row.querySelector('.b3-list-item__text');
        const r=rectAt(label,1),point={x:r.left+r.width/2,y:r.top+r.height/2},anchor=captureCursor(point);
        assert(anchor?.ui.kind==='file' && anchor.ui.key===row.dataset.nodeId && anchor.ui.offset===1,JSON.stringify(anchor));
        tree.scrollTop+=36;tree.style.width='320px';row.style.paddingLeft='45px';await frame();
        const expected=rectAt(label,1),resolved=resolveCursor(anchor);
        assert(resolved && near(resolved.x,expected.left+expected.width/2) && near(resolved.y,expected.top+expected.height/2),'file label drift');
        row.classList.add('fn__none');assert(resolveCursor(anchor)===null,'collapsed row painted');row.classList.remove('fn__none');
        row.style.paddingLeft='';
    });
    await test('笔记本与文件子控件按身份定位，重名、重排、缩进和缺失不会串行', async () => {
        const fixture=document.createElement('div');fixture.className='sy__file';
        fixture.style.cssText='position:fixed;left:30px;top:20px;width:500px;height:300px;z-index:100;background:white';
        fixture.innerHTML=['20261030165150-book003','20261030165150-book002'].map(id=>'<ul data-url="'+id+'"><li data-type="navigation-root" data-node-id=""><span class="b3-list-item__toggle" style="padding-left:40px"><span class="b3-list-item__arrow">›</span></span><span class="b3-list-item__icon">📚</span><span class="b3-list-item__text" style="flex:1">同名笔记本</span><button data-type="new">+</button></li><li data-type="navigation-file" data-node-id="20261030165150-file001"><span class="b3-list-item__icon">📄</span><span class="b3-list-item__text" style="flex:1">同名文档</span></li></ul>').join('');
        document.body.append(fixture);
        try {
            for(const selector of ['[data-type="navigation-root"] .b3-list-item__text','[data-type="navigation-root"] .b3-list-item__icon','.b3-list-item__arrow','button','[data-type="navigation-file"] .b3-list-item__text']) {
                const element=fixture.querySelector(selector),r=selector.endsWith('__text') ? rectAt(element,1):element.getBoundingClientRect();
                const anchor=captureCursor({x:r.left+r.width/2,y:r.top+r.height/2});
                assert(anchor?.ui.kind==='file' && anchor.ui.id==='20261030165150-book003','wrong notebook identity: '+selector);
                fixture.append(fixture.firstElementChild);fixture.style.width='350px';await frame();
                assert(resolveCursor(anchor),'reorder lost target: '+selector);
                const row=element.closest('li'),copy=row.cloneNode(true);row.after(copy);
                assert(resolveCursor(anchor)===null,'ambiguous row displayed');copy.remove();
                row.classList.add('fn__none');assert(resolveCursor(anchor)===null,'hidden row displayed');row.classList.remove('fn__none');
                const book=element.closest('ul');book.remove();assert(resolveCursor(anchor)===null,'same name or file in other notebook matched');fixture.prepend(book);
            }
            const row=fixture.querySelector('li'),label=row.querySelector('.b3-list-item__text'),r=label.getBoundingClientRect();
            componentRoundTrip({x:r.right-4,y:r.top+r.height/2});
            const toggle=row.querySelector('.b3-list-item__toggle'),t=toggle.getBoundingClientRect();
            componentRoundTrip({x:t.left+5,y:t.top+t.height/2});
        } finally {fixture.remove();}
    });
    await test('界面空白与分屏缝隙精确往返，旧无身份比例锚点继续拒绝',async()=>{
        const fixture=document.createElement('div');fixture.id='blank-layout';fixture.className='layout__wnd--active';
        fixture.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:240px;background:white;z-index:100';
        fixture.innerHTML='<div class="sy__file" style="height:80px"></div><div class="b3-list-item" style="height:30px"><span class="b3-list-item__text">反链列表行</span></div><div class="protyle-breadcrumb__space" style="height:40px"></div><div class="layout__resize" style="height:30px"></div>';
        document.body.append(fixture);
        try {
            for(const element of [fixture,...fixture.children]) {
                const r=element.getBoundingClientRect();componentRoundTrip({x:r.left+10,y:r.bottom-5});
            }
            const old={surface:'ui',documentId:null,blockId:null,page:{kind:'workspace',title:''},screen:{x:.2,y:.2},x:.5,y:.5,ui:{version:2,kind:'id',id:fixture.id,path:[],tag:'div'}};
            assert(resolveCursor(old)===null,'legacy container anchor displayed');
            assert(resolveDocumentCursor({surface:'tree',blockId:'20261030165150-file001',documentId:null,x:.5,y:.5})===null,'legacy row fraction displayed');
            assert(resolveDocumentCursor({...window.savedAnchor,text:undefined})===null,'legacy block fraction displayed');
        } finally {fixture.remove();}
    });
    function documentSpaceFixture() {
        const fixture=document.createElement('div');fixture.className='protyle';
        fixture.style.cssText='position:fixed;left:30px;top:20px;width:540px;background:white;z-index:100';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261030165150-space01"></div><div class="protyle-wysiwyg" style="font:20px/40px sans-serif;padding:16px">'+
            '<div class="p" data-node-id="20261030165150-space02"><div contenteditable="true">First line with spaces<br>Second line</div></div>'+
            '<div class="p" data-node-id="20261030165150-space03"><div contenteditable="true"><br></div></div>'+
            '<div class="p" data-node-id="20261030165150-space04"><div contenteditable="true">Final paragraph</div></div></div>';
        document.body.append(fixture);return fixture;
    }
    function spaceRoundTrip(point) {
        const anchor=captureCursor(point),resolved=anchor && resolveCursor(anchor);
        assert(anchor?.surface==='document' && validCursor(anchor),'document point disappeared: '+JSON.stringify(point));
        assert(resolved && near(resolved.x,point.x) && near(resolved.y,point.y),'space drift: '+JSON.stringify({point,anchor,resolved}));
        return anchor;
    }
    await test('正文表格与代码的内部滚动裁剪隐藏字形，滚动露出后恢复',async()=>{
        const fixture=documentSpaceFixture();try{
            const block=fixture.querySelector('.p');block.style.position='relative';
            for(const table of [true,false]){
                block.innerHTML=table?'<div class="clip" contenteditable="false" style="width:480px;overflow:auto"><table contenteditable="true" style="width:480px;table-layout:fixed;border-collapse:collapse"><tbody><tr><td>First</td><td>Middle</td><td>Target</td></tr></tbody></table></div>':'<div class="clip" style="width:480px;overflow:auto"><div contenteditable="true" style="width:480px;white-space:pre;font-family:monospace">'+(' '.repeat(28))+'Target</div></div>';
                const root=cursorTextRoot(block),clip=block.querySelector('.clip'),offset=root.textContent.indexOf('Target')+2,r=rectAt(block,offset),anchor=componentRoundTrip({x:r.left+r.width/2,y:r.top+r.height/2});assert(anchor.text?.offset===offset,'text fixture used fallback');
                clip.style.width='180px';assert(resolveCursor(anchor)===null,'internally clipped glyph painted');clip.scrollLeft=clip.scrollWidth-clip.clientWidth;const actual=resolveCursor(anchor),expected=rectAt(block,offset);assert(actual&&near(actual.x,expected.left+expected.width/2)&&near(actual.y,expected.top+expected.height/2),'visible scrolled text did not restore');
                clip.scrollLeft=0;clip.style.width='480px';assert(resolveCursor(anchor),'unclipped text did not restore');
                const cover=document.createElement('div');cover.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;background:white;user-select:none';block.append(cover);assert(resolveCursor(anchor)===null,'same-block overlay painted text');cover.remove();
                root.style.pointerEvents='none';assert(resolveCursor(anchor),'visible text with pointer-events none was hidden');
                clip.style.width='180px';assert(resolveCursor(anchor)===null,'pointer-events none bypassed horizontal clipping');clip.style.width='480px';
                clip.style.height='8px';assert(resolveCursor(anchor)===null,'pointer-events none bypassed vertical clipping');clip.style.height='';
                fixture.style.transform='scale(.8)';const scaled=resolveCursor(anchor),s=rectAt(block,offset);assert(scaled&&near(scaled.x,s.left+s.width/2)&&near(scaled.y,s.top+s.height/2),'scaled text lost geometry');fixture.style.transform='';
            }
        }finally{fixture.remove();}
    });
    await test('正文行距、行尾和段落间空白连续移动不丢光标',async()=>{
        const fixture=documentSpaceFixture();
        try {
            const paragraphs=fixture.querySelectorAll('.p'),first=rectAt(paragraphs[0],2),last=rectAt(paragraphs[2],2);
            for(let y=first.top+1;y<last.bottom;y+=1)spaceRoundTrip({x:first.left+first.width/2,y});
            const r=cursorTextRoot(paragraphs[0]).getBoundingClientRect();
            assert(spaceRoundTrip({x:r.right-20,y:first.top+5}).space,'line trailing whitespace missing');
            const space=rectAt(paragraphs[0],5);
            assert(spaceRoundTrip({x:space.left+space.width/2,y:space.top+space.height/2}).text?.offset===5,'actual text space lost');
        } finally {fixture.remove();}
    });
    await test('空段落保留块身份，正文边距与底部留白精确往返',async()=>{
        const fixture=documentSpaceFixture();
        try {
            const editor=fixture.querySelector('.protyle-wysiwyg'),empty=fixture.querySelectorAll('.p')[1],r=cursorTextRoot(empty).getBoundingClientRect();
            const anchor=spaceRoundTrip({x:r.left+80,y:r.top+r.height/2});
            assert(anchor.space?.offset===0 && anchor.blockId===empty.dataset.nodeId,'empty paragraph lost identity');
            for(const placeholder of [String.fromCharCode(10)+'<br>',String.fromCharCode(8203)+'<br>']) {
                cursorTextRoot(empty).innerHTML=placeholder;
                assert(spaceRoundTrip({x:r.left+80,y:r.top+r.height/2}).blockId===empty.dataset.nodeId,'placeholder lost empty paragraph');
            }
            cursorTextRoot(empty).innerHTML='<br>';
            const bounds=editor.getBoundingClientRect();
            componentRoundTrip({x:bounds.left+3,y:r.top+5});
            componentRoundTrip({x:r.left+20,y:bounds.bottom-3});
            assert(resolveCursor({...anchor,documentId:'20261030165150-other01'})===null,'space escaped document');
            const copy=fixture.cloneNode(true);copy.style.left='600px';document.body.append(copy);
            assert(resolveCursor(anchor)===null,'ambiguous space picked arbitrary editor');copy.remove();
            const cover=document.createElement('div');cover.className='occluder';cover.style.zIndex='101';document.body.append(cover);
            assert(resolveCursor(anchor)===null,'space showed through overlay');cover.remove();
        } finally {fixture.remove();}
    });
    await test('正文行尾和缩进留白跟随字形与栏边界，留白被新文字占据时隐藏',async()=>{
        for(const side of ['before','inside','after']){
            const fixture=documentSpaceFixture();try{
                const paragraph=fixture.querySelector('.p'),root=cursorTextRoot(paragraph),editor=fixture.querySelector('.protyle-wysiwyg');root.textContent='Short text';root.style.paddingLeft='60px';paragraph.style.marginBottom='100px';
                const tail=rectAt(paragraph,root.textContent.length-1),first=rectAt(paragraph,0),column=documentColumn(editor),r=root.getBoundingClientRect();
                const x=side==='before'?column.left+(first.left-column.left)*.4:side==='inside'?tail.left+tail.width*.4:tail.right+(column.right-tail.right)*.4;
                const point={x,y:side==='inside'?r.bottom+8:tail.top+tail.height/2},anchor=spaceRoundTrip(point);
                assert(anchor.space?.gap?.side===side,'missing semantic '+side+' gap');
                fixture.style.width='360px';editor.style.fontSize='24px';editor.style.lineHeight='48px';const g=rectAt(paragraph,anchor.space.offset),c=documentColumn(editor),expectedX=side==='before'?c.left+(g.left-c.left)*.4:side==='inside'?g.left+g.width*.4:g.right+(c.right-g.right)*.4,resolved=resolveCursor(anchor);
                assert(resolved&&near(resolved.x,expectedX),'glyph gap drift after resize/font change: '+side);if(side!=='inside')assert(near(resolved.y,g.top+g.height/2),'glyph-band whitespace drifted vertically with font change');
                const legacy={...anchor,space:{...anchor.space}};delete legacy.space.gap;const old=resolveCursor(legacy);assert(old&&near(old.x,c.left+(c.right-c.left)*anchor.space.x),'legacy column anchor changed');
                if(side==='after'){
                    const image=document.createElement('img');image.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3Crect width="16" height="16" fill="blue"/%3E%3C/svg%3E';image.style.cssText='position:fixed;left:'+(resolved.x-8)+'px;top:'+(resolved.y-8)+'px;width:16px;height:16px';root.append(image);await image.decode();assert(resolveCursor(anchor)===null,'old whitespace painted on a new image');const media=captureCursor(resolved);assert(media?.ui?.kind==='component'&&!media.space,'image was captured as document whitespace');image.remove();
                    root.textContent+=' new content that occupies the old line end';assert(resolveCursor(anchor)===null,'old trailing gap painted over new content');}
            }finally{fixture.remove();}
        }
    });
    await test('横排和嵌套超级块的留白跟随所属栏，重排与撤销不落入相邻栏',async()=>{
        const fixture=documentSpaceFixture();try{
            const editor=fixture.querySelector('.protyle-wysiwyg'),paragraph=editor.querySelector('.p'),root=cursorTextRoot(paragraph);root.textContent='Short';
            const tail=rectAt(paragraph,4),bounds=editor.getBoundingClientRect(),point={x:tail.right+(bounds.right-16-tail.right)*.6,y:tail.top+tail.height/2},anchor=spaceRoundTrip(point);
            const row=document.createElement('div');row.className='sb';row.dataset.sbLayout='col';row.style.cssText='display:flex;gap:12px';paragraph.before(row);row.append(paragraph);paragraph.style.cssText='width:45%;flex:none';
            const neighbor=document.createElement('div');neighbor.className='p';neighbor.dataset.nodeId='20261030165150-space05';neighbor.style.cssText='flex:1';neighbor.innerHTML='<div contenteditable="true">Other column</div>';row.append(neighbor);
            for(const nested of [false,true]){
                if(nested){const outer=document.createElement('div');outer.className='sb';outer.dataset.sbLayout='col';outer.style.cssText='display:flex;gap:12px';row.before(outer);outer.append(row,neighbor.cloneNode(true));row.style.cssText+=';width:75%;flex:none';outer.lastElementChild.removeAttribute('data-node-id');}
                for(const width of ['540px','680px']){fixture.style.width=width;for(const first of [true,false]){
                    row.insertBefore(paragraph,first?neighbor:null);const g=rectAt(paragraph,4),r=paragraph.getBoundingClientRect(),expected={x:g.right+(r.right-g.right)*.6,y:g.top+g.height/2},actual=resolveCursor(anchor);
                    assert(actual&&near(actual.x,expected.x)&&near(actual.y,expected.y),'old whitespace escaped its local column');
                    const fresh=spaceRoundTrip(expected);assert(fresh.blockId===paragraph.dataset.nodeId&&near(fresh.space.gap.ratio,.6),'fresh column gap used editor width');
                    neighbor.style.display='none';assert(resolveCursor(fresh),'hiding another column hid the target');neighbor.style.display='';paragraph.style.display='none';assert(resolveCursor(fresh)===null,'hidden target column remained visible');paragraph.style.display='';
                }}
            }
            editor.prepend(paragraph);row.closest('.sb')?.remove();paragraph.style.cssText='';fixture.style.width='540px';const restored=resolveCursor(anchor);assert(restored&&near(restored.x,point.x)&&near(restored.y,point.y),'undo did not restore whitespace');
        }finally{fixture.remove();}
    });
    await test('超级块容器边距跟随子列边界，分栏改宽和原生临时选中不丢指针',async()=>{
        const fixture=documentSpaceFixture();try{
            const editor=fixture.querySelector('.protyle-wysiwyg'),columns=[...editor.querySelectorAll('.p')],row=document.createElement('div');row.className='sb';row.dataset.type='NodeSuperBlock';row.dataset.nodeId='20261030165150-space06';row.dataset.sbLayout='col';row.style.cssText='display:flex;gap:18px;padding:2px 0';editor.prepend(row);
            for(const column of columns){row.append(column);column.style.cssText='width:140px;flex:none;margin:0;padding:4px';cursorTextRoot(column).textContent='Column content';}
            const samples=[];for(const column of columns)for(const side of ['top','bottom']){const r=column.getBoundingClientRect(),b=row.getBoundingClientRect(),point={x:r.left+r.width*.4,y:side==='top'?(b.top+r.top)/2:(r.bottom+b.bottom)/2};assert(document.elementFromPoint(point.x,point.y)===row,'fixture margin missing');const anchor=componentRoundTrip(point);assert(anchor.ui?.kind==='component','container borrowed child text');samples.push({column,side,anchor});}
            columns[0].style.width='220px';columns[1].style.width='100px';columns[0].classList.add('protyle-wysiwyg--select');row.prepend(columns[2]);
            for(const {column,side,anchor}of samples){const r=column.getBoundingClientRect(),b=row.getBoundingClientRect(),expected={x:r.left+r.width*.4,y:side==='top'?(b.top+r.top)/2:(r.bottom+b.bottom)/2},actual=resolveCursor(anchor);assert(actual&&near(actual.x,expected.x)&&near(actual.y,expected.y),'margin lost local column after resize/selection');column.classList.add('fn__none');assert(resolveCursor(anchor)===null,'margin followed a hidden column');column.classList.remove('fn__none');}
        }finally{fixture.remove();}
    });
    await test('分栏调整手柄按相邻块匹配，重排、反向、隐藏和无效身份不串位',async()=>{
        const fixture=documentSpaceFixture();try{
            const editor=fixture.querySelector('.protyle-wysiwyg'),columns=[...editor.querySelectorAll('.p')],row=document.createElement('div');row.className='sb';row.dataset.type='NodeSuperBlock';row.dataset.nodeId='20261030165150-space06';row.dataset.sbLayout='col';row.style.cssText='display:flex';editor.prepend(row);
            for(const column of columns){column.style.cssText='width:140px;flex:none;margin:0';cursorTextRoot(column).textContent='Column';}
            const divider=()=>{const e=document.createElement('span');e.className='sb__resize';e.contentEditable='false';e.style.cssText='display:block;width:2px;flex:none;margin-right:16px';return e;},first=divider(),second=divider();row.append(columns[0],first,columns[1],second,columns[2]);const r=first.getBoundingClientRect(),anchor=componentRoundTrip({x:r.left+1,y:r.top+r.height*.5});
            for(const reverse of [false,true]){row.replaceChildren(columns[2],second,...(reverse?[columns[1],first,columns[0]]:[columns[0],first,columns[1]]));const b=first.getBoundingClientRect(),actual=resolveCursor(anchor);assert(actual&&near(actual.x,b.left+1)&&near(actual.y,b.top+b.height*.5),'divider followed its old sibling index');}
            first.style.opacity='0';assert(resolveCursor(anchor)===null,'transparent divider drawn');first.style.opacity='1';columns[0].removeAttribute('data-node-id');assert(resolveCursor(anchor)===null,'invalid neighbor identity drawn');const b=first.getBoundingClientRect();assert(captureCursor({x:b.left+1,y:b.top+b.height*.5})===null,'invalid divider identity captured');
        }finally{fixture.remove();}
    });
    await test('段落空白跟随字符换行、字号和滚动，不使用整块比例',async()=>{
        const fixture=documentSpaceFixture();
        try {
            const paragraph=fixture.querySelector('.p'),root=cursorTextRoot(paragraph);
            root.textContent='Wrapped paragraph content with a short final line. '.repeat(4).trim();
            const tail=rectAt(paragraph,root.textContent.length-1),r=root.getBoundingClientRect();
            const point={x:tail.right+2,y:r.bottom+8},anchor=spaceRoundTrip(point);
            assert(anchor.space?.offset===root.textContent.length-1,'paragraph gap not anchored to tail');
            fixture.style.width='360px';const editor=fixture.querySelector('.protyle-wysiwyg');editor.style.fontSize='24px';editor.style.lineHeight='48px';
            const expected=rectAt(paragraph,anchor.space.offset),resolved=resolveCursor(anchor);
            assert(resolved && near(resolved.y,expected.top+anchor.space.y*48),'space lost semantic line after reflow');
            const column=documentColumn(editor);
            assert(anchor.space.gap?.side==='after' && near(resolved.x,expected.right+(column.right-expected.right)*anchor.space.gap.ratio),'trailing gap lost its glyph boundary');
            fixture.style.top='-20px';const moved=resolveCursor(anchor);
            assert(moved && near(resolved.y-moved.y,40),'space lost scroll position');
            paragraph.classList.add('fn__none');assert(resolveCursor(anchor)===null,'hidden paragraph shared');
        } finally {fixture.remove();}
    });
    await test('跨内联节点和字体缩放', async () => {
        const root = cursorTextRoot(block);
        const strong = root.querySelector('strong').firstChild;
        const prefix = document.createRange();prefix.selectNodeContents(root);prefix.setEnd(strong,2);
        const offset = prefix.toString().length;
        const point = await expose(block,offset);
        const anchor = captureCursor(point);
        assert(anchor.text?.offset === offset,'inline node offset');
        document.querySelector('.protyle-wysiwyg').style.fontSize = '24px';
        const expected = await expose(block,offset);
        const resolved = resolveCursor(anchor);
        assert(resolved && near(resolved.x,expected.x) && near(resolved.y,expected.y),'font scaling drift');
    });
    await test('未加载的块和其他文档不会画假光标', async () => {
        assert(resolveDocumentCursor({...window.savedAnchor,blockId:'20261030165150-missing'}) === null,'missing block precisely anchored');
        assert(resolveDocumentCursor({...window.savedAnchor,documentId:'20261030165150-other01'}) === null,'wrong document precisely anchored');
        const copy=block.closest('.protyle').cloneNode(true);document.body.append(copy);
        assert(resolveDocumentCursor(window.savedAnchor)===null,'duplicate document picked an arbitrary pane');copy.remove();
        assert(resolveCursor({...window.savedAnchor,blockId:'20261030165150-missing'})===null,'missing block fell back to screen position');
    });
    await test('视口外或弹窗遮挡时隐藏', async () => {
        await expose(block,150);
        const cover = document.createElement('div');cover.className='occluder';document.body.append(cover);
        assert(resolveDocumentCursor(window.savedAnchor) === null,'occluded content precisely anchored');
        cover.remove();scroller.scrollTop += 1000;await frame();
        assert(resolveDocumentCursor(window.savedAnchor) === null,'offscreen content precisely anchored');
    });
    function select(element, from, to = from) {
        const root = cursorTextRoot(element);root.focus();
        const start = characterAt(root,from), end = characterAt(root,to);
        const range = document.createRange();range.setStart(start.node,start.offset);range.setEnd(end.node,end.offset);
        const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);
        return range;
    }
    let sharedSelection;
    await test('选区捕获字符偏移，反向跨块选区保持原文', async () => {
        await expose(block,150);select(block,150,190);
        let anchor=captureSelection();
        assert(anchor?.anchor.offset===150 && anchor?.focus.offset===190,'wrong selection offsets');
        assert(resolveSelection(anchor)[0].toString()===document.getSelection().toString(),'single-block text drift');
        const nested=document.querySelector('[data-node-id="20261030165150-para002"]');
        const a=characterAt(cursorTextRoot(nested),6), b=characterAt(cursorTextRoot(block),150);
        document.getSelection().setBaseAndExtent(a.node,a.offset,b.node,b.offset);
        sharedSelection=captureSelection();
        assert(sharedSelection.anchor.blockId===nested.getAttribute('data-node-id') && sharedSelection.focus.offset===150,'backward selection lost direction');
        assert(resolveSelection(sharedSelection)[0].toString()===document.getSelection().getRangeAt(0).toString(),'cross-block text drift');
        assert(resolveSelection({...sharedSelection,documentId:'20261030165150-doc0002'}).length===0,'other document highlighted');
        assert(resolveSelection({...sharedSelection,focus:{...sharedSelection.focus,offset:10000000}}).length===0,'invalid offset painted');
    });
    await test('远端彩色高亮跟随滚动和换行，不占用本地选区、不改正文', async () => {
        assert(CSS.highlights && typeof Highlight!=='undefined','CSS highlights unsupported');
        const style=document.createElement('style');document.body.append(style);
        const viewer={clientName:'Alice',clients:[{name:'Bob'}],remoteSelections:[{name:'Bob',hue:215,selection:sharedSelection}],
            selectionHighlights:new Set(),selectionStyle:style,presenceReceivedAt:Date.now()};
        const original=block.outerHTML, local=document.getSelection().getRangeAt(0).toString();
        renderSelections.call(viewer);
        const key=[...viewer.selectionHighlights][0], range=[...CSS.highlights.get(key)][0];
        assert(key && range.toString()===local,'missing remote highlight');
        const before=range.getBoundingClientRect().top;scroller.scrollTop+=32;await frame();
        assert(near(before-range.getBoundingClientRect().top,32),'highlight scroll drift');
        document.querySelector('.protyle').style.width='600px';await frame();
        assert(range.toString()===local && document.getSelection().getRangeAt(0).toString()===local,'reflow changed selected text');
        assert(block.outerHTML===original,'highlight rewrote note DOM');
        assert(getComputedStyle(cursorTextRoot(block),'::highlight('+key+')').backgroundColor!=='rgba(0, 0, 0, 0)','highlight style missing');
        viewer.remoteSelections=[{name:'Alice',hue:215,selection:sharedSelection}];renderSelections.call(viewer);
        assert(!viewer.selectionHighlights.size && !CSS.highlights.has(key),'self selection duplicated');
        viewer.remoteSelections=[{name:'Bob',hue:215,selection:sharedSelection}];viewer.presenceReceivedAt=Date.now()-PRESENCE_TIMEOUT-1;renderSelections.call(viewer);
        assert(!viewer.selectionHighlights.size,'expired selection left behind');style.remove();
    });
    await test('选区发送去重，取消选区发送清空，不申请编辑权', async () => {
        const sent=[];select(block,10,20);
        const sender={layoutReady:true,selectionSequence:0,lastSelectionSignature:'null',kernel:{rpc:{call:{selectionUpdate:async(...args)=>sent.push(args)}}}};
        await sendSelection.call(sender);await sendSelection.call(sender);
        assert(sent.length===1 && sent[0][3].anchor.offset===10,'selection updates not deduplicated');
        const now=Date.now;Date.now=()=>now()+6000;
        try { await sendSelection.call(sender);assert(sent.length===1,'stationary selection resent after the old deadline'); }
        finally { Date.now=now; }
        document.getSelection().collapseToStart();await sendSelection.call(sender);
        assert(sent.length===2 && sent[1][3]===null,'selection not cleared');
    });
    await test('正文不同文档、隐藏、遮挡时不回退到窗口位置',async()=>{
        const point=await expose(block,30),anchor=captureCursor(point);
        assert(anchor?.surface==='document','editor cursor missing');
        const root=block.closest('.protyle').querySelector('.protyle-background'),id=root.dataset.nodeId;
        root.dataset.nodeId='20261030165150-other01';
        assert(resolveCursor(anchor)===null,'other document displayed cursor');root.dataset.nodeId=id;
        block.classList.add('fn__none');assert(resolveCursor(anchor)===null,'hidden block displayed cursor');block.classList.remove('fn__none');
        const editor=block.closest('.protyle');editor.style.opacity='0';assert(resolveCursor(anchor)===null && captureCursor(point)===null,'transparent parent still shared its text');editor.style.opacity='1';
        const cover=document.createElement('div');cover.className='occluder';document.body.append(cover);
        assert(resolveCursor(anchor)===null,'covered editor displayed cursor');cover.remove();
    });
    await test('悬浮工具栏、顶部留白和面包屑均按所属文档定位',async()=>{
        const fixture=document.createElement('div');fixture.id='shared-layout-id';
        fixture.style.cssText='position:fixed;left:20px;top:20px;width:900px;background:white;z-index:100;display:flex;gap:20px';
        const ids=['20261030165150-uiroot1','20261030165150-uiroot2'];
        const windows=ids.map((id,index)=>{
            const wnd=document.createElement('div');wnd.className=index ? 'layout__wnd--active':'layout__wnd';
            wnd.innerHTML='<div class="protyle" style="width:400px"><div class="protyle-background" data-node-id="'+id+'"></div><div class="protyle-breadcrumb"><button data-type="doc">文档</button><span class="protyle-breadcrumb__space" style="display:inline-block;width:100px;height:24px"></span></div><div class="protyle-toolbar"><button data-type="b">粗体</button></div><div class="protyle-content"><div class="protyle-title"><div class="protyle-title__input" contenteditable="true">同名文档</div></div><button data-topbar-entry="document-plugin">文档插件</button></div></div>';
            fixture.append(wnd);return wnd;
        });document.body.append(fixture);
        fixture.style.width=Math.min(900,innerWidth-40)+'px';
        for(const wnd of windows)wnd.querySelector('.protyle').style.width=(Math.min(900,innerWidth-40)-20)/2+'px';
        const editor=windows[0].querySelector('.protyle'),root=editor.querySelector('.protyle-background');
        const plugin={i18n:{pageDocument:'文档'},currentDocument:()=>ids[1]};
        try {
            for(const selector of ['.protyle-breadcrumb button','[data-topbar-entry]']) {
                const element=editor.querySelector(selector),r=element.getBoundingClientRect();
                const anchor=captureCursor({x:r.left+3,y:r.top+3},plugin);
                assert(anchor?.ui.kind==='document'&&anchor.ui.page.id===ids[0]&&validCursor(anchor),'control lost its owning document: '+selector);
                assert(resolveCursor(anchor,plugin),'same document control missing: '+selector);
                root.dataset.nodeId=ids[1];
                assert(resolveCursor(anchor,plugin)===null,'control appeared in another document: '+selector);
                root.dataset.nodeId=ids[0];editor.classList.add('fn__none');
                assert(resolveCursor(anchor,plugin)===null,'hidden document control appeared: '+selector);
                editor.classList.remove('fn__none');
                fixture.prepend(windows[1]);
                const moved=element.getBoundingClientRect(),point=resolveCursor(anchor,plugin);
                assert(point&&near(point.x,moved.left+3)&&near(point.y,moved.top+3),'split pane matched the active wrong document: '+selector);
            }
            for(const selector of ['.protyle-toolbar button','.protyle-breadcrumb__space','.protyle-title']) {
                const element=editor.querySelector(selector),r=element.getBoundingClientRect();
                const anchor=componentRoundTrip({x:r.right-2,y:r.top+r.height/2},plugin);
                assert(anchor.ui.version===3,'component identity missing');
                root.dataset.nodeId='20261030165150-other01';assert(resolveCursor(anchor,plugin)===null,'blank or toolbar leaked into other document');root.dataset.nodeId=ids[0];
            }
            const title=editor.querySelector('.protyle-title__input'),character=rectAt(title,2);
            const titleAnchor=captureCursor({x:character.left+character.width/2,y:character.top+character.height/2},plugin);
            assert(titleAnchor?.ui.offset===2 && resolveCursor(titleAnchor,plugin),'title character missing');
            root.dataset.nodeId=ids[1];assert(resolveCursor(titleAnchor,plugin)===null,'title appeared in other document');root.dataset.nodeId=ids[0];
            const button=editor.querySelector('.protyle-breadcrumb button'),r=button.getBoundingClientRect();
            const anchor=captureCursor({x:r.left+3,y:r.top+3},plugin);
            editor.querySelector('.protyle-toolbar').classList.add('fn__none');
            assert(resolveCursor({...anchor,ui:{...anchor.ui,attribute:'data-type',value:'b'}},plugin)===null,'legacy floating toolbar cursor appeared');
            editor.querySelector('.protyle-toolbar').classList.remove('fn__none');
            const cover=document.createElement('div');cover.className='occluder';cover.style.zIndex='101';document.body.append(cover);
            assert(resolveCursor(anchor,plugin)===null,'document control cursor leaked through modal');cover.remove();
            root.removeAttribute('data-node-id');
            assert(captureCursor({x:r.left+3,y:r.top+3},plugin)===null,'unknown document used a global anchor');
        } finally {fixture.remove();}
    });
    await test('正文、反向链接与智能体分区匹配，预览正文和控件不会串区',async()=>{
        const fixture=document.createElement('div');fixture.style.cssText='position:fixed;left:20px;top:20px;width:500px;height:640px;z-index:100;background:white;display:flex;flex-direction:column;gap:8px';
        const id='20261030165150-region1',blockId='20261030165150-region2';
        const panes=['document','backlink','agentChat'].map(kind=>{
            const pane=document.createElement('div');pane.style.cssText='width:440px;height:130px;flex-shrink:0';
            if(kind!=='document') {
                pane.className='dockPanel';const icon=document.createElement('button');icon.className='dock__item';icon.dataset.type=kind;fixture.append(icon);
                dockModels.set(kind,{parent:{panelElement:pane}});
            }
            pane.innerHTML='<div class="protyle" style="width:300px"><div class="protyle-background" data-node-id="'+id+'"></div><div class="protyle-wysiwyg"><div data-node-id="'+blockId+'"><div contenteditable="true">相同内容出现在不同板块</div></div></div><button data-type="same-control">相同按钮</button></div>';
            if(kind==='backlink') {
                pane.querySelector('.protyle-background').remove();
                const item=document.createElement('div');item.className='backlinkList__item';item.dataset.nodeId=id;item.append(pane.firstElementChild);pane.append(item);
            }
            fixture.append(pane);return pane;
        });document.body.append(fixture);
        try {
            for(const [index,pane] of panes.entries()) {
                const text=pane.querySelector('[contenteditable]'),r=rectAt(text,2),anchor=captureCursor({x:r.left+r.width/2,y:r.top+r.height/2});
                assert(anchor?.region.id===(index===0 ? id:index===1 ? 'backlink':'agentChat'),'wrong region');
                const resolved=resolveCursor(anchor);assert(resolved && near(resolved.x,r.left+r.width/2),'cursor escaped its region');
                const area=text.getBoundingClientRect(),space=captureCursor({x:area.right-3,y:r.top+3});
                assert(space?.space && space.region.id===anchor.region.id && resolveCursor(space),'space lost region');
                const selection=document.getSelection(),range=document.createRange();range.setStart(text.firstChild,1);range.setEnd(text.firstChild,4);text.focus();selection.removeAllRanges();selection.addRange(range);
                const shared=captureSelection();assert(shared.region.id===anchor.region.id && resolveSelection(shared).length===1,'selection escaped region');
                assert(captureEditing().region.id===anchor.region.id,'editing lost region');
                pane.classList.add('fn__none');assert(resolveCursor(anchor)===null && resolveSelection(shared).length===0,'hidden region matched other pane');pane.classList.remove('fn__none');
                pane.remove();assert(resolveCursor(anchor)===null && resolveCursor(space)===null,'missing region fell back to document');fixture.append(pane);
                const button=pane.querySelector('button'),b=button.getBoundingClientRect(),control=captureCursor({x:b.left+5,y:b.top+5});
                assert(control && resolveCursor(control),'region control missing '+index+' '+JSON.stringify(control)+' '+JSON.stringify(b.toJSON()));pane.remove();assert(resolveCursor(control)===null,'panel control fell back to document');fixture.append(pane);
            }
        } finally {dockModels.clear();fixture.remove();document.getSelection().removeAllRanges();}
    });
    await test('搜索标签与弹窗的普通、未引用预览隔离正文、留白、控件、选区和编辑状态',async()=>{
        const fixture=document.createElement('div');fixture.style.cssText='position:fixed;left:20px;top:20px;width:460px;height:900px;z-index:100;background:white';
        const id='20261104210000-doc0001',blockId='20261104210000-block01';
        let searchDialog;const panes=['main','tab','tab-unref','dialog','dialog-unref'].map((kind,index)=>{
            const host=kind==='dialog-unref'?searchDialog:document.createElement('div');host.style.cssText=kind.startsWith('dialog')?'height:300px':'height:150px';if(kind==='dialog')searchDialog=host;
            if(kind.startsWith('dialog')){host.className='b3-dialog';host.dataset.key='dialog-globalsearch';}else if(kind!=='main')host.className='layout-tab-container';
            const panel=document.createElement('div');panel.dataset.id='local-'+index;host.append(panel);
            panel.innerHTML='<div class="protyle" style="width:420px"><div class="protyle-background" data-node-id="'+id+'"></div><div class="protyle-title"><div class="protyle-title__input">同名标题</div></div><div class="protyle-wysiwyg" style="padding:4px"><div data-node-id="'+blockId+'"><div contenteditable="true">相同内容出现在不同预览</div></div></div><button data-type="same-control">相同按钮</button><div class="protyle-breadcrumb__space" style="height:15px"></div></div>';
            const editor=panel.firstElementChild;if(kind!=='main'){editor.classList.add('search__preview');editor.id=kind.endsWith('unref')?'searchUnRefPreview':'searchPreview';}
            fixture.append(host);return {host,editor};
        });document.body.append(fixture);
        try{
            const regions=panes.map(({editor})=>cursorRegion(editor));assert(regions.every(Boolean)&&new Set(regions.map(r=>JSON.stringify(r))).size===5,'search previews share the main document or another preview region');
            for(const [index,{host,editor}]of panes.entries()){
                const text=editor.querySelector('[contenteditable]'),r=rectAt(text,2),p={x:r.left+r.width/2,y:r.top+r.height/2},anchor=componentRoundTrip(p);
                assert(JSON.stringify(anchor.region)===JSON.stringify(regions[index]),'text lost preview region');
                const area=text.getBoundingClientRect(),space=componentRoundTrip({x:area.right-3,y:r.top+3});assert(space.space,'paragraph gap missing');
                const other=panes.find((_,i)=>i!==index).editor;assert(!matchesRegion(other,anchor.region),'anchor matches a different preview');
                const selection=document.getSelection(),range=document.createRange();range.setStart(text.firstChild,1);range.setEnd(text.firstChild,4);text.focus();selection.removeAllRanges();selection.addRange(range);
                const shared=captureSelection(),editing=captureEditing();assert(shared&&editing&&JSON.stringify(shared.region)===JSON.stringify(anchor.region)&&JSON.stringify(editing.region)===JSON.stringify(anchor.region),'selection/editing lost preview region');assert(resolveSelection(shared).length===1,'selection matches more than its preview');
                const controls=['.protyle-title__input','button','.protyle-breadcrumb__space'].map(selector=>{const e=editor.querySelector(selector),box=e.getBoundingClientRect();try{return componentRoundTrip({x:box.left+3,y:box.top+3});}catch(error){throw Error(index+' '+selector+' '+error.message);}});
                host.classList.add('fn__none');assert([anchor,space,...controls].every(a=>resolveCursor(a)===null)&&resolveSelection(shared).length===0,'hidden preview borrowed another editor');host.classList.remove('fn__none');
                host.remove();assert([anchor,space,...controls].every(a=>resolveCursor(a)===null),'removed preview borrowed another editor');fixture.append(host);
            }
            const main=panes[0];main.host.classList.add('fn__none');const text=panes[1].editor.querySelector('[contenteditable]'),r=rectAt(text,2),anchor=captureCursor({x:r.left+r.width/2,y:r.top+r.height/2});const legacy={...anchor};delete legacy.region;assert(resolveCursor(legacy)===null,'legacy main anchor borrowed a search preview');main.host.classList.remove('fn__none');
            const editor=panes[1].editor;editor.id='unidentifiedPreview';assert(cursorRegion(editor)===null,'unknown search preview became main document');editor.id='searchPreview';const host=panes[1].host;host.className='';assert(cursorRegion(editor)===null,'unhosted preview became main document');host.className='layout-tab-container';
        }finally{fixture.remove();document.getSelection().removeAllRanges();}
    });
    await test('资源搜索的同名同内容文件按路径隔离行、预览文字和留白，重排及重建索引仍匹配原文件',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='dialog-globalsearch';fixture.style.cssText='position:fixed;left:140px;top:30px;width:600px;height:480px;z-index:100;background:white';
        fixture.innerHTML='<div id="searchAssets"><div id="searchAssetList" class="search__list b3-list"></div><div id="searchAssetPreview" class="search__preview b3-typography" style="height:300px;padding:8px"><p style="white-space:pre-wrap">相同资源文字<br>最后一行。</p></div></div>';
        const list=fixture.querySelector('#searchAssetList'),preview=fixture.querySelector('#searchAssetPreview');
        const rows=['a','b'].map((name,i)=>{const e=document.createElement('div');e.dataset.type='search-item';e.dataset.id='20261104221000-asset0'+i;e.className='b3-list-item'+(i?'':' b3-list-item--focus');e.style.cssText='display:flex;height:30px';e.innerHTML='<span class="b3-list-item__text" style="width:300px">相同资源文字</span><span class="b3-list-item__meta" aria-label="assets/'+name+'/same.txt">same.txt</span>';list.append(e);return e;});
        document.body.append(fixture);
        try{
            const p=preview.firstElementChild,g=rectAt(p,2),box=p.getBoundingClientRect(),area=preview.getBoundingClientRect();
            const anchors=[{x:g.left+g.width/2,y:g.top+g.height/2},{x:box.right-3,y:g.top+g.height/2},{x:area.right-3,y:area.bottom-3}].map(point=>componentRoundTrip(point));
            const r=rows[0].lastElementChild.getBoundingClientRect(),row=componentRoundTrip({x:r.left+5,y:r.top+5});
            rows[0].classList.remove('b3-list-item--focus');rows[1].classList.add('b3-list-item--focus');preview.replaceChildren(p.cloneNode(true));
            assert(anchors.every(a=>resolveCursor(a)===null),'same-content other asset inherited preview text or blank');
            assert(resolveCursor(row),'changing preview hid an unchanged result row');
            rows[1].classList.remove('b3-list-item--focus');rows[0].classList.add('b3-list-item--focus');preview.replaceChildren(p.cloneNode(true));assert(anchors.every(a=>resolveCursor(a)),'restored original asset missing');
            list.prepend(rows[1]);rows[0].dataset.id='20261104221000-reindex';const moved=rows[0].lastElementChild.getBoundingClientRect(),actual=resolveCursor(row);assert(actual&&near(actual.x,moved.left+5)&&near(actual.y,moved.top+5),'row matched list order or transient index ID');
            rows[0].classList.add('fn__none');assert(resolveCursor(row)===null&&anchors.every(a=>resolveCursor(a)===null),'hidden selected asset borrowed another row');rows[0].classList.remove('fn__none');
            rows[0].classList.remove('b3-list-item--focus');assert(anchors.every(a=>resolveCursor(a)===null),'unidentified preview accepted');rows[0].classList.add('b3-list-item--focus');rows[1].classList.add('b3-list-item--focus');assert(anchors.every(a=>resolveCursor(a)===null),'ambiguous preview accepted');rows[1].classList.remove('b3-list-item--focus');
            rows[0].lastElementChild.setAttribute('aria-label','assets/c/same.txt');assert(resolveCursor(row)===null&&anchors.every(a=>resolveCursor(a)===null),'replaced path inherited cursor');
            rows[0].lastElementChild.setAttribute('aria-label','assets/a/same.txt');preview.classList.add('fn__none');assert(anchors.every(a=>resolveCursor(a)===null),'hidden preview drew');preview.classList.remove('fn__none');
            rows[0].dataset.id='invalid';assert(anchors.every(a=>resolveCursor(a)===null)&&captureCursor({x:g.left+g.width/2,y:g.top+g.height/2})===null,'invalid native resource identity accepted');rows[0].dataset.id='20261104221000-reindex';
            rows[0].lastElementChild.removeAttribute('aria-label');assert(anchors.every(a=>resolveCursor(a)===null),'missing resource path accepted');rows[0].lastElementChild.setAttribute('aria-label','assets/a/same.txt');
            rows[1].lastElementChild.setAttribute('aria-label','assets/a/same.txt');assert(resolveCursor(row)===null&&anchors.every(a=>resolveCursor(a)===null),'duplicate resource path accepted');
            assert(!JSON.stringify(anchors).includes('assets/'),'resource paths entered wire format');
        }finally{fixture.remove();}
    });
    await test('资源预览高亮是原生装饰，查询变化和宽度变化仍跟随本地文字与留白',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='dialog-globalsearch';fixture.style.cssText='position:fixed;left:140px;top:30px;width:600px;height:400px;z-index:100;background:white';
        fixture.innerHTML='<div id="searchAssets"><div id="searchAssetList" class="search__list"><div class="b3-list-item b3-list-item--focus" data-type="search-item" data-id="20261104221000-asset00"><span class="b3-list-item__meta" aria-label="assets/a/same.txt">same.txt</span></div></div><div id="searchAssetPreview" class="search__preview b3-typography" style="height:280px;padding:8px"><p style="white-space:pre-wrap"><mark>相同</mark>资源文字<br>最后一行。</p></div></div>';
        document.body.append(fixture);
        try{const p=fixture.querySelector('p'),g=rectAt(p,0),r=p.getBoundingClientRect();const text=componentRoundTrip({x:g.left+g.width/2,y:g.top+g.height/2}),gap=componentRoundTrip({x:g.right+(r.right-g.right)*.7,y:g.top+g.height/2});p.innerHTML='相同<mark>资源</mark>文字<br>最后一行。';fixture.style.width='420px';const after=rectAt(p,0),resolved=resolveCursor(text);assert(resolved&&near(resolved.x,after.left+after.width/2)&&near(resolved.y,after.top+after.height/2),'highlight query moved or hid a glyph');assert(resolveCursor(gap),'query decoration hid unchanged blank');}
        finally{fixture.remove();}
    });
    await test('同一资源的异步旧预览不能继承当前文字、外框留白和尾部指针，恢复后重新可见',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='dialog-globalsearch';fixture.style.cssText='position:fixed;left:140px;top:30px;width:600px;height:480px;z-index:100;background:white';
        fixture.innerHTML='<div id="searchAssets"><div id="searchAssetList" class="search__list"><div class="b3-list-item b3-list-item--focus" data-type="search-item" data-id="20261104224000-asset00"><span class="b3-list-item__meta" aria-label="assets/a/race.txt">race.txt</span></div></div><div id="searchAssetPreview" class="search__preview b3-typography" style="height:360px;padding:8px"><p style="white-space:pre-wrap">共享前缀<mark>甲</mark>资源内容。<br>甲资源第二行。</p></div></div>';document.body.append(fixture);
        try{const preview=fixture.querySelector('#searchAssetPreview'),p=preview.firstElementChild,original=p.innerHTML,r=preview.getBoundingClientRect(),box=p.getBoundingClientRect(),points=[];
            for(const x of [r.left+1,box.left-1,(r.left+r.right)/2,box.right+1,r.right-1])for(const y of [r.top+1,box.top-1,box.bottom+1,(box.bottom+r.bottom)/2,r.bottom-1])if(document.elementFromPoint(x,y)===preview)points.push({x,y});
            for(const index of [0,4,p.textContent.length-1]){const g=rectAt(p,index);points.push({x:g.left+g.width/2,y:g.top+g.height/2});}assert(points.length>10,'fixture did not cover preview whitespace');const anchors=points.map(point=>componentRoundTrip(point));
            p.innerHTML='共享前缀<mark>乙</mark>资源内容。<br>乙资源第二行。';assert(anchors.every(a=>resolveCursor(a)===null),'stale asynchronous content inherited preview cursor');
            p.innerHTML=original;assert(anchors.every(a=>resolveCursor(a)),'restored preview failed to show cursor');
            p.innerHTML='共享<mark>前缀甲</mark>资源内容。<br>甲资源第二行。';assert(anchors.every(a=>resolveCursor(a)),'highlight-only response hid the same content');
            p.innerHTML='共享前缀<mark>甲</mark>资源<br>内容。甲资源第二行。';assert(anchors.every(a=>resolveCursor(a)===null),'different explicit line breaks inherited stale preview cursor');
            p.innerHTML=original;fixture.style.width='125px';const last=rectAt(p,p.textContent.length-1),actual=resolveCursor(anchors.at(-1));assert(p.getBoundingClientRect().height>box.height,'fixture did not soft-wrap');assert(actual&&near(actual.x,last.left+last.width/2)&&near(actual.y,last.top+last.height/2),'soft wrap changed asset content identity');
        }finally{fixture.remove();}
    });
    await test('混合方向文字的视觉首尾字形和留白随字号改宽定位',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='dialog-bidi';fixture.style.cssText='position:fixed;left:30px;top:30px;background:white;z-index:100';fixture.innerHTML='<div class="b3-dialog__container"><div id="bidi-label" style="width:280px;padding:8px;font:14px/28px sans-serif">العربية (ar) 中文 English 😀</div></div>';document.body.append(fixture);
        const label=fixture.querySelector('#bidi-label'),points=()=>{const text=label.firstChild,range=document.createRange(),box=label.getBoundingClientRect();range.selectNodeContents(label);const all=range.getBoundingClientRect(),samples=[];for(const {index,segment}of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text.data)){range.setStart(text,index);range.setEnd(text,index+segment.length);const r=range.getBoundingClientRect();samples.push({x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});}samples.push({x:(box.left+all.left)/2,y:(all.top+all.bottom)/2},{x:(all.right+box.right)/2,y:(all.top+all.bottom)/2});return samples;};
        try{const anchors=points().map(point=>componentRoundTrip(point));label.style.fontSize='20px';label.style.width='350px';for(const [index,point]of points().entries()){const actual=resolveCursor(anchors[index]);assert(actual&&Math.hypot(actual.x-point.x,actual.y-point.y)<.02,'bidi glyph or gap drifted at '+index);}label.style.display='none';assert(anchors.every(anchor=>resolveCursor(anchor)===null),'hidden bidi text kept cursors');}finally{fixture.remove();}
    });
    await test('组件字形跨行后只跟随自身边界，不借用原同排相邻字符',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='wrapped-components';fixture.style.cssText='position:fixed;left:140px;top:30px;width:420px;height:400px;z-index:100;background:white';
        fixture.innerHTML='<p style="font:20px/30px monospace;word-break:break-all;white-space:pre-wrap;width:360px">abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ</p>';document.body.append(fixture);
        try{const p=fixture.firstElementChild,g=rectAt(p,19),point={x:g.left+g.width*.45,y:g.top+g.height*.5},anchor=componentRoundTrip(point);p.style.width=(g.width*19+.1)+'px';const after=rectAt(p,19),previous=rectAt(p,18),actual=resolveCursor(anchor);assert(after.top>previous.top,'fixture did not wrap chosen glyph');assert(actual&&near(actual.x,after.left+after.width*.45)&&near(actual.y,after.top+after.height*.5),'glyph borrowed a neighbor across line break');}
        finally{fixture.remove();}
    });
    await test('侧栏、状态栏和顶栏按功能定位，布局改变后命中同一控件',async()=>{
        const fixture=document.createElement('div');fixture.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:180px;background:white;z-index:100';
        fixture.innerHTML='<div><span class="dock__item" data-type="outline" style="display:inline-block;width:60px;height:40px"><svg width="24" height="24"><rect width="24" height="24"/></svg></span><span class="dock__item" data-type="file" style="display:inline-block;width:50px;height:40px">文档</span></div><div data-statusbar-entry="counter" style="width:140px">字符 12</div><button data-topbar-entry="barSync">同步</button>';
        document.body.append(fixture);
        try {
            for(const selector of ['.dock__item[data-type="outline"]','[data-statusbar-entry="counter"]','[data-topbar-entry="barSync"]']) {
                const target=fixture.querySelector(selector),r=target.getBoundingClientRect(),p={x:r.left+8,y:r.top+8};
                const anchor=captureCursor(p);assert(anchor?.surface==='ui'&&validCursor(anchor),'shared control missing');
                const spacer=document.createElement('div');spacer.style.cssText='display:inline-block;width:160px;height:20px';target.before(spacer);
                if(target.matches('.dock__item')){target.parentElement.append(target);target.dataset.id='different-local-uuid';}
                else {target.style.width='220px';target.textContent+=' 999';}
                const expected=target.getBoundingClientRect(),resolved=resolveCursor(anchor);
                assert(resolved&&near(resolved.x,expected.left+expected.width*anchor.x)&&near(resolved.y,expected.top+expected.height*anchor.y),'semantic control drift: '+selector);
                target.remove();assert(resolveCursor(anchor)===null,'missing shared control displayed cursor');spacer.remove();
            }
        } finally {fixture.remove();}
    });
    await test('标签按文档身份和子控件定位，重排与窗口 UUID 不影响位置',async()=>{
        const fixture=document.createElement('div');fixture.className='layout__wnd--active';fixture.style.cssText='position:fixed;left:20px;top:20px;width:700px;height:70px;background:white;z-index:100';
        const heads=['20261030165150-doc0001','20261030165150-other01'].map((id,index)=>{
            const head=document.createElement('div');head.dataset.type='tab-header';head.dataset.id='source-'+index;head.dataset.initdata=JSON.stringify({rootId:id});head.style.cssText='display:inline-flex;width:240px;height:40px;gap:12px;align-items:center';head.innerHTML='<span class="item__icon">图标</span><span class="item__text">同名文档</span><span class="item__close">关闭</span>';fixture.append(head);return head;
        });document.body.append(fixture);
        try {
            for(const selector of ['.item__text','.item__icon','.item__close']) {
                const element=heads[0].querySelector(selector),r=element.getBoundingClientRect(),anchor=captureCursor({x:r.left+3,y:r.top+3});
                assert(anchor?.ui.kind==='tab'&&anchor.ui.page.id==='20261030165150-doc0001','tab identity missing');
                fixture.prepend(heads[1]);heads[0].dataset.id='receiver-different-uuid';heads[0].style.width='310px';
                const expected=element.getBoundingClientRect(),resolved=resolveCursor(anchor);
                assert(resolved&&near(resolved.x,expected.left+expected.width*anchor.x)&&near(resolved.y,expected.top+expected.height*anchor.y),'wrong tab after reorder');
                heads[0].remove();assert(resolveCursor(anchor)===null,'same title matched wrong document');fixture.append(heads[0]);
            }
        } finally {fixture.remove();}
    });
    await test('设置分类不依赖当前分类，内容按所在分类且不依赖兄弟节点顺序',async()=>{
        const fixture=document.createElement('div');fixture.className='config__panel';fixture.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:180px;background:white;z-index:100';
        fixture.innerHTML='<div class="config__side"><button data-name="editor" class="b3-list-item--focus">编辑器</button><button data-name="appearance">外观</button></div><div class="config__tab-container" data-name="editor"><button class="b3-button">换行</button></div><div class="config__tab-container fn__none" data-name="appearance"><button class="b3-button">颜色</button></div>';
        document.body.append(fixture);const plugin={i18n:{pageSettings:'设置'},currentDocument:()=>null};
        const capture=element=>{const r=element.getBoundingClientRect();return captureCursor({x:r.left+5,y:r.top+5},plugin);};
        try {
            const nav=fixture.querySelector('[data-name="appearance"]'),anchor=capture(nav);
            fixture.querySelector('[data-name="editor"]').classList.remove('b3-list-item--focus');nav.classList.add('b3-list-item--focus');
            assert(resolveCursor(anchor,plugin),'nav did not survive category change');
            const panel=fixture.querySelector('.config__tab-container[data-name="editor"]'),button=panel.querySelector('button'),content=capture(button);
            assert(content?.ui.kind==='settings','settings content not scoped');
            const sibling=document.createElement('button');sibling.textContent='新增';button.before(sibling);
            const r=button.getBoundingClientRect(),resolved=resolveCursor(content,plugin);
            assert(resolved&&near(resolved.x,r.left+r.width*content.x),'settings content followed child index');
            panel.classList.add('fn__none');assert(resolveCursor(content,plugin)===null,'hidden settings section displayed cursor');
        } finally {fixture.remove();}
    });
    await test('原生日历按日期、事件、字段和可见周片段定位，切月与重排不串位',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:25px;top:25px;width:650px;height:560px;z-index:100;background:white';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261104140000-caldoc1"></div><div class="protyle-wysiwyg" style="padding:0"><div data-type="NodeAttributeView" data-av-type="calendar" data-node-id="20261104140000-calblk1" data-av-id="20261104140000-caldata" contenteditable="false"><div class="av__header" data-current-view-id="20261104140000-calview"></div><div class="av__calendar"><div class="av__calendar-toolbar"><button data-calendar-action="previous">‹</button><button data-calendar-action="next">›</button></div><div class="av__calendar-weekdays" style="display:flex;gap:30px"><div class="av__calendar-week-label">周</div><div>周一</div><div>周二</div><div>周三</div><div>周四</div><div>周五</div><div>周六</div><div>周日</div></div><div class="av__body av__calendar-grid" data-group-id=""></div></div></div></div>';
        const grid=fixture.querySelector('.av__calendar-grid'),start=new Date(2026,10,2).getTime(),day=86400000;
        for(let w=0;w<2;w++){
            const row=document.createElement('div');row.className='av__calendar-week-row';row.style.display='flex';row.innerHTML='<span class="av__calendar-week-number" style="width:30px">'+(45+w)+'</span><div class="av__calendar-week" data-calendar-week="'+(start+w*7*day)+'" style="width:600px"><div class="av__calendar-days" style="display:flex"></div><div class="av__calendar-events"></div></div>';
            const days=row.querySelector('.av__calendar-days');for(let d=0;d<7;d++){const date=start+(w*7+d)*day;days.insertAdjacentHTML('beforeend','<div class="av__calendar-day" data-calendar-day="'+date+'" style="width:80px;height:60px;flex-shrink:0"><span>'+new Date(date).getDate()+'</span><button data-calendar-add="'+date+'">+</button></div>');}
            const events=row.querySelector('.av__calendar-events');for(let e=1;e<=2;e++)events.insertAdjacentHTML('beforeend','<div class="av__calendar-item av__calendar-item--start av__calendar-item--end" data-id="20261104140000-event0'+e+'" role="button" style="height:40px;width:300px"><div class="av__calendar-item-content"><div class="av__calendar-field" data-field-id="20261104140000-field01" data-col-id="20261104140000-field01"><span>同名事件</span></div></div></div>');grid.append(row);
        }document.body.append(fixture);
        const point=e=>{const r=e.getBoundingClientRect();return {x:r.left+8,y:r.top+8};},check=(anchor,e)=>{const p=resolveCursor(anchor),q=point(e);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,'calendar target drift: '+e.className);};
        try{
            const weeks=[...grid.querySelectorAll('.av__calendar-week')],date=weeks[0].querySelectorAll('.av__calendar-day')[2],dr=date.getBoundingClientRect();
            const blank=componentRoundTrip({x:dr.left+65,y:dr.top+50});assert(blank.ui.scope.kind==='calendar','calendar whitespace has no date identity');
            const event=weeks[0].querySelector('.av__calendar-item'),field=event.querySelector('.av__calendar-field'),label=field.firstElementChild,anchor=componentRoundTrip(point(label)),weekLabel=weeks[0].previousElementSibling,weekAnchor=componentRoundTrip(point(weekLabel));
            const next=fixture.querySelector('[data-calendar-action="next"]'),nextAnchor=componentRoundTrip(point(next));
            weeks[0].parentElement.parentElement.prepend(weeks[1].parentElement);date.parentElement.prepend(date);event.parentElement.append(event);fixture.querySelector('.av__calendar-toolbar').prepend(next);
            check(anchor,label);check(weekAnchor,weekLabel);check(nextAnchor,next);let r=date.getBoundingClientRect(),p=resolveCursor(blank);assert(p&&Math.hypot(p.x-r.left-65,p.y-r.top-50)<.6,'date reorder lost whitespace');
            const otherField=document.createElement('div');otherField.className='av__calendar-field';otherField.dataset.fieldId='20261104140000-field02';otherField.textContent='其他字段';field.before(otherField);check(anchor,label);otherField.remove();
            const duplicated=event.cloneNode(true);event.after(duplicated);assert(resolveCursor(anchor)===null,'duplicate event segment guessed');duplicated.remove();
            event.remove();assert(resolveCursor(anchor)===null,'another visible week segment inherited pointer');weeks[0].querySelector('.av__calendar-events').append(event);check(anchor,label);
            event.classList.remove('av__calendar-item--start');check(anchor,label);event.style.opacity='0';assert(resolveCursor(anchor)===null,'transparent calendar event painted');event.style.opacity='1';
            const old=date.dataset.calendarDay;date.dataset.calendarDay=String(+old+28*day);assert(resolveCursor(blank)===null,'next month inherited previous date whitespace');date.dataset.calendarDay=old;
            for(const week of weeks){const days=week.querySelector('.av__calendar-days');[...days.children].sort((a,b)=>+a.dataset.calendarDay-+b.dataset.calendarDay).forEach(day=>days.append(day));}
            const weekdays=[...fixture.querySelectorAll('.av__calendar-weekdays > div:not(.av__calendar-week-label)')],weekday=weekdays[0],weekdayAnchor=componentRoundTrip(point(weekday));
            weekday.parentElement.insertBefore(weekdays[6],weekday);for(const week of weeks)week.dataset.calendarWeek=String(+week.dataset.calendarWeek-day);for(const days of grid.querySelectorAll('.av__calendar-days')){const sunday=document.createElement('div');sunday.className='av__calendar-day';sunday.dataset.calendarDay=String(+days.firstElementChild.dataset.calendarDay-day);days.prepend(sunday);}check(weekdayAnchor,weekday);
            const undated=document.createElement('div');undated.className='av__calendar-undated-list';undated.style.cssText='position:absolute;top:0;right:0;width:120px;background:white';
            undated.innerHTML='<div class="av__calendar-undated-item" role="button" data-calendar-undated-row="20261104140000-undated"><span>同名</span></div><div class="av__calendar-undated-item" role="button" data-calendar-undated-row="20261104140000-otherid"><span>同名</span></div>';fixture.querySelector('.av__calendar').append(undated);
            const undatedRow=undated.firstElementChild,undatedLabel=undatedRow.firstElementChild,undatedAnchor=componentRoundTrip(point(undatedLabel));undated.append(undatedRow);check(undatedAnchor,undatedLabel);undatedRow.remove();assert(resolveCursor(undatedAnchor)===null,'same-name undated item inherited missing row');
            fixture.querySelector('.av__header').dataset.currentViewId='20261104140000-othview';assert(resolveCursor(blank)===null&&resolveCursor(anchor)===null,'different calendar view inherited pointer');
        }finally{fixture.remove();}
    });
    await test('原生卡片封面区分透明占位图后的不同背景图案，穿透图片时也不误画',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:25px;top:25px;width:300px;height:220px;z-index:100;background:white';fixture.innerHTML='<div class="protyle-background" data-node-id="20261104142000-bgdoc01"></div><div class="protyle-wysiwyg" style="padding:0"><div data-type="NodeAttributeView" data-node-id="20261104142000-bgblock" data-av-id="20261104142000-bgdata1" contenteditable="false"><div class="av__gallery-item" data-id="20261104142000-row0001"><div class="av__gallery-cover" style="width:240px;height:160px"><img class="av__gallery-img" style="width:100%;height:100%;background:linear-gradient(45deg,red,blue)"></div></div></div></div>';
        document.body.append(fixture);const image=fixture.querySelector('img');image.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';await image.decode();
        try{
            const point={x:100,y:100};
            for(const pointerEvents of ['auto','none']){image.style.pointerEvents=pointerEvents;const anchor=componentRoundTrip(point),background=image.style.background;image.style.background='linear-gradient(45deg,green,yellow)';assert(resolveCursor(anchor)===null,'different native cover pattern inherited pointer');image.style.background=background;assert(resolveCursor(anchor),'restored cover did not restore pointer');}
            image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="blue"/></svg>');await image.decode();
            const cover=image.parentElement;cover.style.overflow='hidden';image.style.objectFit='cover';image.style.objectPosition='50% 50%';
            const r=cover.getBoundingClientRect(),center=componentRoundTrip({x:r.left+120,y:r.top+80}),edge=componentRoundTrip({x:r.left+4,y:r.top+80});
            assert(center.ui.imagePoint&&edge.ui.imagePoint,'pointer-transparent native cover lost image pixels');
            cover.style.height='240px';image.style.objectPosition='80% 25%';
            const moved=resolveCursor(center);assert(moved&&near(moved.x,r.left+48)&&near(moved.y,r.top+120),'native cover pixel followed container fraction');
            assert(resolveCursor(edge)===null,'cropped native cover pixel painted');image.style.opacity='0';assert(resolveCursor(center)===null,'transparent native cover image painted');
        }finally{fixture.remove();}
    });
    await test('悬停按钮透明和隐藏但仍占位时保留相邻留白，按钮自身继续隐藏',async()=>{
        const fixture=document.createElement('div');fixture.id='hover-layout-gap';fixture.style.cssText='position:fixed;left:25px;top:25px;width:200px;height:110px;z-index:100;background:white';fixture.innerHTML='<button data-type="hover-control" style="position:absolute;left:40px;top:10px;width:70px;height:30px">操作</button>';document.body.append(fixture);
        try{
            const button=fixture.firstElementChild,point={x:85,y:95},blank=componentRoundTrip(point),control=componentRoundTrip({x:90,y:45});
            for(const state of ['opacity','visibility']){
                button.style[state]=state==='opacity'?'0':'hidden';const mapped=resolveCursor(blank);assert(mapped&&Math.hypot(mapped.x-point.x,mapped.y-point.y)<.6,'transparent layout boundary lost whitespace');assert(resolveCursor(control)===null,'invisible hover button painted');button.style[state]='';
            }
            button.style.display='none';assert(resolveCursor(blank)===null,'removed layout boundary was guessed');button.style.display='';assert(resolveCursor(blank),'restored boundary did not restore whitespace');
        }finally{fixture.remove();}
    });
    await test('原生看板栏目标题、卡片字段和空白按分组定位，同名重排与折叠不串位',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:25px;top:25px;width:650px;height:500px;z-index:100;background:white';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261104141000-kbdoc01"></div><div class="protyle-wysiwyg" style="padding:0"><div data-type="NodeAttributeView" data-node-id="20261104141000-kbblock" data-av-id="20261104141000-kbdata1" data-av-type="kanban" contenteditable="false"><div class="av__kanban" style="display:flex;gap:20px"></div></div></div>';
        const board=fixture.querySelector('.av__kanban');
        for(const group of ['20261104141000-group01','20261104141000-group02'])board.insertAdjacentHTML('beforeend','<div class="av__kanban-group" data-group-id="'+group+'" style="width:260px"><div class="av__group-title" style="height:40px"><span class="av__group-name">同名栏目</span><span class="av__group-counter">1</span></div><div class="av__body" data-group-id="'+group+'" style="padding:8px;min-height:170px"><div class="av__gallery"><div class="av__gallery-item" data-id="20261104141000-row0001" style="height:120px;padding:8px"><div class="av__gallery-fields"><div class="av__gallery-field"><div class="av__gallery-name">同名字段</div><div class="av__cell" data-field-id="20261104141000-col0001"><span>同名内容</span></div></div></div></div></div></div></div>');
        document.body.append(fixture);const column=board.firstElementChild,title=column.querySelector('.av__group-name'),body=column.querySelector('.av__body'),card=column.querySelector('.av__gallery-item'),field=column.querySelector('.av__gallery-name');
        const at=(e,x=8,y=10)=>{const r=e.getBoundingClientRect();return {x:r.left+x,y:r.top+y};},check=(a,e,x=8,y=10)=>{const p=resolveCursor(a),q=at(e,x,y);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,'kanban target lost or drifted: '+e.className);};
        try{
            const titleAnchor=componentRoundTrip(at(title)),fieldAnchor=componentRoundTrip(at(field)),blank=componentRoundTrip(at(card,230,110));assert(titleAnchor.ui.scope.part==='group-title','native kanban title has no column identity');
            board.append(column);check(titleAnchor,title);check(fieldAnchor,field);check(blank,card,230,110);
            body.style.display='none';check(titleAnchor,title);assert(resolveCursor(fieldAnchor)===null&&resolveCursor(blank)===null,'collapsed column jumped to visible duplicate card');body.style.display='';
            title.style.opacity='0';assert(resolveCursor(titleAnchor)===null,'transparent column title painted');title.style.opacity='1';
            const label=column.querySelector('.av__group-title'),clone=label.cloneNode(true);label.after(clone);assert(resolveCursor(titleAnchor)===null,'duplicate kanban header guessed');clone.remove();
            column.dataset.groupId='20261104141000-othergp';assert(resolveCursor(titleAnchor)===null,'another same-name column inherited title');column.dataset.groupId='20261104141000-group01';
            column.style.height='480px';const bounds=column.getBoundingClientRect(),content=body.getBoundingClientRect(),outerPoint={x:bounds.right-5,y:bounds.bottom-4},outer=componentRoundTrip(outerPoint);assert(!outer.ui.textHash,'column whitespace froze all descendant text');
            const ratio=(outerPoint.y-content.bottom)/(bounds.bottom-content.bottom),extra=card.cloneNode(true);extra.dataset.id='20261104141000-row0002';extra.querySelector('.av__cell').textContent='另一张卡片';card.after(extra);
            let mapped=resolveCursor(outer),after=column.getBoundingClientRect(),end=body.getBoundingClientRect().bottom;assert(mapped&&Math.hypot(mapped.x-outerPoint.x,mapped.y-(end+(after.bottom-end)*ratio))<.6,'unrelated card changed column gap identity');extra.remove();
            column.remove();assert(resolveCursor(titleAnchor)===null,'missing column title moved to another group');
        }finally{fixture.remove();}
    });
    await test('数据库分组标题、表头、汇总、行按钮和留白按身份匹配，重排冻结不丢失或串位',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:25px;top:25px;width:650px;height:580px;z-index:100;background:white';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261104132000-dbdoc01"></div><div class="protyle-wysiwyg" style="padding:0"><div data-type="NodeAttributeView" data-node-id="20261104132000-dbblock" data-av-id="20261104132000-dbdata1" contenteditable="false"><div class="av__scroll"></div></div></div>';
        const av=fixture.querySelector('[data-av-id]'),scroll=fixture.querySelector('.av__scroll');
        const groups=['20261104132000-group01','20261104132000-group02'].map(id=>{
            const title=document.createElement('div');title.className='av__group-title';title.style.cssText='height:32px;display:flex';title.innerHTML='<span data-type="av-group-fold" data-id="'+id+'" style="width:24px">›</span><span class="av__group-name">同组名</span>';
            const body=document.createElement('div');body.className='av__body';body.dataset.groupId=id;
            body.innerHTML='<div class="av__row av__row--header" style="height:36px;display:flex"><div class="av__colsticky"><div class="av__firstcol" style="width:24px">□</div></div><div class="av__cell av__cell--header" data-col-id="20261104132000-col0001" style="width:200px"><span class="av__celltext">同字段</span></div></div><div class="av__row" data-id="20261104132000-row0001" style="display:flex;height:54px"><div class="av__colsticky"><div class="av__firstcol" style="width:24px">□</div></div><div class="av__cell" data-col-id="20261104132000-col0001" style="width:200px"><span class="av__celltext">同内容</span></div></div><div class="av__row--footer" style="height:32px;display:flex"><div class="av__calc" data-col-id="20261104132000-col0001" style="width:200px"><small>计算</small></div></div>';
            scroll.append(title,body);return {title,body};
        });for(const frozen of fixture.querySelectorAll('.av__colsticky'))frozen.style.display='flex';document.body.append(fixture);
        const at=(element,x=8,y=10)=>{const r=element.getBoundingClientRect();return {x:r.left+x,y:r.top+y};};
        const check=(anchor,element,x=8,y=10)=>{const p=resolveCursor(anchor),expected=at(element,x,y);assert(p&&Math.hypot(p.x-expected.x,p.y-expected.y)<.6,'wrong or missing '+element.className+': '+JSON.stringify(p));};
        try{
            const group=groups[0],title=group.title.querySelector('.av__group-name'),header=group.body.querySelector('.av__cell--header'),label=header.firstElementChild,calc=group.body.querySelector('.av__calc'),row=group.body.querySelector('.av__row[data-id]'),control=row.querySelector('.av__firstcol'),cell=row.querySelector('.av__cell');
            const anchors={title:componentRoundTrip(at(title)),header:componentRoundTrip(at(label)),calc:componentRoundTrip(at(calc.firstElementChild)),control:componentRoundTrip(at(control)),blank:componentRoundTrip(at(row,620,45)),cell:componentRoundTrip(at(cell.firstElementChild))};
            for(const anchor of Object.values(anchors).filter(anchor=>anchor.ui.scope.part))assert(resolveCursor({...anchor,ui:{...anchor.ui,scope:{...anchor.ui.scope,part:undefined,group:undefined}}})===null,'old receiver guessed a database region as a cell');
            scroll.prepend(groups[1].title,groups[1].body);
            check(anchors.title,title);check(anchors.header,label);check(anchors.calc,calc.firstElementChild);check(anchors.control,control);check(anchors.blank,row,620,45);check(anchors.cell,cell.firstElementChild);
            group.body.querySelector('.av__row--header').classList.add('av__row--header--fixed');
            const headerFrozen=header.parentElement.querySelector('.av__colsticky');headerFrozen.append(header);headerFrozen.classList.add('av__colsticky--freeze');
            const rowFrozen=row.querySelector('.av__colsticky');row.prepend(control);rowFrozen.remove();
            check(anchors.header,label);check(anchors.calc,calc.firstElementChild);check(anchors.control,control);check(anchors.blank,row,620,45);
            group.body.style.display='none';assert(resolveCursor(anchors.header)===null&&resolveCursor(anchors.cell)===null,'collapsed group kept body pointers');check(anchors.title,title);group.body.style.display='';
            group.title.style.opacity='0';assert(resolveCursor(anchors.title)===null,'transparent group title painted');group.title.style.opacity='1';
            group.body.dataset.groupId='20261104132000-othergp';assert(resolveCursor(anchors.header)===null,'header matched another group');group.body.dataset.groupId='20261104132000-group01';
            const duplicate=header.cloneNode(true);header.after(duplicate);assert(resolveCursor(anchors.header)===null,'duplicate header guessed');duplicate.remove();
            fixture.querySelector('.protyle-background').dataset.nodeId='20261104132000-otherdc';assert(Object.values(anchors).every(anchor=>resolveCursor(anchor)===null),'database regions crossed documents');
        }finally{fixture.remove();}
    });
    await test('数据库单元格按数据库、行与列定位，重排、冻结、过滤和切换可见布局不串位',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:35px;top:35px;width:650px;height:450px;z-index:100;background:white';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261104130000-dbdoc01"></div><div class="protyle-wysiwyg" style="padding:0"><div data-type="NodeAttributeView" data-node-id="20261104130000-dbblock" data-av-id="20261104130000-dbdata1" data-av-type="table" contenteditable="false"><div class="av__container"><div class="av__body" style="height:220px;overflow:auto"></div></div></div></div>';
        const database=fixture.querySelector('[data-av-id]'),body=fixture.querySelector('.av__body');
        const rows=['20261104130000-row0001','20261104130000-row0002'].map(id=>{const row=document.createElement('div');row.className='av__row';row.dataset.id=id;row.style.cssText='display:flex;height:72px';for(const col of ['20261104130000-col0001','20261104130000-col0002']){const cell=document.createElement('div');cell.className='av__cell';cell.dataset.colId=col;cell.dataset.id=id.slice(0,-1)+col.at(-1);cell.style.cssText='width:220px;flex-shrink:0;padding:8px;box-sizing:border-box';cell.innerHTML='<span class="av__celltext">相同内容</span>';row.append(cell);}body.append(row);return row;});
        document.body.append(fixture);const cell=rows[0].children[1],label=cell.firstElementChild;
        const point=()=>{const r=label.getBoundingClientRect();return {x:r.left+15,y:r.top+10};};
        try{
            const anchor=componentRoundTrip(point());assert(anchor.ui?.scope.kind==='av','database text used whole-block character offsets');
            const cr=cell.getBoundingClientRect(),blank=componentRoundTrip({x:cr.right-12,y:cr.bottom-8});
            body.prepend(rows[1]);rows[0].prepend(cell);cell.style.width='270px';
            let actual=resolveCursor(anchor),expected=point();assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'row or column reordering changed cell');
            const blankAfter=resolveCursor(blank),after=cell.getBoundingClientRect();assert(blankAfter&&blankAfter.x>after.left&&blankAfter.x<after.right&&blankAfter.y>after.top&&blankAfter.y<after.bottom,'cell blank moved to another row');
            const frozen=document.createElement('div');frozen.className='av__colsticky';rows[0].prepend(frozen);frozen.append(cell);actual=resolveCursor(anchor);expected=point();assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'frozen column wrapper broke cell identity');
            const spare=rows[0].querySelector('.av__cell:not([data-col-id="20261104130000-col0002"])');spare.remove();assert(resolveCursor(anchor),'unrelated hidden column removed target');
            rows[0].style.display='none';assert(resolveCursor(anchor)===null,'filtered row painted');rows[0].style.display='';
            cell.style.opacity='0';assert(resolveCursor(blank)===null,'transparent database cell painted');cell.style.opacity='1';
            const clone=rows[1].cloneNode(true);rows[0].replaceWith(clone);assert(resolveCursor(anchor)===null,'virtual row reuse inherited another item pointer');clone.replaceWith(rows[0]);
            database.dataset.avType='gallery';rows[0].className='av__gallery-item';cell.dataset.fieldId=cell.dataset.colId;delete cell.dataset.colId;assert(resolveCursor(anchor),'same visible gallery field did not match');
            const field=document.createElement('div');field.className='av__gallery-field';const name=document.createElement('span');name.className='av__gallery-name';name.textContent='字段名称';field.append(name,cell);rows[0].append(field);
            const nr=name.getBoundingClientRect(),fieldAnchor=componentRoundTrip({x:nr.left+8,y:nr.top+8});assert(fieldAnchor.ui.scope.part==='field','gallery field label was not identified');rows[0].prepend(field);assert(resolveCursor(fieldAnchor),'field wrapper reorder lost its label');
            assert(resolveCursor({...fieldAnchor,ui:{...fieldAnchor.ui,scope:{...fieldAnchor.ui.scope,part:undefined,group:undefined}}})===null,'old receiver drew a field label inside its value cell');
            name.style.opacity='0';assert(resolveCursor(fieldAnchor)===null,'hidden field name painted');name.style.opacity='1';
            const duplicate=cell.cloneNode(true);frozen.append(duplicate);assert(resolveCursor(anchor)===null,'ambiguous repeated database field guessed');duplicate.remove();
            database.dataset.avId='20261104130000-otherdb';assert(resolveCursor(anchor)===null,'another database inherited pointer');database.dataset.avId='20261104130000-dbdata1';
            fixture.querySelector('.protyle-background').dataset.nodeId='20261104130000-otherdc';assert(resolveCursor(anchor)===null,'database pointer crossed documents');
        }finally{fixture.remove();}
    });
    await test('原生搜索提示按结果文档和动作匹配，同名重排、替换与隐藏不串位',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:25px;top:25px;width:500px;height:310px;z-index:100;background:white';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261104143000-hintdoc"></div><div class="protyle-hint"><div class="hint-results"></div></div>';const list=fixture.querySelector('.hint-results');
        const rows=['20261104143000-hint001','20261104143000-hint002'].map(id=>{const row=document.createElement('button');row.className='b3-list-item b3-list-item--two';row.style.cssText='display:block;position:relative;width:460px;height:70px;padding:4px;text-align:left';row.innerHTML='<div class="b3-list-item__first" data-node-id="'+id+'" style="height:30px;width:90%"><svg width="18" height="18"><use href="#iconFile"></use></svg><span class="b3-list-item__text">同名结果</span></div><div class="b3-list-item__meta" style="width:90%">相同路径/</div>';list.append(row);return row;});
        const actions=['newSubDoc','newFileAtPath'].map(action=>{const row=document.createElement('button');row.className='b3-list-item';row.type='button';row.dataset.value='(('+action+' private-query))';row.style.cssText='display:block;width:460px;height:35px';row.textContent='同名动作';list.append(row);return row;});document.body.append(fixture);
        try{
            const samples=[];for(const root of [...rows.flatMap(row=>[row,row.firstElementChild,row.querySelector('span'),row.querySelector('.b3-list-item__meta')]),...actions]){const r=root.getBoundingClientRect(),offset=root.matches('button')?{x:r.width-2,y:r.height-2}:{x:4,y:r.height/2};samples.push({root,offset,anchor:componentRoundTrip({x:r.left+offset.x,y:r.top+offset.y})});}
            let phase='reorder';const check=sample=>{const point=resolveCursor(sample.anchor),r=sample.root.getBoundingClientRect();assert(point&&near(point.x,r.left+sample.offset.x)&&near(point.y,r.top+sample.offset.y),'hint result '+phase+' '+sample.root.className+': '+JSON.stringify({point,expected:{x:r.left+sample.offset.x,y:r.top+sample.offset.y}}));};
            for(const row of [...list.children])list.prepend(row);samples.forEach(check);
            const label=rows[0].querySelector('.b3-list-item__text'),labelSample=samples.find(sample=>sample.root===label);
            phase='insert highlight';label.innerHTML='<mark>同名</mark>结果';samples.forEach(check);
            const lr=label.getBoundingClientRect(),marked=componentRoundTrip({x:lr.left+labelSample.offset.x,y:lr.top+labelSample.offset.y});assert(marked.ui.textHash,'highlight text did not retain character geometry');
            phase='move highlight';label.innerHTML='同<mark>名结</mark>果';check({...labelSample,anchor:marked});phase='full highlight';label.innerHTML='<mark>同名结果</mark>';check({...labelSample,anchor:marked});
            label.querySelector('mark').style.opacity='0';assert(resolveCursor(marked)===null,'transparent highlight text painted');label.innerHTML='同名结果';check({...labelSample,anchor:marked});
            assert(!JSON.stringify(samples.map(sample=>sample.anchor)).includes('private-query'),'hint query leaked into wire');
            const original=rows[0].firstElementChild.dataset.nodeId;rows[0].firstElementChild.dataset.nodeId='20261104143000-replace';assert(resolveCursor(samples[0].anchor)===null,'replacement same-name result inherited row whitespace');rows[0].firstElementChild.dataset.nodeId=original;
            rows[0].style.opacity='0';assert(resolveCursor(samples[0].anchor)===null,'transparent search result painted');rows[0].style.opacity='1';samples.forEach(check);
            const duplicate=rows[0].cloneNode(true);list.append(duplicate);assert(resolveCursor(samples[0].anchor)===null,'duplicate document result guessed');duplicate.remove();
            const host=fixture.querySelector('.protyle-background');host.dataset.nodeId='20261104143000-otherdc';assert(resolveCursor(samples[0].anchor)===null,'binding hint crossed host documents');host.dataset.nodeId='20261104143000-hintdoc';
            rows[0].remove();assert(resolveCursor(samples[0].anchor)===null,'missing result moved to same-name sibling');samples.slice(4).forEach(check);
        }finally{fixture.remove();}
    });
    await test('普通搜索文字、路径及数据库字段跨查询高亮范围继续定位',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='search-highlight';fixture.style.cssText='position:fixed;left:25px;top:25px;width:500px;height:240px;z-index:100;background:white';fixture.innerHTML='<div class="search__list b3-list"><div data-type="search-item" data-node-id="20261104201500-result1" class="b3-list-item" style="height:220px"><span class="b3-list-item__text" style="display:block;width:400px;height:50px">同名结果</span><span class="b3-list-item__meta" style="display:block;width:400px;height:50px">同名路径</span><span data-av-search-match="{&quot;itemID&quot;:&quot;20261104201500-row0001&quot;,&quot;keyID&quot;:&quot;20261104201500-col0001&quot;}" style="display:block;width:400px;height:50px">同名字段</span></div></div>';document.body.append(fixture);
        const labels=[...fixture.querySelectorAll('.b3-list-item__text,.b3-list-item__meta,[data-av-search-match]')],point=(e,index)=>{const c=characterAt(e,index),r=characterRect(c.node,c.offset);return {x:r.left+r.width/2,y:r.top+r.height/2};};
        try{for(const e of labels){const text=e.textContent,samples=[0,1,3].map(index=>({index,anchor:componentRoundTrip(point(e,index))}));e.innerHTML='<mark>'+text.slice(0,2)+'</mark>'+text.slice(2);samples.push({index:0,anchor:componentRoundTrip(point(e,0))});e.innerHTML=text[0]+'<mark>'+text[1]+'</mark>'+text.slice(2);for(const s of samples){const p=resolveCursor(s.anchor),q=point(e,s.index);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.01,'search highlight changed semantic character');}e.innerHTML='<mark>'+text+'</mark>';e.querySelector('mark').style.opacity='0';for(const s of samples)assert(resolveCursor(s.anchor)===null,'transparent search highlight painted');e.textContent=text;for(const s of samples)assert(resolveCursor(s.anchor),'removed search highlight lost text');}}
        finally{fixture.remove();}
    });
    await test('搜索引用计数变化保留结果行留白，变化数字不继承旧指针',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='search-count';fixture.style.cssText='position:fixed;left:25px;top:25px;width:500px;height:150px;z-index:100;background:white';fixture.innerHTML='<div class="search__list b3-list"><div data-type="search-item" data-node-id="20261104201500-result1" class="b3-list-item" style="position:relative;width:450px;height:60px"><span class="b3-list-item__text" style="display:inline-block;width:200px">同名结果</span><span class="counter" style="display:inline-block;width:70px">2</span></div></div>';document.body.append(fixture);const row=fixture.querySelector('[data-type="search-item"]'),counter=fixture.querySelector('.counter'),r=row.getBoundingClientRect(),c=counter.getBoundingClientRect(),p={x:r.right-3,y:r.bottom-3};
        try{const blank=componentRoundTrip(p),number=componentRoundTrip({x:c.left+3,y:c.top+c.height/2});for(const text of ['3','12345']){counter.textContent=text;const actual=resolveCursor(blank);assert(actual&&Math.hypot(actual.x-p.x,actual.y-p.y)<.01,'search count invalidated row blank');assert(resolveCursor(number)===null,'changed count inherited old pointer');}counter.textContent='2';assert(resolveCursor(number),'restored count disappeared');}finally{fixture.remove();}
    });
    await test('数据库搜索同名字段按原生行列身份匹配，范围变化不换字段',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='search-match';fixture.style.cssText='position:fixed;left:25px;top:25px;width:500px;height:150px;z-index:100;background:white';fixture.innerHTML='<div class="search__list b3-list"><div data-type="search-item" data-node-id="20261104201500-dbblock" class="b3-list-item"><span class="b3-list-item__text search__av-content"><span class="fn__code">同名列</span><span data-av-search-match="{&quot;itemID&quot;:&quot;20261104201500-row0001&quot;,&quot;keyID&quot;:&quot;20261104201500-col0001&quot;,&quot;text&quot;:&quot;同名字段&quot;,&quot;ranges&quot;:[[0,2]]}" style="display:inline-block;width:300px;height:50px">同名字段</span></span></div></div>';document.body.append(fixture);const field=fixture.querySelector('[data-av-search-match]'),original=JSON.parse(field.getAttribute('data-av-search-match')),point=()=>{const r=field.getBoundingClientRect();return {x:r.left+8,y:r.top+12};},set=value=>field.setAttribute('data-av-search-match',JSON.stringify(value));
        try{const anchor=componentRoundTrip(point()),label=fixture.querySelector('.fn__code'),lr=label.getBoundingClientRect(),caption=componentRoundTrip({x:lr.left+4,y:lr.top+lr.height/2});set({...original,ranges:[[1,2]],text:'other query decoration'});assert(resolveCursor(anchor),'query metadata invalidated same database field');for(const value of [{...original,itemID:'20261104201500-row0002'},{...original,keyID:'20261104201500-col0002'},{...original,itemID:'invalid'}]){set(value);assert(resolveCursor(anchor)===null,'another same-name search field inherited pointer');assert(resolveCursor(caption)===null,'search field caption inherited another field');}field.setAttribute('data-av-search-match','{');assert(captureCursor(point())===null,'malformed field acquired generic pointer');set(original);assert(resolveCursor(anchor),'restored database search field did not resolve');const frame=document.createElement('iframe');frame.style.cssText='position:fixed;left:550px;top:25px;width:300px;height:100px';frame.srcdoc='<div class="search__list"><span data-av-search-match="{}">同名字段</span></div>';const loaded=new Promise(resolve=>frame.onload=resolve);fixture.append(frame);await loaded;const r=frame.getBoundingClientRect();assert(captureCursor({x:r.left+frame.clientLeft+15,y:r.top+frame.clientTop+15})===null,'embedded invalid search field acquired a pointer');}
        finally{fixture.remove();}
    });
    await test('标签完整路径和书签组身份独立于计数、嵌套列表顺序及同名叶节点',async()=>{
        for(const kind of ['tag','bookmark','outline']){
            const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get(kind);
            fixture.className='sy__'+kind+' dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:300px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type=kind;
            const attribute=kind==='tag'?'data-label':kind==='outline'?'data-node-id':'data-bookmark';
            fixture.innerHTML='<ul class="b3-list" style="padding:4px 0 10px;margin:0"></ul>';const list=fixture.firstElementChild;
            for(const name of ['甲','乙'])list.insertAdjacentHTML('beforeend','<li class="b3-list-item" data-treetype="'+kind+'" '+attribute+'="private-root-'+name+'" style="display:flex;align-items:center;height:34px"><span class="b3-list-item__toggle"><svg class="b3-list-item__arrow b3-list-item__arrow--open" width="16" height="16"><rect width="16" height="16"/></svg></span><span class="b3-list-item__text" style="width:130px">'+name+'</span><span class="counter">2</span></li><ul style="margin:0;padding-left:20px"><li class="b3-list-item" data-treetype="'+kind+'" '+(kind==='tag'?'data-label="private-root-'+name+'/同名"':'data-node-id="20261104170000-child0'+(name==='甲'?'1':'2')+'"')+' style="display:flex;align-items:center;height:34px"><span class="b3-list-item__text" style="width:130px">同名</span><span class="counter">1</span></li></ul>');
            document.body.append(fixture,dock);dockModels.set(kind,{parent:{panelElement:fixture}});
            const groups=[...list.children].filter(e=>e.tagName==='LI'),nested=groups.map(e=>e.nextElementSibling),leaf=nested.map(e=>e.firstElementChild),point=(e,blank)=>{const r=e.getBoundingClientRect();return {x:blank?r.right-3:r.left+4,y:r.top+12};};
            try{
                const samples=[...groups,...leaf].flatMap(row=>[{root:row,blank:true},{root:row.querySelector('.b3-list-item__text'),blank:false}]).map(s=>({...s,anchor:componentRoundTrip(point(s.root,s.blank))}));
                const lr=list.getBoundingClientRect(),tailPoint={x:lr.left+lr.width/2,y:lr.bottom-2},tail=componentRoundTrip(tailPoint),arrow=groups[0].querySelector('svg'),arrowAnchor=componentRoundTrip(point(arrow,false));
                assert(samples.every(s=>!JSON.stringify(s.anchor).includes('private-root-')),'tree identity leaked raw paths');
                for(const i of [1,0]){list.append(groups[i],nested[i]);}
                const check=s=>{const p=resolveCursor(s.anchor),q=point(s.root,s.blank);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,kind+' nested group followed sibling order '+JSON.stringify({html:s.root.outerHTML,p,q,anchor:s.anchor}));};samples.forEach(check);const tailResolved=resolveCursor(tail);assert(tailResolved&&Math.hypot(tailResolved.x-tailPoint.x,tailResolved.y-tailPoint.y)<.6,'tree list perimeter followed previous group');
                const counter=groups[0].lastElementChild,counterAnchor=componentRoundTrip(point(counter,false));counter.textContent='3';samples.forEach(check);assert(resolveCursor(counterAnchor)===null,'changed count glyph inherited old character');
                const owner=kind==='tag'?leaf[0]:groups[0],old=owner.getAttribute(attribute);owner.setAttribute(attribute,'private-replacement');for(const s of samples.filter(s=>owner.contains(s.root)))assert(resolveCursor(s.anchor)===null,'same-name replacement inherited tree pointer');owner.setAttribute(attribute,old);samples.forEach(check);
                nested[0].style.display='none';arrow.classList.remove('b3-list-item__arrow--open');assert(resolveCursor(arrowAnchor),'visible tree toggle disappeared after collapsing its children');for(const s of samples.filter(s=>leaf[0].contains(s.root)))assert(resolveCursor(s.anchor)===null,'collapsed tree branch inherited same-name leaf');nested[0].style.display='';arrow.classList.add('b3-list-item__arrow--open');samples.forEach(check);
                leaf[0].style.opacity='0';for(const s of samples.filter(s=>leaf[0].contains(s.root)))assert(resolveCursor(s.anchor)===null,'transparent tree leaf painted');leaf[0].style.opacity='';
                if(kind==='bookmark'||kind==='outline'){
                    nested[1].append(leaf[0]);samples.forEach(check);nested[0].append(leaf[0]);samples.forEach(check);
                }
                const duplicate=leaf[0].cloneNode(true);nested[1].append(duplicate);for(const s of samples.filter(s=>leaf[0].contains(s.root)))assert(resolveCursor(s.anchor)===null,'ambiguous tree row guessed');duplicate.remove();samples.forEach(check);
            }finally{if(previous)dockModels.set(kind,previous);else dockModels.delete(kind);fixture.remove();dock.remove();}
        }
    });
    await test('大纲标题与内容留白绑定文档，通用工具栏跨文档仍可见',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('outline');
        fixture.className='sy__outline dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:300px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type='outline';
        fixture.innerHTML='<div class="block__icons" style="height:32px"><button data-type="search">搜索</button></div><div class="b3-list-item" title="同名文档" style="height:32px;display:flex"><span class="b3-list-item__text" style="width:160px">同名文档</span><span class="counter">2</span></div><div class="fn__flex-1" style="height:236px;padding:3px 0 8px;box-sizing:border-box"><ul class="b3-list" style="margin:0;padding:0"><li data-treetype="outline" data-node-id="20261104180000-heading" class="b3-list-item" style="height:28px">标题</li></ul></div>';
        document.body.append(fixture,dock);const model={blockId:'20261104180000-doc0001',notebookId:'20261102202832-mhg8hmt',parent:{panelElement:fixture}};dockModels.set('outline',model);
        const point=e=>{const r=e.getBoundingClientRect();return {x:r.right-3,y:r.bottom-3};},title=fixture.children[1],content=fixture.children[2],label=title.firstElementChild;
        try{
            const samples=[title,label,content].map(root=>({root,anchor:componentRoundTrip(point(root))})),control=componentRoundTrip(point(fixture.querySelector('button')));
            model.blockId='20261104180000-doc0002';for(const sample of samples)assert(resolveCursor(sample.anchor)===null,'same-name outline document inherited title or content whitespace');assert(resolveCursor(control),'generic outline toolbar disappeared across documents');
            model.blockId='';for(const sample of samples)assert(resolveCursor(sample.anchor)===null,'unidentified outline document painted');assert(captureCursor(point(title))===null,'unidentified title acquired a generic dock anchor');model.blockId='20261104180000-doc0001';const check=()=>{for(const sample of samples){const actual=resolveCursor(sample.anchor),expected=point(sample.root);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.01,'outline title or content drifted');}};check();
            title.lastElementChild.textContent='3';check();label.textContent='重命名文档';assert(resolveCursor(samples[1].anchor)===null,'renamed title inherited old text');label.textContent='同名文档';check();
            fixture.style.opacity='0';for(const sample of samples)assert(resolveCursor(sample.anchor)===null,'hidden outline content painted');fixture.style.opacity='';check();
        }finally{if(previous)dockModels.set('outline',previous);else dockModels.delete('outline');fixture.remove();dock.remove();}
    });
    await test('独立大纲标题与内容留白使用页签模型，不借用侧栏文档',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('outline');fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:300px;z-index:100;background:white';
        fixture.innerHTML='<ul><li data-type="tab-header"><span class="item__text">同名文档</span></li></ul><div class="layout-tab-container"><div data-id="local-outline" class="sy__outline dockPanel"><div class="block__icons" style="height:32px"><div class="block__logo">大纲</div></div><div class="b3-list-item" style="height:32px;display:flex"><span class="b3-list-item__text">同名文档</span></div><div class="fn__flex-1" style="height:200px;padding:3px 0 8px;box-sizing:border-box"><ul class="b3-list" style="margin:0;padding:0"><li data-treetype="outline" data-node-id="20261104180000-heading" class="b3-list-item" style="height:28px">标题</li></ul></div></div></div>';
        dock.className='dock__item';dock.dataset.type='outline';document.body.append(fixture,dock);const panel=fixture.querySelector('.sy__outline'),model={type:'local',blockId:'20261104180000-doc0001',parent:{panelElement:panel}},tab={model,panelElement:panel,headElement:fixture.querySelector('[data-type="tab-header"]'),title:'同名文档',icon:'iconOutline'};testTabs.push(tab);dockModels.set('outline',{blockId:'20261104180000-doc0002',parent:{panelElement:document.createElement('div')}});
        const point=e=>{const r=e.getBoundingClientRect();return {x:r.right-3,y:r.bottom-3};};
        try{
            const samples=[panel.children[1],panel.children[1].firstElementChild,panel.children[2]].map(root=>({root,anchor:componentRoundTrip(point(root))})),check=()=>{for(const s of samples){const p=resolveCursor(s.anchor),q=point(s.root);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.01,'local outline drifted');}};check();
            model.blockId='20261104180000-doc0002';for(const s of samples)assert(resolveCursor(s.anchor)===null,'local outline inherited another document');model.blockId='20261104180000-doc0001';check();
            model.blockId='';for(const s of samples)assert(resolveCursor(s.anchor)===null,'unknown local outline painted');assert(captureCursor(point(panel.children[2]))===null,'unknown local outline used fallback');model.blockId='20261104180000-doc0001';check();
            testTabs.splice(testTabs.indexOf(tab),1);for(const s of samples)assert(resolveCursor(s.anchor)===null,'closed local outline inherited sidebar');testTabs.push(tab);check();panel.style.opacity='0';for(const s of samples)assert(resolveCursor(s.anchor)===null,'hidden local outline painted');
        }finally{if(previous)dockModels.set('outline',previous);else dockModels.delete('outline');fixture.remove();dock.remove();const i=testTabs.indexOf(tab);if(i>=0)testTabs.splice(i,1);}
    });
    await test('同文档的独立大纲与反链页签不共用工具栏作用域',async()=>{
        const fixture=document.createElement('div');fixture.style.cssText='position:fixed;left:25px;top:25px;z-index:100;background:white';fixture.innerHTML='<div class="layout-tab-container"></div>';document.body.append(fixture);const tabs=[];
        for(const kind of ['outline','backlink']){const panel=document.createElement('div'),head=document.createElement('li');panel.className='sy__'+kind+' dockPanel';panel.dataset.id=kind;panel.style.cssText='width:300px;height:80px';panel.innerHTML='<div class="block__icons"><div class="block__logo" style="height:32px">'+(kind==='outline'?'大纲':'反向链接')+'</div></div>';fixture.firstElementChild.append(panel);head.dataset.type='tab-header';fixture.append(head);const tab={model:{type:'local',blockId:'20261104180000-doc0001',parent:{panelElement:panel}},panelElement:panel,headElement:head,title:'同名文档',icon:'icon'+kind};testTabs.push(tab);tabs.push(tab);}
        try{const samples=tabs.map(tab=>{const logo=tab.panelElement.querySelector('.block__logo'),r=logo.getBoundingClientRect(),point={x:r.left+100,y:r.top+16};return {tab,point,anchor:componentRoundTrip(point)};});assert(samples[0].anchor.ui.scope.key!==samples[1].anchor.ui.scope.key,'different native tab kinds share a scope');for(const s of samples){s.tab.panelElement.style.opacity='0';assert(resolveCursor(s.anchor)===null,'hidden tab inherited other surface');s.tab.panelElement.style.opacity='';}}
        finally{for(const tab of tabs)testTabs.splice(testTabs.indexOf(tab),1);fixture.remove();}
    });
    await test('反链来源行与列表留白区分目标、来源及反链和提及分区',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('backlink');fixture.className='sy__backlink dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:320px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type='backlink';
        for(const section of ['backlinkList','backlinkMList']){const container=document.createElement('div');container.className=section;container.style.cssText='height:150px';container.innerHTML='<ul class="b3-list" style="margin:0;padding:6px 0;height:138px;box-sizing:border-box"></ul>';for(const id of ['source1','source2'])container.firstElementChild.insertAdjacentHTML('beforeend','<div class="backlinkList__item" data-node-id="20261104190000-'+id+'"><li class="b3-list-item" data-treetype="backlink" data-node-id="20261104190000-'+id+'" style="display:flex;align-items:center;height:32px"><span class="b3-list-item__text" style="width:150px">同名来源</span><span class="counter">2</span></li></div>');fixture.append(container);}
        document.body.append(fixture,dock);const model={element:fixture,blockId:'20261104190000-target1',type:'pin',parent:{panelElement:fixture}};dockModels.set('backlink',model);const point=e=>{const r=e.getBoundingClientRect();return {x:r.right-3,y:r.top+12};},rows=[...fixture.querySelectorAll('li')];
        try{
            const samples=rows.map(root=>({root,anchor:componentRoundTrip(point(root))})),listSamples=[...fixture.querySelectorAll('ul')].map(root=>{const r=root.getBoundingClientRect(),point={x:r.left+r.width/2,y:r.bottom-2};return {point,anchor:componentRoundTrip(point)};});const check=()=>{for(const sample of samples){const actual=resolveCursor(sample.anchor),expected=point(sample.root);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.01,'backlink row lost or crossed section');}};
            rows[0].lastElementChild.textContent='3';check();for(const list of fixture.querySelectorAll('ul'))list.prepend(list.lastElementChild);check();for(const sample of listSamples){const actual=resolveCursor(sample.anchor);assert(actual&&Math.hypot(actual.x-sample.point.x,actual.y-sample.point.y)<.01,'backlink list perimeter followed previous source');}
            const original=rows[0].parentElement,duplicate=original.cloneNode(true);original.parentElement.append(duplicate);assert(resolveCursor(samples[0].anchor)===null,'duplicate backlink source guessed');assert(resolveCursor(samples[2].anchor),'duplicate backlink hid separate mention');duplicate.remove();check();model.blockId='20261104190000-target2';for(const sample of samples)assert(resolveCursor(sample.anchor)===null,'backlink source crossed target documents');model.blockId='20261104190000-target1';check();
            fixture.firstElementChild.style.opacity='0';for(const sample of samples.slice(0,2))assert(resolveCursor(sample.anchor)===null,'hidden backlink borrowed mention row');fixture.firstElementChild.style.opacity='';check();
        }finally{if(previous)dockModels.set('backlink',previous);else dockModels.delete('backlink');fixture.remove();dock.remove();}
    });
    await test('反链计数变化保留栏目文字与周围留白，变化数字隐藏',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('backlink');fixture.className='sy__backlink dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:100px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type='backlink';fixture.innerHTML='<div class="block__icons backlinkList__header"><div class="block__logo block__logo--counter" data-type="backlink" style="width:300px;height:40px">反向链接<span class="counter">2</span></div></div><div class="backlinkList"></div>';document.body.append(fixture,dock);dockModels.set('backlink',{element:fixture,blockId:'20261104190000-target1',type:'pin',parent:{panelElement:fixture}});
        try{const logo=fixture.querySelector('.block__logo'),counter=logo.firstElementChild,range=document.createRange();range.setStart(logo.firstChild,1);range.setEnd(logo.firstChild,2);const gr=range.getBoundingClientRect(),cr=counter.getBoundingClientRect(),lr=logo.getBoundingClientRect(),point={x:gr.left+gr.width/2,y:gr.top+gr.height/2},blank={x:(cr.right+lr.right)/2,y:point.y},label=componentRoundTrip(point),gap=componentRoundTrip(blank),hr=logo.parentElement.getBoundingClientRect(),headerPoint={x:hr.right-2,y:hr.top+20},header=componentRoundTrip(headerPoint),digit=componentRoundTrip({x:cr.left+cr.width/2,y:cr.top+cr.height/2});counter.textContent='3';for(const [anchor,expected]of [[label,point],[gap,blank],[header,headerPoint]]){const actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.01,'backlink counter invalidated unchanged label or gap');}assert(resolveCursor(digit)===null,'changed counter glyph painted');dockModels.get('backlink').blockId='20261104190000-target2';for(const anchor of [label,gap,header])assert(resolveCursor(anchor),'shared backlink toolbar disappeared across target documents');}
        finally{if(previous)dockModels.set('backlink',previous);else dockModels.delete('backlink');fixture.remove();dock.remove();}
    });
    await test('反链和提及内相同块的光标、选区及编辑状态分别匹配',async()=>{
        for(const surface of ['pin','local','bottom']){
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('backlink');fixture.className=(surface==='bottom'?'sy__backlink--bottom':'sy__backlink')+' dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:320px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type='backlink';
        for(const section of ['backlinkList','backlinkMList'])fixture.insertAdjacentHTML('beforeend','<div class="'+section+'" style="height:150px"><div class="backlinkList__item" data-node-id="20261104190000-source1"><div class="protyle" style="width:400px"><div class="protyle-wysiwyg"><div data-node-id="20261104190000-repeat1"><div contenteditable="true">重复上下文文字</div></div></div></div></div></div>');document.body.append(fixture,dock);const model={element:fixture,blockId:'20261104190000-target1',type:surface,parent:{panelElement:fixture}};const tabEntry=surface==='bottom'?{model:{backlink:model}}:{model};if(surface==='pin')dockModels.set('backlink',model);else{dockModels.delete('backlink');testTabs.push(tabEntry);}
        try{const inputs=[...fixture.querySelectorAll('[contenteditable]')],anchors=[];for(const input of inputs){const range=document.createRange();range.setStart(input.firstChild,1);range.setEnd(input.firstChild,2);const r=range.getBoundingClientRect(),point={x:r.left+r.width/2,y:r.top+r.height/2},anchor=componentRoundTrip(point);assert(anchor.surface==='document','backlink text bypassed document geometry');anchors.push(anchor);}assert(JSON.stringify(anchors[0].region)!==JSON.stringify(anchors[1].region),'backlink and mention shared an editor region');
            inputs[0].focus();const range=document.createRange();range.setStart(inputs[0].firstChild,0);range.setEnd(inputs[0].firstChild,2);getSelection().removeAllRanges();getSelection().addRange(range);const selection=captureSelection(),editing=captureEditing();assert(selection&&editing,'backlink selection or editing missing');assert(matchesRegion(inputs[0],selection.region)&&!matchesRegion(inputs[1],selection.region),'selection borrowed duplicate context');assert(matchesRegion(inputs[0],editing.region)&&!matchesRegion(inputs[1],editing.region),'editing halo borrowed duplicate context');
            fixture.firstElementChild.style.display='none';assert(resolveCursor(anchors[0])===null,'hidden backlink borrowed visible mention block');assert(resolveCursor(anchors[1]),'visible mention block disappeared');model.blockId='';assert(resolveCursor(anchors[1])===null,'unidentified backlink context painted');
        }finally{getSelection().removeAllRanges();if(previous)dockModels.set('backlink',previous);else dockModels.delete('backlink');fixture.remove();dock.remove();const index=testTabs.indexOf(tabEntry);if(index>=0)testTabs.splice(index,1);}
        }
    });
    await test('反链来源容器边角在折叠或重建上下文后保留行边界',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get('backlink');fixture.className='sy__backlink dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;background:white;z-index:100';dock.className='dock__item';dock.dataset.type='backlink';fixture.innerHTML='<div class="backlinkList"><ul class="b3-list" style="margin:0;padding:0"><div class="backlinkList__item" data-node-id="20261104190000-source1"><li data-node-id="20261104190000-source1" class="b3-list-item" style="height:28px;margin:0 8px">来源文档</li><div class="protyle" style="width:420px;height:100px"></div></div></ul></div>';document.body.append(fixture,dock);dockModels.set('backlink',{element:fixture,blockId:'20261104190000-target1',type:'pin',parent:{panelElement:fixture}});
        try{const item=fixture.querySelector('.backlinkList__item'),context=item.lastElementChild,r=item.getBoundingClientRect(),point={x:r.left+2,y:r.top+2};assert(document.elementFromPoint(point.x,point.y)===item,'fixture did not expose row gutter');const anchor=componentRoundTrip(point),check=()=>{const actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-point.x,actual.y-point.y)<.01,'source corner depended on expanded context');};context.remove();check();item.append(context);context.style.height='200px';check();}
        finally{if(previous)dockModels.set('backlink',previous);else dockModels.delete('backlink');fixture.remove();dock.remove();}
    });
    await test('页底反链外框边角和底部留白不随上下文高度缩放',async()=>{
        const fixture=document.createElement('div');fixture.className='sy__backlink sy__backlink--bottom dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;padding:0 0 16px;background:white;z-index:100';fixture.innerHTML='<div class="block__icons backlinkList__header" style="height:40px;margin:0 24px">反向链接</div><div class="backlinkList" style="height:160px;margin:0 24px"></div><div class="block__icons backlinkMList__header" style="height:40px;margin:0 24px">提及</div><div class="backlinkMList" style="height:80px;margin:0 24px"></div>';document.body.append(fixture);const tab={model:{backlink:{element:fixture,type:'bottom',blockId:'20261104190000-target1'}}};testTabs.push(tab);
        try{const point=side=>{const r=fixture.getBoundingClientRect();return {x:side==='top'?r.left+2:r.right-2,y:side==='top'?r.top+2:r.bottom-2};},samples=['top','bottom'].map(side=>({side,anchor:componentRoundTrip(point(side))}));for(const height of ['80px','240px','0px']){fixture.querySelector('.backlinkList').style.height=height;for(const {side,anchor}of samples){const actual=resolveCursor(anchor),expected=point(side);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.001,'footer perimeter scaled with context height: '+side);}}}
        finally{fixture.remove();testTabs.splice(testTabs.indexOf(tab),1);}
    });
    await test('树外围留白与原生半像素命中独立于分支重排',async()=>{
        const fixture=document.createElement('div');fixture.className='sy__tag';fixture.style.cssText='position:fixed;left:25px;top:25px;width:300px;background:white;z-index:100';
        fixture.innerHTML='<ul class="b3-list" style="padding:0;margin:0"></ul>';const list=fixture.firstElementChild;
        for(const name of ['a','b']){
            list.insertAdjacentHTML('beforeend','<li data-treetype="tag" data-label="'+name+'" class="b3-list-item" style="height:28px;margin:0 8px 1px">'+name+'</li><ul style="padding:0;margin:0"><li data-treetype="tag" data-label="'+name+'/leaf" class="b3-list-item" style="height:28px;margin:0 8px 1px"><span class="b3-list-item__text" style="display:block;height:28px">同名</span></li></ul>');
        }
        document.body.append(fixture);
        try{
            const groups=[...list.children],label=groups[1].querySelector('span'),r=label.getBoundingClientRect(),point={x:r.left+50,y:r.top-.5};
            assert(document.elementFromPoint(point.x,point.y)===label,'fixture did not reproduce native half-pixel hit');
            const half=componentRoundTrip(point),cornerPoint={x:list.getBoundingClientRect().left+2,y:list.getBoundingClientRect().top+2},corner=componentRoundTrip(cornerPoint);
            list.append(groups[2],groups[3],groups[0],groups[1]);
            const target=label.getBoundingClientRect(),resolved=resolveCursor(half),blank=resolveCursor(corner);
            assert(resolved&&Math.hypot(resolved.x-point.x,resolved.y-(target.top-.5))<.01,'half-pixel hit followed its previous branch');
            assert(blank&&Math.hypot(blank.x-cornerPoint.x,blank.y-cornerPoint.y)<.01,'tree outer gutter followed a branch');
            const branch=groups[3],br=branch.getBoundingClientRect(),branchPoint={x:br.left+2,y:br.top+2},branchAnchor=componentRoundTrip(branchPoint),extra=branch.firstElementChild.cloneNode(true);extra.dataset.label='extra-leaf';branch.append(extra);
            const grown=resolveCursor(branchAnchor);assert(grown&&Math.hypot(grown.x-branchPoint.x,grown.y-branchPoint.y)<.01,'single-row branch corner stretched with a new row');extra.remove();
            groups[1].style.display='none';const collapsed=resolveCursor(corner);assert(collapsed&&Math.hypot(collapsed.x-cornerPoint.x,collapsed.y-cornerPoint.y)<.01,'tree corner drifted when its contents shrank');
        }finally{fixture.remove();}
    });
    await test('工具栏边缘的亚像素命中不被旧控件比例坐标截断',async()=>{
        const button=document.createElement('button');button.dataset.topbarEntry='subpixel-control';button.textContent='按钮';button.style.cssText='position:fixed;left:25.375px;top:25px;width:100px;height:32px;z-index:100';document.body.append(button);
        try{
            const r=button.getBoundingClientRect(),point={x:r.left-.125,y:r.top+16};assert(document.elementFromPoint(point.x,point.y)===button,'fixture did not reproduce native toolbar edge');
            const anchor=componentRoundTrip(point),local=resolveCursor(anchor);assert(local&&Math.hypot(local.x-point.x,local.y-point.y)<.001,'legacy clamping moved the pointer');
        }finally{button.remove();}
    });
    await test('AI 保存动作的文字、编辑按钮和留白按稳定身份匹配',async()=>{
        const fixture=document.createElement('div');fixture.id='ai-actions-fixture';fixture.className='b3-menu';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:240px;z-index:100;background:white';
        fixture.innerHTML='<div class="b3-list" style="padding:10px;height:210px;box-sizing:border-box"><div class="b3-menu__separator" style="height:8px"></div></div>';document.body.append(fixture);
        const list=fixture.firstElementChild;for(const id of ['first','second','third'])list.insertAdjacentHTML('beforeend','<div class="b3-list-item b3-list-item--narrow ariaLabel" data-type="saved" data-id="private-action-'+id+'" aria-label="private-prompt-'+id+'" style="height:42px;display:flex;align-items:center"><span class="b3-list-item__text">同名动作</span><span style="flex:1;height:26px"></span><span class="b3-list-item__action" data-type="edit" style="width:30px;height:26px">E</span></div>');
        const rows=[...list.querySelectorAll('[data-type="saved"]')],point=e=>{const r=e.getBoundingClientRect();return {x:r.left+4,y:r.top+r.height/2};};
        try{
            const samples=rows.flatMap(row=>[...row.children]).map(root=>({root,anchor:componentRoundTrip(point(root))}));
            const rect=list.getBoundingClientRect(),tailPoint={x:rect.left+20,y:rect.bottom-4},tail=componentRoundTrip(tailPoint);
            assert(samples.every(sample=>!JSON.stringify(sample.anchor).includes('private-')&&!JSON.stringify(sample.anchor).includes('同名动作')),'AI identity leaked raw IDs, prompts or names');
            list.prepend(rows[2]);rows[0].classList.add('b3-list-item--focus');
            const check=sample=>{const p=resolveCursor(sample.anchor),q=point(sample.root);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,'same-name AI action followed list order');};samples.forEach(check);
            const tailResolved=resolveCursor(tail);assert(tailResolved&&Math.hypot(tailResolved.x-tailPoint.x,tailResolved.y-tailPoint.y)<.6,'separated-list perimeter followed former last action');
            rows[1].dataset.id='replacement';for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'replacement AI action inherited pointer');rows[1].dataset.id='private-action-second';
            const clone=rows[0].cloneNode(true);list.append(clone);for(const sample of samples.filter(s=>rows[0].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'duplicate AI identity guessed');clone.remove();
            for(const property of ['opacity','visibility','display']){rows[1].style[property]={opacity:'0',visibility:'hidden',display:'none'}[property];for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'hidden AI action painted: '+property);rows[1].style[property]=property==='display'?'flex':'';}samples.forEach(check);
            rows[1].remove();for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'removed AI action inherited same-name sibling');
        }finally{fixture.remove();}
    });
    await test('命令面板按稳定命令身份匹配，同名重排、替换、重复和隐藏不串位',async()=>{
        const fixture=document.createElement('div');fixture.dataset.key='dialog-commandpanel';fixture.innerHTML='<div class="b3-dialog" style="position:fixed;left:25px;top:25px;width:420px;height:300px;z-index:100;background:white"><div class="b3-dialog__header">命令面板</div><ul id="commands" class="b3-list search__list" style="padding:10px;margin:0;height:240px;box-sizing:border-box"></ul></div>';document.body.append(fixture);
        const list=fixture.querySelector('ul');for(const key of ['a','b','c'])list.insertAdjacentHTML('beforeend','<li class="b3-list-item" data-command-id="plugin/example/identity_'+key+'" style="display:block;list-style:none;height:40px"><span class="b3-list-item__text">同名命令</span></li>');
        const rows=[...list.children],point=(root,blank)=>{const r=root.getBoundingClientRect();return{x:blank?r.right-3:r.left+4,y:r.top+12};};
        try{
            const samples=rows.flatMap(row=>[{root:row,blank:true},{root:row.firstElementChild,blank:false}]).map(sample=>({...sample,anchor:componentRoundTrip(point(sample.root,sample.blank))}));
            assert(samples.every(s=>!JSON.stringify(s.anchor).includes('plugin/')&&!JSON.stringify(s.anchor).includes('同名命令')),'command identity leaked raw labels or IDs');
            list.prepend(rows[2]);rows[0].classList.add('b3-list-item--focus');
            for(const sample of samples){const p=resolveCursor(sample.anchor),q=point(sample.root,sample.blank);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,'same-name command followed list position');}
            rows[1].dataset.commandId='plugin/example/identity_replacement';for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'replacement command inherited pointer');rows[1].dataset.commandId='plugin/example/identity_b';
            const duplicate=rows[0].cloneNode(true);list.append(duplicate);for(const sample of samples.filter(s=>rows[0].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'duplicate command identity guessed an occurrence');duplicate.remove();
            rows[1].style.opacity='0';for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'transparent command painted');rows[1].style.opacity='';
            rows[1].remove();for(const sample of samples.filter(s=>rows[1].contains(s.root)))assert(resolveCursor(sample.anchor)===null,'missing command painted');
        }finally{fixture.remove();}
    });
    await test('列表外围留白按当前内容边界定位，排序、筛选和透明行不绑定旧的首尾项目',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-list';fixture.id='list-perimeter-fixture';fixture.style.cssText='position:fixed;display:flex;flex-direction:column;gap:10px;left:25px;top:25px;width:240px;height:240px;padding:10px;box-sizing:border-box;z-index:100;background:white';fixture.innerHTML='<div class="b3-list-item" data-node-id="20261104153000-list001" style="height:30px;flex-shrink:0">同名项目</div><div class="b3-list-item" data-node-id="20261104153000-list002" style="height:50px;flex-shrink:0">同名项目</div>';document.body.append(fixture);
        const first=fixture.firstElementChild,last=fixture.lastElementChild,point={x:145,y:245},cover=document.createElement('div');
        try{
            const tail=componentRoundTrip(point),gap=componentRoundTrip({x:145,y:70}),row=componentRoundTrip({x:45,y:45});assert(tail.ui.edges.y.some(edge=>edge.kind==='list')&&!tail.ui.textHash,'list tail inherited descendant text or a specific row');
            fixture.prepend(last);const moved=resolveCursor(tail);assert(moved&&near(moved.x,point.x)&&near(moved.y,point.y),'reordered list perimeter drifted');assert(resolveCursor(gap)===null,'reversed interior gap painted over a row');
            fixture.style.height='280px';const fraction=(245-125)/(265-125),expected=125+fraction*(305-125),resized=resolveCursor(tail);assert(resized&&near(resized.y,expected),'resized list tail used whole-list ratio');fixture.style.height='240px';
            first.style.opacity='0';assert(resolveCursor(tail),'transparent occupying row removed perimeter');first.style.opacity='';
            first.remove();const filtered=resolveCursor(tail),filteredBottom=85,filteredY=filteredBottom+fraction*(265-filteredBottom);assert(filtered&&near(filtered.y,filteredY),'filtered list retained old tail boundary');assert(resolveCursor(row)===null,'removed row inherited another row');fixture.append(first);
            for(const item of [first,last])item.style.display='none';assert(resolveCursor(tail)===null,'empty list guessed a former content boundary');for(const item of [first,last])item.style.display='';
            cover.style.cssText='position:fixed;left:25px;top:130px;width:240px;height:135px;z-index:101;background:white';document.body.append(cover);assert(resolveCursor(tail)===null,'covered list perimeter painted');
        }finally{cover.remove();fixture.remove();}
    });
    await test('原生弹窗标题的临时 ID 不影响标题、搜索和留白，稳定 ID 和遮挡继续生效',async()=>{
        const fixture=document.createElement('div');fixture.dataset.key='dialog-recentdocs';fixture.innerHTML='<div class="b3-dialog" style="position:fixed;left:25px;top:25px;width:500px;height:240px;background:white;z-index:100"><div role="dialog" aria-labelledby="dialog-title-11111111-1111-4111-8111-111111111111" class="b3-dialog__container" style="width:100%;height:100%"><div class="b3-dialog__header" id="dialog-title-11111111-1111-4111-8111-111111111111" style="height:80px;padding:8px"><div class="switch-doc__title">最近文档</div><input class="switch-doc__search" placeholder="搜索..." style="width:200px"><span id="stable-header-action">固定动作</span></div><div class="b3-dialog__body">正文区域</div></div></div>';document.body.append(fixture);
        const title=fixture.querySelector('.switch-doc__title'),header=fixture.querySelector('.b3-dialog__header'),container=fixture.querySelector('[role="dialog"]'),input=fixture.querySelector('input'),stable=fixture.querySelector('#stable-header-action');
        const point=e=>{const r=e.getBoundingClientRect();return {x:r.left+3,y:r.top+5};};
        try{
            const samples=[title,input,stable].map(root=>({root,anchor:componentRoundTrip(point(root))})),blank=componentRoundTrip({x:510,y:100});
            header.id='dialog-title-22222222-2222-4222-8222-222222222222';container.setAttribute('aria-labelledby',header.id);
            for(const sample of samples){const p=resolveCursor(sample.anchor),q=point(sample.root);assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.6,'reopened dialog lost '+sample.root.className);}
            assert(resolveCursor(blank),'dialog header whitespace lost after generated ID changed');
            stable.id='other-header-action';assert(resolveCursor(samples[2].anchor)===null,'stable header control ID ignored');stable.id='stable-header-action';
            header.id='unrelated-stable-header';container.setAttribute('aria-labelledby',header.id);assert(resolveCursor(samples[0].anchor)===null,'stable title ID ignored');
            header.id='dialog-title-22222222-2222-4222-8222-222222222222';container.setAttribute('aria-labelledby','unrelated-title');assert(resolveCursor(samples[0].anchor)===null,'unreferenced title ID ignored');container.setAttribute('aria-labelledby',header.id);
            title.style.opacity='0';assert(resolveCursor(samples[0].anchor)===null,'transparent dialog title painted');title.style.opacity='';
            const cover=document.createElement('div');cover.style.cssText='position:fixed;left:25px;top:25px;width:500px;height:100px;z-index:101;background:white';fixture.append(cover);assert(resolveCursor(samples[0].anchor)===null&&resolveCursor(blank)===null,'covered title or whitespace painted');cover.remove();
            fixture.remove();assert(resolveCursor(samples[0].anchor)===null&&resolveCursor(blank)===null,'closed dialog painted');document.body.append(fixture);assert(resolveCursor(samples[0].anchor),'restored dialog did not restore title');
        }finally{fixture.remove();}
    });
    await test('原生菜单按动作与相邻项定位，悬停、分组、子菜单和重排不改变可见目标',async()=>{
        const menu=document.createElement('div');menu.className='b3-menu';menu.dataset.name='native-menu-fixture';menu.style.cssText='position:fixed;left:25px;top:25px;width:300px;height:350px;padding:8px;box-sizing:border-box;background:white;z-index:100';
        menu.innerHTML='<div class="b3-menu__items"><button data-id="alpha" class="b3-menu__item b3-menu__item--group-first">同名动作</button><button data-id="separator_1" class="b3-menu__separator"></button><button data-id="beta" class="b3-menu__item b3-menu__item--group-last">同名动作</button><button data-id="headingNumber" class="b3-menu__item b3-menu__item--current b3-menu__item--show b3-menu__item--group-last"><span class="b3-menu__label">标题编号</span></button></div>';
        const list=menu.firstElementChild,submenu=document.createElement('div');submenu.className='b3-menu__submenu';submenu.style.cssText='position:absolute;left:310px;top:50px;background:white;width:120px';submenu.innerHTML='<button data-id="enable" class="b3-menu__item">启用</button>';list.querySelector('[data-id="headingNumber"]').append(submenu);for(const row of list.children)row.style.cssText='display:block;width:100%;height:35px';document.body.append(menu);
        try{
            const parent=list.querySelector('[data-id="headingNumber"]'),label=parent.querySelector('span'),child=parent.querySelector('[data-id="enable"]'),separator=list.querySelector('.b3-menu__separator');
            const point=root=>{const r=root.getBoundingClientRect();return{x:r.left+6,y:r.top+r.height/2};},samples=[...list.querySelectorAll(':scope > .b3-menu__item'),label,separator,child].map(root=>({root,anchor:componentRoundTrip(point(root))}));
            const r=menu.getBoundingClientRect(),blankPoint={x:r.right-2,y:r.top+r.height/2},blank=componentRoundTrip(blankPoint);assert(!blank.ui.textHash,'menu exterior inherited action text');
            parent.classList.remove('b3-menu__item--show','b3-menu__item--current','b3-menu__item--group-last');parent.querySelector('.b3-menu__submenu').style.display='none';
            const check=sample=>{const actual=resolveCursor(sample.anchor),expected=point(sample.root);assert(actual&&near(actual.x,expected.x)&&near(actual.y,expected.y),'visible menu action lost after state or layout change');};
            samples.slice(0,-1).forEach(check);assert(resolveCursor(samples.at(-1).anchor)===null,'closed submenu painted');
            for(const row of [...list.children])list.prepend(row);samples.slice(0,-1).forEach(check);
            const other=document.createElement('button');other.className='b3-menu__item';other.dataset.id='other';other.textContent='其他内容';separator.before(other);assert(resolveCursor(samples.find(sample=>sample.root===separator).anchor)===null,'different action boundary inherited separator');
            const mapped=resolveCursor(blank);assert(mapped&&near(mapped.x,blankPoint.x)&&near(mapped.y,blankPoint.y),'unrelated menu content removed exterior whitespace');
        }finally{menu.remove();}
    });
    await test('原生上传透明输入层按可见文字和图标定位，改宽和遮挡不误画',async()=>{
        const menu=document.createElement('div');menu.className='b3-menu';menu.dataset.name='native-upload-fixture';menu.style.cssText='position:fixed;left:25px;top:25px;width:300px;background:white;z-index:100';menu.innerHTML='<button data-id="insertAsset" class="b3-menu__item" style="position:relative;display:flex;align-items:center;gap:8px;width:100%;height:40px;padding:6px"><svg width="18" height="18"><rect width="18" height="18" fill="blue"/></svg><span class="b3-menu__label" style="flex:1;text-align:left">插入图片或文件<input class="b3-form__upload" type="file" style="position:absolute;inset:0;width:100%;height:100%;opacity:.001"></span></button>';document.body.append(menu);
        try{
            const row=menu.firstElementChild,label=row.querySelector('span'),upload=row.querySelector('input'),icon=row.querySelector('svg'),character=componentCharacter(label,3),ir=icon.getBoundingClientRect(),textPoint={x:character.left+character.width/2,y:character.top+character.height/2},iconPoint={x:ir.left+ir.width/2,y:ir.top+ir.height/2};assert(document.elementFromPoint(textPoint.x,textPoint.y)===upload,'native upload overlay not reproduced');
            const text=componentRoundTrip(textPoint),image=componentRoundTrip(iconPoint);menu.style.width='430px';
            for(const [anchor,expected] of [[text,textPoint],[image,iconPoint]]){const actual=resolveCursor(anchor);assert(actual&&near(actual.x,expected.x)&&near(actual.y,expected.y),'upload pointer followed input box instead of visible content');}
            icon.style.opacity='0';assert(resolveCursor(image)===null,'invisible upload icon inherited button');icon.style.opacity='1';
            const cover=document.createElement('div');cover.style.cssText='position:fixed;left:25px;top:25px;width:430px;height:40px;z-index:101;background:white';document.body.append(cover);assert(resolveCursor(text)===null,'covered upload text painted');cover.remove();upload.style.opacity='1';assert(resolveCursor(text)===null,'visible file control was treated as a transparent overlay');
            upload.style.opacity='.001';upload.setAttribute('data-private','true');assert(captureCursor(textPoint)===null&&resolveCursor(text)===null,'private upload input was bypassed');
        }finally{menu.remove();}
    });
    await test('所有 DOM 组件的文字、边角和留白覆盖扫描：菜单、侧栏、设置、标签、图片与插件面板',async()=>{
        const fixture=document.createElement('div');fixture.id='component-inventory';
        fixture.style.cssText='position:fixed;left:12px;top:12px;width:'+Math.min(900,innerWidth-50)+'px;height:540px;background:white;z-index:100;overflow:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:6px';
        const names=['toolbar','status','dock','sy__outline','sy__bookmark','sy__tag','backlinkList','sy__inbox','sy__search','sy__agent','layout-tab-bar','protyle-breadcrumb','config__side','config__tab-container','b3-list-item','custom-plugin','b3-menu','block__popover','protyle-hint','tooltip'];
        for(const name of names){
            const item=document.createElement('div');item.className=name;item.dataset.name=name;
            item.style.cssText='height:82px;padding:6px;background:#eef;box-sizing:border-box;position:relative';
            item.innerHTML='<span style="display:inline-block;width:150px">'+name+'</span><button data-type="same-control">OK</button><div class="blank-space" style="height:24px;margin-top:3px"></div>';
            fixture.append(item);
        }
        document.body.append(fixture);
        let samples=0;
        try {
            for(const scroll of [0,250,fixture.scrollHeight-fixture.clientHeight]){fixture.scrollTop=scroll;
            for(const item of [fixture,...fixture.querySelectorAll('*')]){
                const r=item.getBoundingClientRect();
                for(const [x,y] of [[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2],[(r.left+r.right)/2,(r.top+r.bottom)/2]]){
                    if(x<0 || x>=innerWidth || y<0 || y>=innerHeight || !fixture.contains(document.elementFromPoint(x,y)))continue;
                    componentRoundTrip({x,y});samples++;
                }
            }
            }
            assert(samples>=350,'coverage unexpectedly small: '+samples);
            fixture.dataset.samples=String(samples);
        }finally{fixture.remove();}
    });
    await test('组件间留白按邻居边界映射，重排、改宽和目标消失时不串位',async()=>{
        const fixture=document.createElement('div');fixture.id='gap-inventory';fixture.style.cssText='position:fixed;left:30px;top:30px;width:500px;height:250px;background:white;z-index:100;padding:20px';
        fixture.innerHTML='<div data-name="first" style="height:40px;margin-bottom:30px">第一行</div><div data-name="second" style="height:50px">第二行</div>';
        document.body.append(fixture);
        try{
            const first=fixture.firstElementChild,second=first.nextElementSibling,r=first.getBoundingClientRect(),point={x:r.left+10,y:r.bottom+15};
            const anchor=componentRoundTrip(point);assert(anchor.ui.version===3,'gap not a component');
            fixture.style.width='700px';first.style.height='70px';first.style.marginBottom='50px';
            const after=resolveCursor(anchor),a=first.getBoundingClientRect(),b=second.getBoundingClientRect();
            assert(after && near(after.y,(a.bottom+b.top)/2),'gap used whole panel height');
            const inserted=document.createElement('div');inserted.style.cssText='position:absolute;left:20px;top:90px;width:60px;height:100px';fixture.append(inserted);
            assert(resolveCursor(anchor)===null,'new component inherited blank pointer');inserted.remove();
            second.remove();assert(resolveCursor(anchor)===null,'missing semantic neighbour retained pointer');fixture.append(second);
            fixture.style.opacity='0';assert(resolveCursor(anchor)===null,'invisible component painted');fixture.style.opacity='1';
            const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;background:white;z-index:101';document.body.append(overlay);
            assert(resolveCursor(anchor)===null,'covered blank painted');overlay.remove();
        }finally{fixture.remove();}
    });
    await test('同源嵌入按内部组件与文字定位，边框缩放和内部滚动不会用整帧比例',async()=>{
        const frameElement=document.createElement('iframe');frameElement.id='component-frame';frameElement.style.cssText='position:fixed;left:30px;top:30px;width:400px;height:220px;border:7px solid black;z-index:100';
        frameElement.srcdoc='<style>body{margin:12px;height:800px}button{display:block;margin-top:30px;width:180px;height:40px}</style><button data-name="inside">内部按钮</button><div style="height:100px">内部留白</div>';
        const loaded=new Promise(resolve=>frameElement.onload=resolve);document.body.append(frameElement);await loaded;
        try{
            const r=frameElement.getBoundingClientRect(),button=frameElement.contentDocument.querySelector('button'),b=button.getBoundingClientRect();
            const point={x:r.left+(b.left+20+frameElement.clientLeft)*r.width/frameElement.offsetWidth,y:r.top+(b.top+10+frameElement.clientTop)*r.height/frameElement.offsetHeight};
            const anchor=componentRoundTrip(point);assert(anchor.ui.frame,'internal component route missing');
            frameElement.style.transform='scale(.8)';frameElement.style.transformOrigin='top left';
            const after=resolveCursor(anchor),s=frameElement.getBoundingClientRect();
            assert(after && near(after.x,s.left+(b.left+20+frameElement.clientLeft)*s.width/frameElement.offsetWidth),'frame scaling drift');
            frameElement.contentWindow.scrollTo(0,20);await frame();assert(resolveCursor(anchor),'visible scrolled button disappeared');
            button.remove();assert(resolveCursor(anchor)===null,'missing iframe component used frame fraction');
        }finally{frameElement.remove();}
    });
    await test('多层同源嵌入逐层换算边框、缩放、滚动和遮挡，边框留白不猜测内部位置',async()=>{
        const outer=document.createElement('iframe');outer.id='nested-frame-fixture';outer.style.cssText='position:fixed;left:25px;top:25px;width:430px;height:300px;border:7px solid black;transform:scale(.9);transform-origin:top left;z-index:100';
        outer.srcdoc='<style>body{margin:0;padding:18px;height:900px}</style>';
        const loaded=new Promise(resolve=>outer.onload=resolve);document.body.append(outer);await loaded;
        const inner=outer.contentDocument.createElement('iframe');inner.style.cssText='width:340px;height:220px;border:5px solid black;transform:scale(.9);transform-origin:top left';
        inner.srcdoc='<style>body{margin:14px;height:700px}button{margin-top:24px;width:150px;height:40px}#blank{height:80px;width:150px}</style><button data-name="deep">内部按钮</button><div id="blank"></div>';
        const innerLoaded=new Promise(resolve=>inner.onload=resolve);outer.contentDocument.body.append(inner);await innerLoaded;
        const pointAt=(element,x=3,y=3)=>{const r=element.getBoundingClientRect();let point={x:r.left+x,y:r.top+y};for(const frameElement of [inner,outer]){const f=frameElement.getBoundingClientRect();point={x:f.left+(point.x+frameElement.clientLeft)*f.width/frameElement.offsetWidth,y:f.top+(point.y+frameElement.clientTop)*f.height/frameElement.offsetHeight};}return point;};
        try{
            const button=inner.contentDocument.querySelector('button'),anchor=componentRoundTrip(pointAt(button));assert(anchor.ui.frames?.length===2,'nested document chain missing');
            const blank=inner.contentDocument.querySelector('#blank');componentRoundTrip(pointAt(blank,15,15));
            const borderPoint={x:outer.getBoundingClientRect().left+2,y:outer.getBoundingClientRect().top+50},border=componentRoundTrip(borderPoint);
            outer.style.width='460px';const borderAfter=resolveCursor(border);assert(borderAfter&&near(borderAfter.x,borderPoint.x),'iframe border became content after resizing');
            outer.contentWindow.scrollTo(0,8);inner.contentWindow.scrollTo(0,8);await frame();
            const moved=resolveCursor(anchor),expected=pointAt(button);assert(moved&&near(moved.x,expected.x)&&near(moved.y,expected.y),'nested scroll drift');
            inner.style.opacity='0';assert(resolveCursor(anchor)===null,'transparent nested iframe painted');inner.style.opacity='1';
            for(const enclosing of [outer,inner]){enclosing.setAttribute('data-private','');assert(resolveCursor(anchor)===null,'private enclosing iframe painted');enclosing.removeAttribute('data-private');}assert(resolveCursor(anchor),'restored nested iframe missing');
            const cover=inner.contentDocument.createElement('div');cover.style.cssText='position:fixed;inset:0;background:white;z-index:200';inner.contentDocument.body.append(cover);assert(resolveCursor(anchor)===null,'inner-document overlay ignored');cover.remove();
            const parentCover=outer.contentDocument.createElement('div');parentCover.style.cssText='position:fixed;inset:0;background:white;z-index:200';outer.contentDocument.body.append(parentCover);assert(resolveCursor(anchor)===null,'parent-document overlay ignored');parentCover.remove();
            const svg=inner.contentDocument.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='display:block;width:20px;height:20px;overflow:visible';svg.innerHTML='<path d="M0 0H20V20H0Z"/>';blank.append(svg);componentRoundTrip(pointAt(svg,3,3));
            button.remove();assert(resolveCursor(anchor)===null,'missing nested component inherited frame fraction');
            inner.setAttribute('sandbox','');const replaced=new Promise(resolve=>inner.onload=resolve);inner.srcdoc='<button>Opaque embedded page</button>';await replaced;const ir=inner.getBoundingClientRect(),or=outer.getBoundingClientRect(),opaquePoint={x:or.left+(ir.left+20+outer.clientLeft)*or.width/outer.offsetWidth,y:or.top+(ir.top+20+outer.clientTop)*or.height/outer.offsetHeight};assert(captureCursor(opaquePoint)===null,'nested cross-origin content guessed');
        }finally{outer.remove();}
    });
    await test('嵌入页面旋转、倾斜、翻转和祖先变换时按原生投影标记定位内容与边框',async()=>{
        const holder=document.createElement('div');holder.id='affine-frame-holder';holder.style.cssText='position:fixed;left:160px;top:100px;width:600px;height:480px;transform:rotate(7deg) skewX(6deg);transform-origin:23% 71%;z-index:100';
        const outer=document.createElement('iframe');outer.id='affine-frame';outer.style.cssText='position:absolute;left:30px;top:25px;width:390px;height:300px;box-sizing:border-box;border:7.5px solid black;padding:3.5px;transform:rotate(13deg) scale(.9,.85);transform-origin:20% 65%';
        outer.srcdoc='<style>body{margin:0;height:900px}</style>';const loaded=new Promise(resolve=>outer.onload=resolve);const inline=document.createElement('span');inline.style.transform='rotate(25deg)';inline.append(outer);holder.append(inline);document.body.append(holder);await loaded;
        const inner=outer.contentDocument.createElement('iframe');inner.style.cssText='position:absolute;left:28px;top:60px;width:280px;height:200px;box-sizing:border-box;border:5px solid black;transform:rotate(-9deg) skewY(4deg);transform-origin:75% 30%';
        inner.srcdoc='<style>body{margin:12px;height:800px}button{width:160px;height:36px}#blank{height:65px}</style><button data-name="affine-target">旋转按钮</button><div id="blank"></div>';
        const innerLoaded=new Promise(resolve=>inner.onload=resolve);outer.contentDocument.body.append(inner);await innerLoaded;
        const contentPoint=(element,p)=>{const style=element.ownerDocument.defaultView.getComputedStyle(element);return projectedFramePoint(element,{x:p.x+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft),y:p.y+parseFloat(style.borderTopWidth)+parseFloat(style.paddingTop)});};
        const pointAt=element=>{const r=element.getBoundingClientRect();return contentPoint(outer,contentPoint(inner,{x:r.left+20,y:r.top+15}));};
        try{
            const button=inner.contentDocument.querySelector('button'),anchor=componentRoundTrip(pointAt(button));assert(anchor.ui.frames?.length===2,'transformed nested route missing');
            componentRoundTrip(pointAt(inner.contentDocument.querySelector('#blank')));
            const borderPoint=projectedFramePoint(outer,{x:3,y:105}),border=componentRoundTrip(borderPoint);
            assert(border.ui.edges.x.some(edge=>edge.kind==='frame-box'),'local frame border indistinguishable from legacy viewport edges');
            holder.style.rotate='-5deg';holder.style.scale='1.05 .95';outer.style.transform='rotate(-17deg) scale(-.82,.9)';inner.style.transform='rotate(18deg) skewX(-11deg)';outer.style.transformOrigin='82% 24%';
            let expected=pointAt(button),actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'receiver transform drift: '+JSON.stringify({actual,expected}));
            const borderExpected=projectedFramePoint(outer,{x:3,y:105}),borderActual=resolveCursor(border);assert(borderActual&&Math.hypot(borderActual.x-borderExpected.x,borderActual.y-borderExpected.y)<.6,'transformed frame border drift');
            outer.contentWindow.scrollTo(0,6);inner.contentWindow.scrollTo(0,4);await frame();expected=pointAt(button);actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'rotated nested scroll drift: '+JSON.stringify({actual,expected}));
            outer.contentWindow.scrollTo(0,150);await frame();assert(resolveCursor(anchor)===null,'rotated frame ignored viewport clipping');outer.contentWindow.scrollTo(0,0);await frame();assert(resolveCursor(anchor),'visible rotated target did not recover');
            for(const transform of ['rotate(90deg)','rotate(180deg)','scale(-.9,-.8) skewX(6deg)']){
                outer.style.transform=transform;outer.style.transformOrigin='50% 50%';expected=pointAt(button);actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'quarter turn or inversion drift: '+transform);
            }
            outer.style.transform='rotate(8deg)';outer.style.rotate='0 0 -1 .1rad';outer.style.scale='95% 90%';outer.style.zoom='1.1';expected=pointAt(button);actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.6,'individual rotation, percentage scale or CSS zoom drift');
            holder.style.perspective='600px';assert(resolveCursor(anchor)===null,'unsupported perspective guessed');holder.style.perspective='';
            inner.style.transform='scale(0)';assert(resolveCursor(anchor)===null,'singular frame painted');
        }finally{holder.remove();}
    });
    await test('原生 PDF 页面按文件和页码定位，缩放旋转、页间空白与遮挡不会串页',async()=>{
        const fixture=document.createElement('div');fixture.className='layout-tab-container';
        fixture.style.cssText='position:fixed;left:30px;top:30px;width:420px;height:360px;z-index:100;background:white;overflow:auto';
        fixture.innerHTML='<div data-id="pdf-test"><div class="pdfViewer"><div class="page" data-page-number="1" style="width:200px;height:120px;position:relative;margin:10px"><canvas style="width:100%;height:100%"></canvas><div class="textLayer" style="position:absolute;left:25px;top:25px;width:65px;height:20px">PDF text</div><div class="pdf__rect" data-node-id="20261104110000-pdfmark" style="position:absolute;left:110px;top:25px;width:40px;height:20px"></div></div><div class="page" data-page-number="2" style="width:200px;height:120px;position:relative;margin:10px"><canvas style="width:100%;height:100%"></canvas></div></div></div>';
        document.body.append(fixture);
        let rotation=0,scale=1;
        const panel=fixture.firstElementChild,pages=[...fixture.querySelectorAll('.page')];
        const views=pages.map(div=>({div,canvas:div.querySelector('canvas'),pdfPage:{view:[0,0,200,120]},get viewport(){return {width:(rotation?120:200)*scale,height:(rotation?200:120)*scale,convertToPdfPoint:(x,y)=>rotation?[y/scale,x/scale]:[x/scale,y/scale],convertToViewportPoint:(x,y)=>rotation?[y*scale,x*scale]:[x*scale,y*scale]};}}));
        const pdfObject={pdfDocument:{fingerprints:['test-pdf-file'],numPages:2},pdfViewer:{getPageView:index=>views[index]}};
        const model={path:'assets/cursor-test.pdf',element:panel,pdfObject},head=document.createElement('li');
        testTabs.push({panelElement:panel,headElement:head,model,title:'PDF'});
        const thumbnail=document.createElement('div');thumbnail.className='thumbnail selected';thumbnail.dataset.pageNumber='1';thumbnail.style.cssText='position:absolute;left:260px;top:10px;width:90px;height:70px;padding:5px;box-sizing:border-box';
        const thumbnailImage=document.createElement('img');thumbnailImage.style.cssText='width:80px;height:60px';const imageContainer=document.createElement('div');imageContainer.className='thumbnailImageContainer';imageContainer.setAttribute('role','button');imageContainer.append(thumbnailImage);thumbnail.append(imageContainer);panel.append(thumbnail);
        thumbnailImage.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="blue"/></svg>');await new Promise(resolve=>thumbnailImage.onload=resolve);
        pdfObject.pdfThumbnailViewer={getThumbnail:()=>({div:thumbnail,image:thumbnailImage,get viewport(){return views[0].viewport;}})};
        const pdfPoint=(view,x,y)=>{const r=view.canvas.getBoundingClientRect(),v=view.viewport.convertToViewportPoint(x,y);return {x:r.left+v[0]*r.width/view.viewport.width,y:r.top+v[1]*r.height/view.viewport.height};};
        try{
            const blank=componentRoundTrip(pdfPoint(views[0],170,90));assert(blank.ui.pdf?.page===1,'PDF canvas blank has no page identity');
            const text=componentRoundTrip(pdfPoint(views[0],40,35));assert(text.ui.pdf,'PDF text does not share page coordinates');
            const marked=componentRoundTrip(pdfPoint(views[0],120,35));assert(marked.ui.pdf?.mark,'PDF annotation identity missing');
            const second=componentRoundTrip(pdfPoint(views[1],170,90));assert(second.ui.pdf?.page===2,'PDF second page lost identity');
            const thumbnailRect=thumbnailImage.getBoundingClientRect(),thumbnailCursor=componentRoundTrip({x:thumbnailRect.left+20,y:thumbnailRect.top+10});assert(thumbnailCursor.ui.pdf?.part==='thumbnail','PDF thumbnail has no semantic page identity');
            const thumbBorder=componentRoundTrip({x:thumbnailRect.left-2,y:thumbnailRect.top+10});thumbnail.classList.remove('selected');assert(resolveCursor(thumbBorder),'thumbnail selection changed blank identity');
            thumbnail.style.display='none';assert(resolveCursor(thumbnailCursor)===null,'hidden PDF thumbnail painted on document page');thumbnail.style.display='';
            const gapRect=pages[0].getBoundingClientRect(),gap=componentRoundTrip({x:gapRect.left+30,y:gapRect.bottom+5});
            rotation=1;scale=1.2;for(const page of pages){page.style.width='144px';page.style.height='240px';}
            thumbnailImage.style.width='60px';thumbnailImage.style.height='80px';thumbnail.style.height='90px';
            const rotatedThumbnail=resolveCursor(thumbnailCursor),thumbnailAfter=thumbnailImage.getBoundingClientRect();assert(rotatedThumbnail&&near(rotatedThumbnail.x,thumbnailAfter.left+10)&&near(rotatedThumbnail.y,thumbnailAfter.top+20),'thumbnail used control fraction after rotation');
            const mapped=resolveCursor(blank),expected=pdfPoint(views[0],170,90);assert(mapped&&near(mapped.x,expected.x)&&near(mapped.y,expected.y),'PDF rotation/zoom drifts');
            const mark=fixture.querySelector('.pdf__rect');mark.style.left='30px';mark.style.top='132px';mark.style.width='24px';mark.style.height='48px';assert(resolveCursor(marked),'rotated PDF annotation lost identity');
            assert(resolveCursor(gap),'PDF page gap vanished after scaling');
            mark.remove();assert(resolveCursor(marked)===null,'missing PDF annotation inherited page position');
            pdfObject.pdfDocument.fingerprints[0]='replaced-file';assert(resolveCursor(blank)===null,'replaced PDF content matched old file');pdfObject.pdfDocument.fingerprints[0]='test-pdf-file';
            fixture.scrollTop=270;assert(resolveCursor(text)===null,'offscreen PDF page painted');assert(resolveCursor(second),'visible second PDF page disappeared');fixture.scrollTop=0;
            const cover=document.createElement('div');cover.style.cssText='position:fixed;inset:0;z-index:101;background:white';document.body.append(cover);assert(resolveCursor(blank)===null,'covered PDF page painted');cover.remove();
            views[0].canvas.remove();assert(resolveCursor(blank)===null,'unrendered PDF page painted');
        }finally{testTabs.length=0;fixture.remove();}
    });
    await test('PDF查找框按字素与留白定位，滚动、文件切换和旧比例锚点不误画',async()=>{
        const fixture=document.createElement('div');fixture.className='layout-tab-container';fixture.style.cssText='position:fixed;left:30px;top:30px;width:650px;height:180px;z-index:100;background:white';
        fixture.innerHTML='<div data-id="pdf-search-test"><div class="pdf__outer"><div id="findbar" class="findbar b3-menu"><input id="findInput" class="toolbarField b3-text-field"></div></div></div>';document.body.append(fixture);
        const panel=fixture.firstElementChild,field=fixture.querySelector('input'),reference=document.createElement('div'),value='PDF 中文 😀 é 👨‍👩‍👧‍👦 '+'tail '.repeat(15),css='font:18px/30px monospace;width:500px;height:42px;padding:6px 8px;border:0;box-sizing:border-box;white-space:pre;';
        field.style.cssText=css;field.value=value;reference.style.cssText=css+'position:fixed;left:-10000px;top:0';reference.textContent=value;document.body.append(reference);
        const model={element:panel,pdfObject:{pdfDocument:{fingerprints:['pdf-search-file'],numPages:2},pdfViewer:{getPageView:()=>null}}};testTabs.push({model,panelElement:panel,headElement:document.createElement('li')});
        try{
            const point=offset=>{const s=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value).containing(offset),r=document.createRange();r.setStart(reference.firstChild,s.index);r.setEnd(reference.firstChild,s.index+s.segment.length);const g=r.getBoundingClientRect(),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();return {x:b.left+g.left-a.left+g.width*.5-field.scrollLeft,y:b.top+g.top-a.top+g.height*.5};};
            const samples=[0,4,7,10,13].map(offset=>({offset,anchor:componentRoundTrip(point(offset))}));assert(samples.every(s=>s.anchor.ui.textHash),'PDF find still uses whole input ratios');
            const b=field.getBoundingClientRect(),padding=componentRoundTrip({x:b.left+4,y:b.top+b.height*.5});assert(Object.values(padding.ui.edges).flat().some(e=>e.kind==='field'),'PDF padding has no content bounds');
            field.parentElement.classList.add('wrapContainers');assert(samples.every(s=>resolveCursor(s.anchor))&&resolveCursor(padding),'responsive PDF findbar lost identity');field.parentElement.classList.remove('wrapContainers');
            const old={...samples[0].anchor,ui:{...samples[0].anchor.ui,edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:[{kind:'self',side:'start'},{kind:'self',side:'end'}]}}};delete old.ui.textHash;assert(resolveCursor(old)===null,'old PDF input ratios painted');
            for(const width of [350,580]){field.style.width=width+'px';reference.style.width=width+'px';for(const s of samples){const p=point(s.offset),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'PDF find width drift');}}
            field.style.width='120px';reference.style.width='120px';field.scrollLeft=300;
            for(const s of samples){const p=point(s.offset),r=field.getBoundingClientRect(),a=resolveCursor(s.anchor),visible=p.x>=r.left+8&&p.x<r.right-8;assert(visible?a&&Math.hypot(a.x-p.x,a.y-p.y)<.02:a===null,'PDF find scroll clipping');}
            assert(resolveCursor(padding),'PDF visible padding lost on scroll');field.scrollLeft=0;field.style.width='500px';reference.style.width='500px';
            const plugin={currentDocument:()=>null,i18n:{pageWorkspace:'Workspace'},dialogBase:{kind:'asset',path:'assets/unrelated.pdf',title:'Other PDF'}},pointOnText=point(0),nativeAnchor=componentRoundTrip(pointOnText,plugin);plugin.dialogBase={kind:'workspace',title:''};assert(resolveCursor(nativeAnchor,plugin),'PDF find follows unrelated active page');
            model.pdfObject.pdfDocument.fingerprints[0]='other-pdf';assert(samples.every(s=>resolveCursor(s.anchor)===null)&&resolveCursor(padding)===null,'another PDF inherited find pointers');model.pdfObject.pdfDocument.fingerprints[0]='pdf-search-file';
            field.value='different query';assert(samples.every(s=>resolveCursor(s.anchor)===null),'different PDF query painted');assert(resolveCursor(padding),'PDF padding inherited query text');field.value=value;
            field.parentElement.style.visibility='hidden';assert(samples.every(s=>resolveCursor(s.anchor)===null)&&resolveCursor(padding)===null,'closed PDF findbar painted');field.parentElement.style.visibility='';
            field.setAttribute('data-private','');assert(!componentTextField(field)&&samples.every(s=>resolveCursor(s.anchor)===null),'private PDF find eligible');field.removeAttribute('data-private');
            field.style.webkitTextSecurity='disc';Object.defineProperty(field,'value',{configurable:true,get(){throw Error('masked PDF value read');}});assert(!componentTextField(field),'masked PDF find eligible');assert(componentNearText(field,pointOnText)===null,'masked PDF measured');delete field.value;field.style.webkitTextSecurity='';
            testTabs.length=0;Object.defineProperty(field,'value',{configurable:true,get(){throw Error('unknown PDF value read');}});assert(!componentTextField(field)&&componentNearText(field,pointOnText)===null,'unregistered PDF field measured');
        }finally{testTabs.length=0;fixture.remove();reference.remove();}
    });
    await test('PDF页码字形和留白随改宽与加载状态定位，改值和换文件不误画',async()=>{
        const fixture=document.createElement('div');fixture.className='layout-tab-container';fixture.style.cssText='position:fixed;left:30px;top:30px;width:400px;height:150px;z-index:100;background:white';
        fixture.innerHTML='<div data-id="pdf-number-test"><div class="pdf__outer"><input type="number" id="pageNumber" class="toolbarField pageNumber b3-text-field"></div></div><style>.pageNumber::-webkit-inner-spin-button,.pageNumber::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}</style>';document.body.append(fixture);
        const panel=fixture.firstElementChild,field=fixture.querySelector('input'),reference=document.createElement('div'),css='font:18px/30px monospace;width:80.59375px;height:42px;padding:6px 8px;border:0;box-sizing:border-box;appearance:none;text-align:right;white-space:pre;';field.style.cssText=css;field.value='128';reference.style.cssText=css+'position:fixed;left:-10000px;top:0';reference.textContent=field.value;document.body.append(reference);
        const model={path:'assets/number-test.pdf',element:panel,pdfObject:{pdfDocument:{fingerprints:['pdf-number-file'],numPages:2000},pdfViewer:{getPageView:()=>null}}};testTabs.push({model,panelElement:panel,headElement:document.createElement('li')});
        try{
            const point=offset=>{const r=rectAt(reference,offset),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();return {x:b.left+r.left-a.left+r.width*.5-field.scrollLeft,y:b.top+r.top-a.top+r.height*.5};};
            const samples=[0,1,2].map(offset=>({offset,anchor:componentRoundTrip(point(offset))}));assert(samples.every(s=>s.anchor.ui.textHash),'PDF page number still uses control ratios');
            const leading=ratio=>{const a=field.getBoundingClientRect(),g=rectAt(reference,0),r=reference.getBoundingClientRect();return {x:a.left+8+(g.left-r.left-8)*ratio,y:point(0).y};},gaps=[.25,.5,.75].map(ratio=>({ratio,anchor:componentRoundTrip(leading(ratio))}));assert(gaps.every(s=>s.anchor.ui.textHash),'numeric leading gap has no text identity');
            const paddingPoint=side=>{const r=field.getBoundingClientRect();return side==='left'?{x:r.left+4,y:r.top+r.height*.5}:side==='right'?{x:r.right-4,y:r.top+r.height*.5}:side==='top'?{x:r.left+r.width*.5,y:r.top+3}:{x:r.left+r.width*.5,y:r.bottom-3};},padding=['left','right','top','bottom'].map(side=>({side,anchor:componentRoundTrip(paddingPoint(side))}));
            field.classList.add('loading');assert([...samples,...gaps,...padding].every(s=>resolveCursor(s.anchor)),'native PDF loading state lost visible glyphs and padding');const loadingSamples=[...samples.map(s=>componentRoundTrip(point(s.offset))),...gaps.map(s=>componentRoundTrip(leading(s.ratio))),...padding.map(s=>componentRoundTrip(paddingPoint(s.side)))];field.classList.remove('loading');assert(loadingSamples.every(anchor=>resolveCursor(anchor)),'finished PDF loading lost visible glyphs and padding');
            field.classList.add('loading');field.style.backgroundImage='linear-gradient(red,red)';assert([...samples,...gaps,...padding].every(s=>resolveCursor(s.anchor)===null),'decorated loading state inherited unmeasured blank');field.style.backgroundImage='';field.classList.remove('loading');
            field.parentElement.classList.add('pdf__outer--maximized','sidebarOpen');assert([...samples,...gaps,...padding].every(s=>resolveCursor(s.anchor)),'PDF toolbar layout changed identity');field.parentElement.classList.remove('pdf__outer--maximized','sidebarOpen');
            for(const width of [100,150]){field.style.width=width+'px';reference.style.width=width+'px';for(const s of samples){const p=point(s.offset),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'numeric glyph width drift');}for(const s of gaps){const p=leading(s.ratio),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'numeric leading whitespace drift');}}
            field.style.fontSize='22px';reference.style.fontSize='22px';for(const s of samples){const p=point(s.offset),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'numeric glyph font drift');}
            field.style.width='16px';reference.style.width='16px';for(const height of [42,12]){field.style.height=height+'px';reference.style.height=height+'px';assert([...samples,...gaps].every(s=>resolveCursor(s.anchor)===null),'zero content area painted digits');for(const s of padding){const p=paddingPoint(s.side),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'collapsed content lost visible padding '+s.side);}}field.style.width='150px';reference.style.width='150px';field.style.height='42px';reference.style.height='42px';
            field.stepUp();assert(field.value==='129');assert([...samples,...gaps].every(s=>resolveCursor(s.anchor)===null),'different page number inherited text or gap');assert(padding.every(s=>resolveCursor(s.anchor)),'numeric padding inherited page value');field.value='128';
            model.pdfObject.pdfDocument.fingerprints[0]='replaced-same-path';assert([...samples,...gaps,...padding].every(s=>resolveCursor(s.anchor)===null),'same path with different PDF inherited number pointer');model.pdfObject.pdfDocument.fingerprints[0]='pdf-number-file';
            const old={...samples[0].anchor,ui:{...samples[0].anchor.ui,edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:[{kind:'self',side:'start'},{kind:'self',side:'end'}]}}};delete old.ui.textHash;assert(resolveCursor(old)===null,'old number control ratio painted');
            Object.defineProperty(field,'validity',{configurable:true,value:{badInput:true}});Object.defineProperty(field,'value',{configurable:true,get(){throw Error('unavailable numeric display read');}});assert(componentNearText(field,point(0))===null,'invalid numeric display measured');delete field.validity;delete field.value;
            field.style.appearance='auto';Object.defineProperty(field,'value',{configurable:true,get(){throw Error('unsupported number appearance read');}});assert(componentNearText(field,point(0))===null,'native spinner layout guessed');assert(componentFieldContent(field)===null,'native spinner content box guessed');delete field.value;field.style.appearance='none';
            field.setAttribute('data-private','');assert(!componentTextField(field),'private number eligible');field.removeAttribute('data-private');field.style.webkitTextSecurity='disc';assert(!componentTextField(field),'masked number eligible');field.style.webkitTextSecurity='';
            testTabs.length=0;Object.defineProperty(field,'value',{configurable:true,get(){throw Error('unregistered numeric field read');}});assert(!componentTextField(field)&&componentNearText(field,point(0))===null,'unknown numeric field measured');
        }finally{testTabs.length=0;fixture.remove();reference.remove();}
    });
    await test('收起的原生下拉文字、箭头和留白按本地字形与背景图定位',async()=>{
        const fixture=document.createElement('div');fixture.className='b3-dialog';fixture.dataset.key='dialog-closed-select';fixture.style.cssText='position:fixed;left:30px;top:30px;background:white;z-index:100';fixture.innerHTML='<div class="b3-dialog__container"><select id="closed-select" class="closed-select"><option value="first">中文 😀 (one)</option><option value="second">另一个值</option></select></div><style>.closed-select::picker-icon{display:none}</style>';document.body.append(fixture);
        const field=fixture.querySelector('select'),svg='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M7 10l5 5 5-5z"/></svg>';
        field.style.cssText='appearance:base-select;display:flex;box-sizing:border-box;width:220px;height:28px;padding:4px 26px 4px 8px;border:0;gap:7px;font:14px/20px sans-serif;white-space:nowrap;overflow:hidden;background-repeat:no-repeat;background-position:calc(100% - 2px) 50%;';field.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
        const points=()=>{const css=getComputedStyle(field),r=field.getBoundingClientRect(),reference=document.createElement('select'),button=document.createElement('button'),content=document.createElement('selectedcontent');reference.className='closed-select collab-text-measure';for(const name of css)reference.style.setProperty(name,css.getPropertyValue(name));reference.style.cssText+=';position:fixed;left:'+r.left+'px;top:'+r.top+'px;margin:0;opacity:0;pointer-events:none;';button.style.cssText='font:inherit;line-height:inherit;white-space:inherit';button.append(content);reference.append(button,field.selectedOptions[0].cloneNode(true));document.body.append(reference);try{const rows=[],range=document.createRange();for(const {index,segment}of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(content.textContent)){range.setStart(content.firstChild,index);range.setEnd(content.firstChild,index+segment.length);const t=range.getBoundingClientRect();rows.push({kind:'glyph',offset:index,point:{x:(t.left+t.right)/2,y:(t.top+t.bottom)/2}});}range.selectNodeContents(content);const t=range.getBoundingClientRect(),first=rows[0].point,last=rows.at(-1).point;range.setStart(content.firstChild,0);range.setEnd(content.firstChild,1);const firstRect=range.getBoundingClientRect(),iconRight=r.right-(field.dataset.moved ? 8:2),iconLeft=iconRight-24,top=r.top+4,bottom=r.bottom-4;for(const [side,x,y]of [['left',r.left+4,(top+bottom)/2],['right',(t.right+r.right-parseFloat(css.paddingRight))/2,last.y],['top',(r.left+8+r.right-parseFloat(css.paddingRight))/2,(r.top+top)/2],['bottom',(r.left+8+r.right-parseFloat(css.paddingRight))/2,(bottom+r.bottom)/2],['above',first.x,(top+firstRect.top)/2],['below',first.x,(firstRect.bottom+bottom)/2]])if(side!=='above'&&side!=='below'||side==='above'&&firstRect.top>top||side==='below'&&firstRect.bottom<bottom)rows.push({kind:'blank',side,point:{x,y}});for(const u of [.25,.5,.75])for(const v of [.25,.5,.75])rows.push({kind:'arrow',u,v,point:{x:iconLeft+24*u,y:(r.top+r.bottom)/2+24*(v-.5)}});return rows;}finally{reference.remove();}};
        try{const before=field.outerHTML,focus=document.activeElement,samples=points().map(row=>({...row,anchor:componentRoundTrip(row.point)}));assert(samples.filter(s=>s.kind==='glyph').every(s=>s.anchor.ui.textHash),'selected text has no content identity');assert(samples.filter(s=>s.kind==='arrow').every(s=>s.anchor.ui.imagePoint&&!s.anchor.ui.textHash),'arrow borrowed selected text or control ratio');assert(field.outerHTML===before&&document.activeElement===focus,'measurement changed native control');
            field.style.width='340.5px';field.style.height='42px';field.style.fontSize='22px';field.style.lineHeight='30px';field.style.paddingRight='52px';field.style.backgroundPosition='calc(100% - 8px) 50%';field.dataset.moved='true';const expected=points();for(const sample of samples){const p=resolveCursor(sample.anchor),q=expected.find(row=>row.kind===sample.kind&&row.offset===sample.offset&&row.side===sample.side&&row.u===sample.u&&row.v===sample.v)?.point;assert(q?p&&Math.hypot(p.x-q.x,p.y-q.y)<.03:p===null,'closed select drifted '+sample.kind+' '+sample.side+' '+sample.offset+' '+JSON.stringify({p,q,anchor:sample.anchor.ui}));}
            const arrow=samples.find(s=>s.kind==='arrow'&&s.u===.5&&s.v===.5);field.value='second';assert(samples.filter(s=>s.kind==='glyph').every(s=>resolveCursor(s.anchor)===null),'different selected label inherited text');assert(resolveCursor(arrow.anchor),'same arrow disappeared after changing label');assert(samples.filter(s=>s.kind==='blank'&&['left','top','bottom'].includes(s.side)).every(s=>resolveCursor(s.anchor)),'same padding disappeared after changing label');field.value='first';field.style.width='80.5px';const clipped=points();for(const s of samples.filter(s=>s.kind==='glyph')){const q=clipped.find(t=>t.kind==='glyph'&&t.offset===s.offset).point,p=resolveCursor(s.anchor),visible=document.elementFromPoint(q.x,q.y)===field;assert(visible?p&&Math.hypot(p.x-q.x,p.y-q.y)<.03:p===null,'partly visible select glyph lost '+s.offset);}assert(samples.filter(s=>s.kind==='glyph').some(s=>resolveCursor(s.anchor)===null),'clipped label remained visible');assert(resolveCursor(arrow.anchor)===null,'text covering arrow inherited background pointer');
            field.style.width='340.5px';field.options[0].textContent='العربية (ar)';const rtl=points().map(row=>({...row,anchor:componentRoundTrip(row.point)}));field.style.fontSize='14px';field.style.lineHeight='20px';field.style.height='28px';field.style.width='220px';const smaller=points();for(const s of rtl){const q=smaller.find(row=>row.kind===s.kind&&row.offset===s.offset&&row.side===s.side&&row.u===s.u&&row.v===s.v)?.point,p=resolveCursor(s.anchor);assert(q?p&&Math.hypot(p.x-q.x,p.y-q.y)<.03:p===null,'closed bidi text drifted '+s.kind+' '+s.offset+' '+s.side+' '+JSON.stringify({p,q,anchor:s.anchor.ui}));}field.style.direction='rtl';const rtlLayout=points().filter(s=>s.kind==='glyph').map(s=>({...s,anchor:componentRoundTrip(s.point)}));field.style.width='340.5px';field.style.fontSize='22px';field.style.lineHeight='30px';field.style.height='42px';const enlarged=points();for(const s of rtlLayout){const p=resolveCursor(s.anchor),q=enlarged.find(t=>t.kind==='glyph'&&t.offset===s.offset).point;assert(p&&Math.hypot(p.x-q.x,p.y-q.y)<.03,'RTL select layout drifted '+s.offset);}field.options[0].textContent='';const empty=field.getBoundingClientRect();componentRoundTrip({x:empty.left+20,y:empty.top+14});
            const old={...samples[0].anchor,ui:{...samples[0].anchor.ui,edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:[{kind:'self',side:'start'},{kind:'self',side:'end'}]}}};delete old.ui.textHash;assert(resolveCursor(old)===null,'legacy select ratio bypassed text geometry');
        }finally{fixture.remove();}assert(!document.querySelector('.collab-text-measure'),'select measurement leaked');
    });
    await test('私有或无法测量的原生下拉框不读取选项或回退到比例',async()=>{
        const field=document.createElement('select');field.id='private-select';field.style.cssText='position:fixed;left:30px;top:30px;width:200px;height:30px;z-index:100';field.innerHTML='<option>私有</option>';field.dataset.private='';document.body.append(field);Object.defineProperty(field,'selectedOptions',{get(){throw Error('private selection read');}});try{const r=field.getBoundingClientRect();assert(!componentTextField(field)&&captureCursor({x:r.left+10,y:r.top+10})===null,'private select was read');delete field.dataset.private;field.style.appearance='auto';field.removeAttribute('id');Object.defineProperty(field,'textContent',{get(){throw Error('hidden options read');}});assert(componentTextHash(field)==='','unsupported select hashed hidden options');assert(captureCursor({x:r.left+10,y:r.top+10})===null,'unknown native select guessed a ratio');}finally{field.remove();}
    });
    await test('原生滑块圆点、轨道和留白跟随值与尺寸，旧比例不绘制',async()=>{
        const fixture=document.createElement('div');fixture.id='range-fixture';fixture.style.cssText='position:fixed;left:30px;top:30px;width:450px;height:160px;background:white;z-index:100';fixture.innerHTML='<div class="config-range__desktop" aria-label="20"><input id="range-control" class="b3-slider" type="range" min="0" max="100" value="20"></div><style>#range-control{appearance:none;width:200px;height:16px;padding:0 4px;border:0;margin:0;box-sizing:content-box}#range-control::-webkit-slider-runnable-track{appearance:none;height:2px;background:gray}#range-control::-webkit-slider-thumb{appearance:none;width:10px;height:10px;border:0;padding:0;margin-top:-4px;transform:scale(1);transition:transform 100ms linear}#range-control:focus::-webkit-slider-thumb{transform:scale(1.5)}#range-fixture:has(#range-control:focus) #range-reference{transform:scale(1.5)!important}</style><style media="print">#range-control::-webkit-slider-thumb{width:90px;height:90px}</style><i id="range-reference" style="position:fixed;left:-10000px;width:10px;height:10px;transform:scale(1);transition:transform 100ms linear"></i>';document.body.append(fixture);
        const input=fixture.querySelector('input'),reference=fixture.querySelector('i'),center=()=>{const r=input.getBoundingClientRect(),ratio=input.valueAsNumber/100;return {x:r.left+9+(r.width-18)*(getComputedStyle(input).direction==='rtl'?1-ratio:ratio),y:r.top+8};},point=(u,v,scale=1)=>{const c=center();return {x:c.x+(u-.5)*10*scale,y:c.y+(v-.5)*10*scale};};
        try{
            const samples=[.25,.5,.75].flatMap(u=>[.25,.5,.75].map(v=>({u,v,anchor:componentRoundTrip(point(u,v))})));assert(samples.every(s=>s.anchor.ui.version===3&&Object.values(s.anchor.ui.edges).flat().every(e=>e.kind==='range-thumb')),'thumb still shares control or underlying track');
            const r=input.getBoundingClientRect(),left=componentRoundTrip({x:(r.left+4+center().x-5)/2,y:center().y}),padding=componentRoundTrip({x:r.left+2,y:center().y}),above=componentRoundTrip({x:center().x,y:r.top+1.5}),below=componentRoundTrip({x:center().x,y:r.bottom-1.5});
            input.value='80';input.parentElement.setAttribute('aria-label','80');for(const sample of samples){const expected=point(sample.u,sample.v),actual=resolveCursor(sample.anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.02,'range pointer lost native thumb');}assert(resolveCursor(left)&&resolveCursor(padding),'changed value lost visible track or padding');
            input.style.width='320px';for(const sample of samples){const expected=point(sample.u,sample.v),actual=resolveCursor(sample.anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.02,'thumb width drift');}
            input.style.direction='rtl';for(const sample of samples){const expected=point(sample.u,sample.v),actual=resolveCursor(sample.anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.02,'RTL thumb drift');}input.style.direction='ltr';
            getComputedStyle(reference).transform;input.focus();let frames=0,maxDrift=0,animatedFrames=0;await new Promise((resolve,reject)=>{let start;const tick=now=>{try{start??=now;const scale=new DOMMatrix(getComputedStyle(reference).transform).a;if(scale>1.001&&scale<1.499)animatedFrames++;for(const sample of samples){const expected=point(sample.u,sample.v,scale),actual=resolveCursor(sample.anchor);assert(actual,'animated thumb disappeared');maxDrift=Math.max(maxDrift,Math.hypot(actual.x-expected.x,actual.y-expected.y));}frames++;if(now-start<140)requestAnimationFrame(tick);else resolve();}catch(error){reject(error);}};requestAnimationFrame(tick);});assert(frames>2&&animatedFrames>0&&maxDrift<.05,'thumb transition diverged from independent reference '+JSON.stringify({frames,animatedFrames,maxDrift,visibility:document.visibilityState,hasFocus:document.hasFocus()}));document.getElementById('results').dataset.rangeAnimation=JSON.stringify({frames,animatedFrames,maxDrift});
            input.value='0';for(const sample of samples){const expected=point(sample.u,sample.v,new DOMMatrix(getComputedStyle(reference).transform).a),actual=resolveCursor(sample.anchor);assert(actual&&Math.hypot(actual.x-expected.x,actual.y-expected.y)<.02,'endpoint thumb borrowed padding boundary '+JSON.stringify({expected,actual,edges:sample.anchor.ui.edges,range:componentRange(input)}));}const scale=new DOMMatrix(getComputedStyle(reference).transform).a;assert(resolveCursor(left)===null,'vanished track gap painted');const visiblePadding=resolveCursor(padding),paddingWidth=Math.max(0,Math.min(4,9-5*scale));assert(visiblePadding&&Math.hypot(visiblePadding.x-input.getBoundingClientRect().left-paddingWidth*.5,visiblePadding.y-center().y)<.02,'remaining endpoint padding drifted');for(const [anchor,y]of [[above,input.getBoundingClientRect().top+(8-5*scale)*.5],[below,input.getBoundingClientRect().bottom-(8-5*scale)*.5]]){const p=resolveCursor(anchor);assert(p&&Math.hypot(p.x-center().x,p.y-y)<.02,'endpoint thumb-column whitespace lost padding boundary');}
            const old={...samples[0].anchor,ui:{...samples[0].anchor.ui,edges:{x:[{kind:'self',side:'start'},{kind:'self',side:'end'}],y:[{kind:'self',side:'start'},{kind:'self',side:'end'}]}}};assert(resolveCursor(old)===null,'legacy component range ratios painted');
            input.style.display='none';assert(samples.every(s=>resolveCursor(s.anchor)===null),'hidden range painted');input.style.display='';
            input.style.appearance='auto';assert(captureCursor(center())===null,'unknown native range guessed');input.style.appearance='none';
            input.setAttribute('data-private','');Object.defineProperty(input,'valueAsNumber',{configurable:true,get(){throw Error('private range read');}});assert(componentRange(input)===null&&captureCursor({x:40,y:40})===null,'private range measured');delete input.valueAsNumber;input.removeAttribute('data-private');
        }finally{fixture.remove();clearRangeStyles();}
    });
    await test('原生关系图按节点身份与场景坐标定位，缩放平移、节点移动和缺失不误画',async()=>{
        const fixture=document.createElement('div'),dock=document.createElement('button');fixture.className='dockPanel sy__graph';dock.className='dock__item';dock.dataset.type='graph';
        fixture.style.cssText='position:fixed;left:30px;top:30px;width:420px;height:280px;z-index:100;background:white';fixture.innerHTML='<div class="graph__svg" style="width:100%;height:100%"><canvas width="420" height="280" style="width:100%;height:100%"></canvas></div>';
        const container=fixture.firstElementChild,canvas=container.firstElementChild;
        const engine={container,data:{nodes:[{id:'first-node'},{id:'second-node'}],sizes:[10,12]},positions:[60,70,180,90],camera:{x:20,y:20,scale:1},positionVersion:1};
        engine.hitTest=(x,y)=>{for(let i=0;i<engine.data.nodes.length;i++)if(Math.hypot(x-engine.positions[i*2]*engine.camera.scale-engine.camera.x,y-engine.positions[i*2+1]*engine.camera.scale-engine.camera.y)<=engine.data.sizes[i]*engine.camera.scale)return i;return -1;};
        const model={type:'local',rootId:'20261030165150-doc0001',parent:{panelElement:fixture},graphEngine:engine};
        document.body.append(fixture,dock);dockModels.set('graph',model);
        try{
            const nodePoint={x:30+80+3,y:30+90+2},anchor=componentRoundTrip(nodePoint);assert(anchor.ui.graph?.node===componentHash('first-node'),'node identity missing');
            const blank=componentRoundTrip({x:330,y:230});assert(blank.ui.graph?.node===null,'blank graph position not captured');
            engine.camera={x:-10,y:5,scale:1.5};
            const moved=resolveCursor(anchor);assert(moved && near(moved.x,30-10+(60+3)*1.5)&&near(moved.y,30+5+(70+2)*1.5),'node lost camera transform');
            const space=resolveCursor(blank);assert(space && near(space.x,30-10+280*1.5),'graph blank lost model coordinate');
            engine.positions[0]+=30;engine.positionVersion++;
            const shifted=resolveCursor(anchor);assert(shifted && near(shifted.x,moved.x+45),'node movement lost identity');assert(resolveCursor(blank)===null,'different blank scene painted');
            engine.data.nodes.reverse();engine.data.sizes.reverse();engine.positions=[180,90,90,70];engine.positionVersion++;
            assert(resolveCursor(anchor),'node reorder lost identity');
            model.rootId='20261030165150-other01';assert(resolveCursor(anchor)===null,'other local graph matched');model.rootId='20261030165150-doc0001';
            engine.data={nodes:[],sizes:[]};engine.positions=[];engine.positionVersion++;assert(resolveCursor(anchor)===null,'missing graph node painted');
            dockModels.delete('graph');assert(captureCursor(nodePoint)===null,'opaque custom canvas guessed a position');
        }finally{dockModels.delete('graph');fixture.remove();dock.remove();}
    });
    await test('零尺寸祖先、溢出图标和跨域嵌入边界不会丢失或猜测定位',async()=>{
        const fixture=document.createElement('div');fixture.id='overflow-fixture';fixture.style.cssText='position:fixed;left:30px;top:30px;width:350px;height:150px;z-index:100;background:white';
        fixture.innerHTML='<div style="width:0;height:0"><div data-name="attribute-count" style="position:absolute;left:30px;top:20px;width:25px;height:25px">1</div></div><button style="position:absolute;left:90px;top:20px;width:40px;height:30px"><svg style="width:16px;height:16px;overflow:visible"><path d="M0 0H16V16H0Z"/></svg></button>';
        document.body.append(fixture);
        try{
            const count=fixture.querySelector('[data-name]'),r=count.getBoundingClientRect();componentRoundTrip({x:r.left+3,y:r.top+3});
            const svg=fixture.querySelector('svg'),s=svg.getBoundingClientRect(),point={x:s.left+1,y:s.top+1},anchor=componentRoundTrip(point);
            const component={surface:'ui',documentId:null,blockId:null,...captureComponent(document.elementFromPoint(point.x,point.y),undefined,point)};
            svg.querySelector('path').style.opacity='0';
            assert(resolveCursor(anchor)===null && resolveCursor(component)===null,'transparent child of a visible control painted');svg.querySelector('path').style.opacity='1';
            const embedded=document.createElement('iframe');embedded.setAttribute('sandbox','');embedded.srcdoc='<button>Unreachable internal component</button>';fixture.append(embedded);
            await new Promise(resolve=>embedded.onload=resolve);const f=embedded.getBoundingClientRect();assert(captureCursor({x:f.left+20,y:f.top+20})===null,'cross-origin frame guessed a fraction');
        }finally{fixture.remove();}
    });
    await test('图片按实际图像定位，适应 contain 留白和 cover 裁切，消失的留白不画到图中',async()=>{
        const image=document.createElement('img');image.id='image-fit-fixture';image.style.cssText='position:fixed;left:30px;top:30px;width:300px;height:300px;object-fit:contain;object-position:50% 50%;z-index:100;background:white';
        image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="blue"/></svg>');
        const loaded=new Promise(resolve=>image.onload=resolve);document.body.append(image);await loaded;
        try{
            const rect=componentImageRect(image),point={x:rect.left+rect.width*.25,y:rect.top+rect.height*.75};
            const anchor=componentRoundTrip(point),blank=componentRoundTrip({x:40,y:40});assert(anchor.ui.imagePoint,'image pixel not identified');
            image.style.width='400px';image.style.height='200px';
            const moved=resolveCursor(anchor),after=componentImageRect(image);
            assert(moved && near(moved.x,after.left+after.width*.25)&&near(moved.y,after.top+after.height*.75),'image point followed box rather than image');
            assert(resolveCursor(blank)===null,'missing letterbox area inherited pixel position');
            image.style.width='100px';image.style.height='300px';image.style.objectFit='cover';
            assert(resolveCursor(anchor)===null,'cropped-away image pixel painted');
        }finally{image.remove();}
    });
    await test('命令面板搜索字形随改宽和滚动定位，旧比例与不同查询不绘制',async()=>{
        const fixture=document.createElement('div');fixture.dataset.key='dialog-commandpanel';fixture.innerHTML='<div class="b3-dialog" style="position:fixed;left:30px;top:30px;width:600px;height:200px;z-index:100;background:white"><div class="b3-dialog__container"><div class="b3-dialog__header">命令面板</div><div class="search__header"><input aria-label="命令面板" class="b3-text-field b3-text-field--text"></div></div></div>';document.body.append(fixture);
        const field=fixture.querySelector('input'),reference=document.createElement('div'),value='Command 中文 😀 é 👨‍👩‍👧‍👦 '+ 'tail '.repeat(12),css='font:18px/30px monospace;padding:6px 8px 6px 32px;border:0;box-sizing:border-box;width:580.59375px;height:42px;white-space:pre;';field.style.cssText=css;reference.style.cssText=css+'position:fixed;left:-10000px;top:0';field.value=value;reference.textContent=value;document.body.append(reference);
        try{
            const expected=offset=>{const segment=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value).containing(offset),r=document.createRange();r.setStart(reference.firstChild,segment.index);r.setEnd(reference.firstChild,segment.index+segment.segment.length);const g=r.getBoundingClientRect(),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();return {x:b.left+g.left-a.left+g.width*.5-field.scrollLeft,y:b.top+g.top-a.top+g.height*.5};};
            const samples=[0,8,11,14,17].map(offset=>({offset,anchor:componentRoundTrip(expected(offset))}));assert(samples.every(s=>s.anchor.ui.version===3&&s.anchor.ui.textHash),'command search still uses control ratios');
            field.style.width='400px';reference.style.width='400px';for(const s of samples){const p=expected(s.offset),a=resolveCursor(s.anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'command search glyph drift');}
            const legacy={...samples[0].anchor,ui:{version:2,kind:'dialog',key:'dialog-commandpanel',label:'命令面板',tag:'input',classes:'b3-text-field b3-text-field--text',path:[],page:{kind:'control',control:'barCommand',title:'命令面板'}},x:.1,y:.5};assert(resolveUIAnchor(legacy.ui)===field,'legacy fixture missing');assert(resolveCursor(legacy)===null,'legacy command ratio bypassed glyph identity');
            field.scrollLeft=100;for(const s of samples){const p=expected(s.offset),b=field.getBoundingClientRect(),a=resolveCursor(s.anchor),visible=p.x>=b.left+32&&p.x<b.right-8;assert(visible?a&&Math.hypot(a.x-p.x,a.y-p.y)<.02:a===null,'command scroll clipping');}
            field.value='other query';assert(samples.every(s=>resolveCursor(s.anchor)===null),'other command query inherited glyph');field.value=value;field.style.display='none';assert(samples.every(s=>resolveCursor(s.anchor)===null),'hidden command field painted');
        }finally{fixture.remove();reference.remove();}
    });
    await test('搜索输入框四周内边距留白按内容边界定位，不继承被裁掉的字形',async()=>{
        const field=document.createElement('input'),header=document.createElement('div');header.className='search__header';header.style.cssText='position:fixed;left:30px;top:30px;z-index:100';field.className='b3-text-field';field.style.cssText='font:18px/30px monospace;width:500px;height:42px;padding:6px 8px 6px 32px;border:0;box-sizing:border-box';field.value='x'.repeat(100);header.append(field);document.body.append(header);
        try{
            const point=side=>{const r=field.getBoundingClientRect(),x=(r.left+32+r.right-8)*.5,y=(r.top+r.bottom)*.5;return side==='left'?{x:r.left+16,y}:side==='right'?{x:r.right-4,y}:side==='top'?{x,y:r.top+3}:{x,y:r.bottom-3};};
            const samples=['left','right','top','bottom'].map(side=>({side,anchor:componentRoundTrip(point(side))}));assert(samples.every(s=>Object.values(s.anchor.ui.edges).flat().some(e=>e.kind==='field')),'padding has no content boundary');
            for(const width of [300,650]){field.style.width=width+'px';for(const s of samples){const a=resolveCursor(s.anchor),p=point(s.side);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'padding drift '+s.side);}}
            field.scrollLeft=200;field.value='other query';for(const s of samples){const a=resolveCursor(s.anchor),p=point(s.side);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'visible padding inherited query or scroll');}field.style.padding='0';assert(samples.every(s=>resolveCursor(s.anchor)===null),'removed padding painted on text');
        }finally{header.remove();}
    });
    await test('原生搜索字段按字素定位，单行居中、多行换行及隐私边界不误画',async()=>{
        const fixture=document.createElement('div');fixture.id='search-field-fixture';fixture.style.cssText='position:fixed;left:30px;top:30px;width:650px;height:400px;background:white;z-index:100';
        fixture.innerHTML='<textarea id="searchInput" class="search__input"></textarea><input id="searchAssetInput"><input type="password" class="search__input"><textarea data-private class="search__input"></textarea><input id="unregistered-secret">';document.body.append(fixture);
        const reference=document.createElement('div');reference.style.cssText='position:fixed;left:-10000px;top:0';document.body.append(reference);
        const value='alpha  中文 😀 é 👨‍👩‍👧‍👦 '+ 'words '.repeat(12);
        try{
            for(const field of [fixture.children[0],fixture.children[1]]){
                const single=field.tagName==='INPUT',css='font:18px/30px monospace;padding:5px 8px;border:1px solid black;box-sizing:border-box;letter-spacing:0;white-space:'+(single?'pre':'pre-wrap')+';overflow-wrap:'+(single?'normal':'break-word')+';';
                field.style.cssText=css+'display:block;width:400px;height:'+(single?64:170)+'px';reference.style.cssText=css+'position:fixed;left:-10000px;top:0;width:400px;height:'+(single?64:170)+'px';
                if(single)reference.style.lineHeight='52px';field.value=value;reference.textContent=value;assert(typeof componentTextField==='function'&&componentTextField(field),'field eligibility '+JSON.stringify({type:field.type,security:getComputedStyle(field).getPropertyValue('-webkit-text-security'),html:field.outerHTML}));
                field.focus();field.setSelectionRange(2,5);field.scrollLeft=0;field.scrollTop=0;
                const expected=offset=>{const segment=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value).containing(offset),r=document.createRange();r.setStart(reference.firstChild,segment.index);r.setEnd(reference.firstChild,segment.index+segment.segment.length);const g=r.getBoundingClientRect(),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();return {x:b.left+g.left-a.left+g.width*.5-field.scrollLeft,y:b.top+g.top-a.top+g.height*.5-field.scrollTop};};
                const samples=[0,7,10,13,16,19].map(offset=>({offset,anchor:componentRoundTrip(expected(offset))}));
                for(const width of [320,530]){field.style.width=width+'px';reference.style.width=width+'px';for(const {offset,anchor}of samples){const p=expected(offset),actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-p.x,actual.y-p.y)<.02,'search glyph box ratio '+JSON.stringify({single,offset,p,actual}));assert(anchor.ui.textHash,'search text hash missing');assert(!JSON.stringify(anchor).includes('alpha'),'raw search query on wire');}}
                if(single){const offset=7,p=expected(offset),anchor=componentRoundTrip(p),b=field.getBoundingClientRect();field.style.width=(p.x-b.left+8)+'px';reference.style.width=field.style.width;assert(resolveCursor(anchor)===null,'glyph hidden by native input padding painted');field.style.width='200px';reference.style.width='200px';field.scrollLeft=100;assert(field.scrollLeft>0,'native input horizontal scroll unchanged');for(const {offset,anchor}of samples){const p=expected(offset),b=field.getBoundingClientRect(),actual=resolveCursor(anchor),visible=p.x>b.left+9&&p.x<b.right-9;assert(visible?actual&&Math.hypot(actual.x-p.x,actual.y-p.y)<.02:actual===null,'single-line scroll clipping '+JSON.stringify({offset,p,actual}));}}
                field.value='different query';assert(samples.every(s=>resolveCursor(s.anchor)===null),'different search query inherited pointer');field.value=value;
                assert(document.activeElement===field,'measurement stole focus');field.setSelectionRange(2,5);componentRoundTrip(expected(10));assert(field.selectionStart===2&&field.selectionEnd===5,'measurement changed native selection');
                const old=samples[0].anchor;field.setAttribute('data-private','');assert(resolveCursor(old)===null,'newly private field painted');field.removeAttribute('data-private');
                field.style.display='none';assert(resolveCursor(old)===null,'hidden field painted');
            }
            for(const field of [...fixture.children].slice(2)){field.value='TOP_SECRET';assert(!componentNearText(field,{x:0,y:0}),'private or unknown field value measured');assert(componentTextHash(field)===componentHash(field.textContent),'private input value entered content hash');}
            assert(!document.querySelector('.collab-text-measure'),'field measurement leaked');
        }finally{fixture.remove();reference.remove();}
    });
    await test('单行输入的原生内边距遮住字形时不把光标画到空白上',async()=>{
        const field=document.createElement('input'),reference=document.createElement('div');field.type='search';field.id='padding-search-fixture';field.value='x'.repeat(60);
        const css='font:20px/32px monospace;padding:5px 32px 5px 44px;border:0;box-sizing:border-box;width:500px;height:42px;white-space:pre;';field.style.cssText=css+'position:fixed;left:30px;top:30px;z-index:100;background:white';reference.style.cssText=css+'position:fixed;left:-10000px;top:0';reference.textContent=field.value;document.body.append(field,reference);
        try{
            const r=rectAt(reference,15),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect(),point={x:b.left+r.left-a.left+r.width*.5,y:b.top+r.top-a.top+r.height*.5},anchor=componentRoundTrip(point);
            field.style.width=(point.x-b.left+16)+'px';field.scrollLeft=0;assert(resolveCursor(anchor)===null,'clipped glyph painted in input padding');
            field.style.width='500px';assert(resolveCursor(anchor),'unclipped glyph did not recover');
        }finally{field.remove();reference.remove();}
    });
    await test('搜索占位文字按实际字形定位，敏感文本样式不读取值',async()=>{
        const field=document.createElement('input'),reference=document.createElement('div');field.type='search';field.id='placeholder-search-fixture';field.placeholder='查找 中文 😀';
        const css='font:20px/28px monospace;padding:6px;border:0;box-sizing:border-box;width:300px;height:40px;white-space:pre;';field.style.cssText=css+'position:fixed;left:30px;top:30px;z-index:100;background:white';reference.style.cssText=css+'position:fixed;left:-10000px;top:0';reference.textContent=field.placeholder;document.body.append(field,reference);
        try{
            const point=offset=>{const r=rectAt(reference,offset),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();return {x:b.left+r.left-a.left+r.width*.5,y:b.top+r.top-a.top+r.height*.5};};
            const samples=[0,3,6].map(offset=>({offset,anchor:componentRoundTrip(point(offset))}));field.style.width='420px';for(const {offset,anchor}of samples){const p=point(offset),a=resolveCursor(anchor);assert(a&&Math.hypot(a.x-p.x,a.y-p.y)<.02,'placeholder followed box instead of glyph');assert(anchor.ui.textHash,'placeholder content identity missing');}
            field.placeholder='另一个占位文字';assert(samples.every(s=>resolveCursor(s.anchor)===null),'different placeholder inherited text');field.placeholder=reference.textContent;
            field.value='visible';field.style.webkitTextSecurity='disc';Object.defineProperty(field,'value',{configurable:true,get(){throw Error('masked field value read');}});assert(!componentTextField(field),'masked field eligible');assert(!componentNearText(field,{x:0,y:0}),'masked field measured');assert(componentTextHash(field)===componentHash(''),'masked field entered content hash');
        }finally{field.remove();reference.remove();}
    });
    await test('源码字符随输入框改宽换行，空白和内容变化分别校验',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:380px;background:white;z-index:100';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261030165150-field01"></div><div class="protyle-wysiwyg"><div data-node-id="20261030165150-field02" data-type="NodeMathBlock">x</div></div><div class="protyle-util" style="position:absolute;left:0;top:0"><textarea></textarea></div>';
        const field=fixture.querySelector('textarea'),popup=field.parentElement,reference=document.createElement('div');
        const css='font:20px/28px monospace;tab-size:4;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;padding:8px;box-sizing:border-box;border:0;letter-spacing:0;';
        field.style.cssText=css+'width:320px;height:350px;resize:none;overflow:auto;display:block';reference.style.cssText=css+'width:320px;position:fixed;left:-10000px;top:0';
        field.value='alpha = 123;  中文 😀 tab'+String.fromCharCode(9)+'end'+String.fromCharCode(10,10)+'last = "+quoted+"; '+ 'wrap words '.repeat(7);reference.textContent=field.value;document.body.append(fixture,reference);
        if(typeof rememberRenderTarget==='function')rememberRenderTarget({detail:{protyle:{element:fixture},toolbar:{subElement:popup},blockElement:fixture.querySelector('[data-node-id="20261030165150-field02"]'),renderElement:fixture.querySelector('[data-node-id="20261030165150-field02"]')}});
        const expected=offset=>{const g=rectAt(reference,offset),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();const scale=b.width/a.width;return {x:b.left+(g.left-a.left+g.width*.5-field.scrollLeft)*scale,y:b.top+(g.top-a.top+g.height*.5-field.scrollTop)*scale};};
        try{
            field.focus();field.setSelectionRange(3,8);
            const samples=[0,8,13,15,18,21,24,29,35,45,60,80].map(offset=>({offset,anchor:componentRoundTrip(expected(offset))}));
            field.style.width='240px';reference.style.width='240px';
            for(const {offset,anchor}of samples){const p=expected(offset),resolved=resolveCursor(anchor);assert(resolved&&near(resolved.x,p.x)&&near(resolved.y,p.y),'field glyph moved with box ratio at '+offset);assert(anchor.ui?.textHash,'source text has no content hash');assert(!JSON.stringify(anchor).includes('alpha'),'raw source in anchor');}
            assert(document.activeElement===field&&field.selectionStart===3&&field.selectionEnd===8,'measurement changed native focus or selection');
            field.style.font='18px/30px serif';reference.style.font='18px/30px serif';fixture.style.transformOrigin='0 0';fixture.style.transform='scale(.8)';
            for(const {offset,anchor}of samples){const p=expected(offset),resolved=resolveCursor(anchor);assert(resolved&&Math.hypot(resolved.x-p.x,resolved.y-p.y)<.01,'font or scale drift '+JSON.stringify({offset,p,resolved,anchor}));}
            fixture.style.transform='';
            field.value=field.value.replace('alpha','other');assert(samples.every(s=>resolveCursor(s.anchor)===null),'different source inherited glyphs');field.value=reference.textContent;
            const rawRect=offset=>{const range=document.createRange();range.setStart(reference.firstChild,offset);range.setEnd(reference.firstChild,offset+1);return range.getBoundingClientRect();};
            const gapExpected=(offset,blank=false)=>{const g=rawRect(offset),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect(),left=g.right-a.left+b.left;return {x:left+(b.right-left)*.6,y:g.top-a.top+b.top+g.height*.5};};
            const gaps=[26,28].map(offset=>({offset,anchor:componentRoundTrip(gapExpected(offset))}));
            field.style.width='400px';reference.style.width='400px';
            for(const {offset,anchor}of gaps){const p=gapExpected(offset),actual=resolveCursor(anchor);assert(actual&&Math.hypot(actual.x-p.x,actual.y-p.y)<.01,'explicit line or empty line gap drift '+JSON.stringify({offset,p,actual,anchor}));}
            field.style.width='190px';reference.style.width='190px';let occupied;
            for(let offset=29;offset<field.value.length-2;offset++){
                if(/\\s/.test(field.value[offset]))continue;let next=offset+1;while(field.value[next]===' ')next++;
                const g=rawRect(offset),n=rawRect(next),a=reference.getBoundingClientRect(),b=field.getBoundingClientRect();
                if(n.top>g.top&&b.width-(g.right-a.left)>15){const p={x:b.left+(g.right-a.left)+(b.width-(g.right-a.left))*.8,y:b.top+g.top-a.top+g.height*.5};occupied=componentRoundTrip(p);break;}
            }
            assert(occupied?.ui.textHash,'no wrapped line-end gap fixture');field.style.width='600px';reference.style.width='600px';assert(resolveCursor(occupied)===null,'source blank occupied after reflow retained pointer');
            field.style.height='80px';field.scrollTop=60;assert(field.scrollTop>0,'vertical source scroll did not move');
            for(const {offset,anchor}of samples){const p=expected(offset),r=field.getBoundingClientRect(),visible=p.y>=r.top&&p.y<r.bottom,resolved=resolveCursor(anchor);assert(visible?resolved&&near(resolved.x,p.x)&&near(resolved.y,p.y):resolved===null,'source scroll clipping '+JSON.stringify({offset,p,resolved,visible,scroll:field.scrollTop,r:r.toJSON(),anchor}));}
            field.style.height='350px';field.scrollTop=0;field.style.width='160px';reference.style.width='160px';field.style.whiteSpace='pre';reference.style.whiteSpace='pre';field.scrollLeft=120;assert(field.scrollLeft>0,'horizontal source scroll did not move');
            for(const {offset,anchor}of samples){const p=expected(offset),r=field.getBoundingClientRect(),visible=p.x>=r.left&&p.x<r.right,resolved=resolveCursor(anchor);assert(visible?resolved&&near(resolved.x,p.x)&&near(resolved.y,p.y):resolved===null,'source horizontal clipping at '+offset);}
            const segmenter=Intl.Segmenter;try{Intl.Segmenter=undefined;const b=field.getBoundingClientRect();assert(captureCursor({x:b.left+20,y:b.top+20})===null,'unsupported grapheme measurement used box ratio');}finally{Intl.Segmenter=segmenter;}
            assert(!document.querySelector('.collab-text-measure'),'measurement leaked into UI');
        }finally{fixture.remove();reference.remove();}
    });
    await test('源码浮窗绑定渲染目标，切换公式和失效目标时隐藏',async()=>{
        const fixture=document.createElement('div');fixture.className='protyle';fixture.style.cssText='position:fixed;left:20px;top:20px;width:500px;height:200px;background:white;z-index:100';
        fixture.innerHTML='<div class="protyle-background" data-node-id="20261030165150-util001"></div><div class="protyle-wysiwyg"><div data-node-id="20261030165150-util002"><span data-type="inline-math">x</span><span data-type="inline-math">x</span></div><div data-node-id="20261030165150-util003" data-type="NodeMathBlock">x</div></div><div class="protyle-util" style="position:absolute;left:0;top:70px;width:480px;height:120px;background:white"><div class="resize__move">公式</div><textarea style="width:420px;height:40px"></textarea><button>刷新</button></div>';
        document.body.append(fixture);const popup=fixture.querySelector('.protyle-util'),spans=fixture.querySelectorAll('[data-type="inline-math"]'),block=spans[0].parentElement,other=fixture.querySelector('[data-type="NodeMathBlock"]');
        const open=(renderElement,blockElement=block)=>{popup.querySelector('textarea').replaceWith(document.createElement('textarea'));if(typeof rememberRenderTarget==='function')rememberRenderTarget({detail:{protyle:{element:fixture},toolbar:{subElement:popup},blockElement,renderElement}});};
        try{
            open(spans[0]);const r=popup.querySelector('textarea').getBoundingClientRect(),anchor=componentRoundTrip({x:r.left+5,y:r.top+5});
            open(spans[1]);assert(resolveCursor(anchor)===null,'another identical inline formula inherited source cursor');
            open(other,other);assert(resolveCursor(anchor)===null,'another block inherited source cursor');
            open(spans[0]);assert(resolveCursor(anchor),'same formula reopening lost cursor');
            const identity=componentKey(popup);popup.querySelector('textarea').value='private changed source';assert(componentKey(popup)===identity,'input value entered target identity');assert(resolveCursor(anchor)===null,'different source inherited text');assert(!JSON.stringify(anchor).includes('private'),'raw source on wire');popup.querySelector('textarea').value='';
            popup.classList.add('fn__none');assert(resolveCursor(anchor)===null,'closed popup drew cursor');popup.classList.remove('fn__none');
            spans[0].remove();assert(resolveCursor(anchor)===null,'detached target retained cursor');
            assert(captureCursor({x:r.left+5,y:r.top+5})===null,'invalid target captured');
        }finally{fixture.remove();}
    });
    await test('三个分屏重排后匹配同一对文档之间的分隔条，缺少邻接文档时隐藏',async()=>{
        const fixture=document.createElement('div');fixture.id='three-pane-fixture';fixture.style.cssText='position:fixed;left:20px;top:20px;width:500px;height:100px;background:white;z-index:100;display:flex';
        const panels=['pane001','pane002','pane003'].map(id=>{const panel=document.createElement('div');panel.style.cssText='width:130px;height:100px';panel.innerHTML='<div class="protyle-background" data-node-id="20261030165150-'+id+'"></div>';return panel;});
        const gaps=[0,1].map(()=>{const gap=document.createElement('div');gap.className='layout__resize layout__resize--lr';gap.style.cssText='width:10px;height:100px';return gap;});
        fixture.append(panels[0],gaps[0],panels[1],gaps[1],panels[2]);document.body.append(fixture);
        try{
            const r=gaps[0].getBoundingClientRect(),anchor=componentRoundTrip({x:r.left+5,y:r.top+40});
            fixture.replaceChildren(panels[2],gaps[1],panels[0],gaps[0],panels[1]);
            const moved=resolveCursor(anchor),expected=gaps[0].getBoundingClientRect();assert(moved && near(moved.x,expected.left+5),'split gap matched ordinal instead of neighbours');
            panels[1].remove();assert(resolveCursor(anchor)===null,'missing adjacent document inherited split cursor');
        }finally{fixture.remove();}
    });
    await test('完整插件在在线和断线时都放行正文编辑、拖拽与原生撤销', async () => {
        const commands=[], messages=[], subscriptions=new Map(), editorEvents=new Map();
        const navigation={opened:[],commands:[],tab:null,allow:false};
        const NativePlugin = (() => {
            const module={exports:{}};
            const store=new Map(),sessionStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
            const require = () => ({
                Plugin:class { addCommand(command){commands.push(command);} addTopBar(){return document.createElement('button');} },
                Menu:class {addItem(){} open(){}}, Setting:class {addItem(){}},
                Dialog:class {
                    constructor(options){this.options=options;this.element=document.createElement('div');this.element.innerHTML='<div class="b3-dialog"><div class="b3-dialog__scrim"></div><div class="b3-dialog__container" role="dialog"><div class="b3-dialog__header"></div>'+options.content+'</div></div>';this.element.querySelector('.b3-dialog__header').textContent=options.title;document.body.append(this.element);this.element.querySelector('.b3-dialog__scrim').addEventListener('click',()=>this.destroy());}
                    destroy(){if(!this.element.isConnected||this.element.dataset.dialogClosing)return;this.element.dataset.dialogClosing='true';setTimeout(()=>{this.element.remove();this.options.destroyCallback?.();},30);}
                }, showMessage:message=>messages.push(message),
                openTab:options=>{if(!navigation.allow)throw Error('Unexpected navigation');navigation.opened.push(options);},
                openSetting:()=>{const config=document.querySelector('.config__panel');if(config)config.dataset.opened='true';},
                getActiveTab:()=>navigation.tab,
                getAllTabs:()=>testTabs,
                getModelByDockType:type=>dockModels.get(type),
                globalCommand:command=>{navigation.commands.push(command);return true;}
            });
            ${frontendSource}
            module.exports.testPage=currentPage;
            return module.exports;
        })();
        const rangeStyle=document.createElement('style');rangeStyle.textContent='input.b3-slider::-webkit-slider-thumb{width:10px;height:10px}';document.head.append(rangeStyle);
        const plugin=new NativePlugin();let offline=false;
        Object.assign(plugin,{name:'chord-native-test',i18n:${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'i18n/zh-CN.json'),'utf8')))},
            eventBus:{on(name,handler){editorEvents.set(name,handler);},off(name,handler){assert(editorEvents.get(name)===handler,"wrong editor event cleanup");editorEvents.delete(name);}},kernel:{rpc:{bind:async(name,handler)=>subscriptions.set(name,handler),unbind:async name=>subscriptions.delete(name),
                call:new Proxy({},{get:(_,name)=>async()=>{
                    if(offline)throw Error('Offline');
                    if(name==='presenceHeartbeat')return {count:1,clients:[{name:'A',hue:120,documentId:'20261030165150-doc0001'}],self:{name:'A',hue:120}};
                    if(name==='cursorSnapshot')return {tick:10,cursors:[],selections:[]};
                    if(['cursorUpdate','selectionUpdate','editingUpdate','presenceLeave'].includes(name))return true;
                    throw Error('Unexpected RPC '+name);
                }})}}});
        const input=cursorTextRoot(block), original=input.innerHTML;
        try {
            await plugin.onload();await plugin.onLayoutReady();
            assert(document.querySelectorAll('.collab-range-measure').length===1,'range measurement style not owned by plugin');
            assert(editorEvents.get("open-noneditableblock")===plugin.handleRenderTarget,"render event not registered");
            await test('顶栏直接显示人数，点击后打开原生人员弹窗，退出清理状态',async()=>{
                assert(plugin.topBar.textContent==='1 人在线','online count is not visible');
                assert(!plugin.peoplePanel,'people list opened before click');
                plugin.openPeople();assert(plugin.peoplePanel.closest('[role="dialog"]'),'list is not in native dialog');
                assert(plugin.topBar.getAttribute('aria-expanded')==='true','open state missing');
                plugin.peopleDialog.destroy();await settleDialog();assert(!plugin.peoplePanel&&plugin.topBar.getAttribute('aria-expanded')==='false','native close leaked panel');
                plugin.openPeople();plugin.peoplePanel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
                assert(!plugin.peoplePanel,'Escape did not close dialog');await settleDialog();
            });
            await test('光标区分编辑中与打字中，停止输入、失焦和密码框清除打字状态',async()=>{
                const point=await expose(block,10);input.focus();plugin.pointer=point;
                const before=captureCursor(point,plugin);assert(before.state==='editing','focused editor status missing');
                const event=new InputEvent('input',{inputType:'insertCompositionText',data:'不应发送',bubbles:true,cancelable:true});
                assert(input.dispatchEvent(event),'typing observer canceled input');
                assert(captureCursor(point,plugin).state==='typing','composition did not announce typing');
                plugin.clients=[{name:'A',hue:120},{name:'Bob',hue:210}];plugin.clientName='A';
                plugin.updateCursors({tick:10,cursors:[{name:'Bob',hue:210,cursor:captureCursor(point,plugin)}]});plugin.renderCursors(false);
                assert(plugin.cursorMarkers.get('Bob').textContent.includes('打字中'),'typing label missing');
                await new Promise(resolve=>setTimeout(resolve,1850));
                const after=captureCursor(point,plugin);assert(after.state==='editing','typing never expired');
                plugin.updateCursors({tick:10,cursors:[{name:'Bob',hue:210,cursor:after}]});plugin.renderCursors(false);
                assert(plugin.cursorMarkers.get('Bob').textContent.includes('编辑中'),'editing label missing');
                const password=document.createElement('input');password.type='password';document.body.append(password);password.focus();
                password.dispatchEvent(new InputEvent('input',{bubbles:true}));assert(!captureCursor(point,plugin).state,'password activity shared');password.remove();
                plugin.updateCursors({tick:10,cursors:[]});
            });
            await test('设置控件精确定位，目标缺失隐藏，快捷键只读显示',async()=>{
                const config=document.createElement('div');config.className='config__panel';
                config.style.cssText='position:fixed;left:20px;top:20px;width:500px;height:250px;background:white;z-index:100';
                config.innerHTML='<div class="config__side"><button class="b3-list-item--focus" data-name="editor">编辑器</button><button data-name="appearance">外观</button></div><div class="config__tab-container"><button id="surface-action">示例按钮</button><input type="password"></div>';
                document.body.append(config);
                try {
                    const page=currentPage(plugin);assert(page.kind==='settings'&&page.section==='editor','settings page missing');
                    const button=config.querySelector('#surface-action'),rect=button.getBoundingClientRect();
                    const point={x:rect.left+5,y:rect.top+5},anchor=captureCursor(point,plugin);
                    assert(anchor?.surface==='ui'&&validCursor(anchor),'UI position missing');
                    const resolved=resolveCursor(anchor,plugin);assert(near(resolved.x,point.x)&&near(resolved.y,point.y),'UI anchor drift');
                    let clicked=0;config.querySelector('[data-name="appearance"]').addEventListener('click',()=>clicked++);
                    plugin.clients.push({peerId:'peer-bob',name:'Bob',hue:210,documentId:null,page:{kind:'settings',section:'appearance',title:'设置 · 外观'}});
                    plugin.openPeople();
                    const row=plugin.peopleRows.get('peer-bob');assert(row?.querySelector('span').textContent==='设置 · 外观','participant page missing');
                    row.querySelector('button').click();await settleDialog();
                    assert(clicked===1&&config.dataset.opened==='true','follow did not open settings section exactly once');
                    assert(!plugin.peoplePanel,'follow did not close list');
                    plugin.clients.push({name:'Bob',hue:210,documentId:null});
                    plugin.showShortcut({name:'Bob',keys:'Ctrl+C'});
                    assert(document.querySelector('.collab-shortcut')?.textContent==='Bob  Ctrl+C','remote shortcut missing');
                    const event=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});
                    assert(button.dispatchEvent(event)&&captureShortcut(event)==='Ctrl+C','Ctrl+C canceled or not captured');
                    assert(captureShortcut(new KeyboardEvent('keydown',{key:'a'}))===null,'plain typed text shared');
                    const password=config.querySelector('input');let captured='not called';password.addEventListener('keydown',e=>captured=captureShortcut(e));
                    password.dispatchEvent(new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true}));assert(captured===null,'password shortcut shared');
                    config.remove();
                    assert(resolveCursor(anchor,plugin)===null,'missing settings control fell back to viewport');
                } finally {plugin.closePeople();await settleDialog();config.remove();plugin.pendingShortcut=null;}
            });
            await test('侧栏、搜索和文档只打开一次，弹窗保留原生关闭保护',async()=>{
                await settleDialog();
                const dock=document.createElement('button');dock.className='dock__item';dock.dataset.type='outline';dock.setAttribute('aria-label','大纲');
                document.body.append(dock);let clicks=0;dock.addEventListener('click',()=>{clicks++;dock.classList.add('dock__item--active');});
                navigation.allow=true;
                const follow=async page=>{
                    plugin.clients=[{name:'A',hue:120,documentId:null},{peerId:'bob',name:'Bob',hue:210,documentId:null,page}];
                    plugin.openPeople();plugin.peopleRows.get('bob').querySelector('button').click();await settleDialog();
                };
                try {
                    for(const [model,kind] of [[{editor:{protyle:{block:{rootID:'20261030165150-doc0001'}}}},'document'],[{path:'assets/example.pdf'},'asset'],[{type:'example-plugin-tab'},'custom']]) {
                        navigation.tab={title:'页面',icon:'iconPlugin',model};plugin.surfaceTarget=null;
                        assert(NativePlugin.testPage(plugin).kind===kind,'tab page not captured: '+kind);
                    }
                    const graph=document.createElement('div');graph.className='sy__globalGraph';
                    navigation.tab={title:'关系图',model:{type:'global'},panelElement:graph};
                    assert(NativePlugin.testPage(plugin).id==='globalGraph','graph classified as a plugin tab');navigation.tab=null;
                    plugin.surfaceTarget=dock;assert(currentPage(plugin).kind==='dock','dock page not captured');
                    await follow({kind:'dock',id:'outline',title:'大纲'});await follow({kind:'dock',id:'outline',title:'大纲'});
                    assert(clicks===1,'following an open dock toggled it closed');
                    const wrapper=document.createElement('div');wrapper.dataset.key='dialog-globalsearch';wrapper.innerHTML='<div class="b3-dialog" style="position:fixed;inset:5px"><div class="b3-dialog__scrim"></div><div class="b3-dialog__container"><div class="b3-dialog__header">搜索</div></div></div>';
                    document.body.append(wrapper);assert(currentPage(plugin).command==='globalSearch'&&currentPage(plugin).title==='搜索','native search page was not captured');
                    let close=false;wrapper.querySelector('.b3-dialog__scrim').addEventListener('click',()=>{if(close)wrapper.remove();});
                    const start=navigation.opened.length;
                    await follow({kind:'document',id:block.closest('.protyle').querySelector('.protyle-background').dataset.nodeId,title:'测试文档'});
                    assert(navigation.opened.length===start,'follow bypassed the native dialog close guard');
                    messages.length=0;close=true;
                    await follow({kind:'document',id:'20261030165150-doc0001',title:'测试文档'});
                    assert(!wrapper.isConnected&&navigation.opened.length===start+1,'document navigation left an overlay or opened twice');
                    await follow({kind:'command',command:'globalSearch',title:'搜索'});
                    assert(navigation.commands.at(-1)==='globalSearch','search route not opened');
                    await follow({kind:'participants',title:'在线人员'});assert(plugin.peoplePanel,'following participant page closed itself');
                    plugin.closePeople();await settleDialog();
                } finally {dock.remove();navigation.allow=false;plugin.surfaceTarget=null;plugin.closePeople();document.querySelector('[data-key="dialog-globalsearch"]')?.remove();}
            });
            await test('弹窗停止冒泡仍能观察快捷键，同源嵌入跟踪坐标并完整清理',async()=>{
                const button=document.createElement('button');document.body.append(button);
                button.addEventListener('keydown',event=>event.stopPropagation());
                plugin.pendingShortcut=null;button.dispatchEvent(new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true}));
                assert(plugin.pendingShortcut==='Ctrl+C','dialog swallowed shortcut observer');plugin.pendingShortcut=null;
                const embedded=document.createElement('iframe');embedded.style.cssText='position:fixed;left:30px;top:50px;width:300px;height:150px';
                const loaded=new Promise(resolve=>embedded.addEventListener('load',resolve,{once:true}));embedded.srcdoc='<button>内部按钮</button>';document.body.append(embedded);await loaded;
                try {
                    plugin.bindFrames();embedded.contentDocument.body.dispatchEvent(new PointerEvent('pointermove',{clientX:20,clientY:30,pointerType:'mouse',bubbles:true}));
                    const rect=embedded.getBoundingClientRect();assert(plugin.pointer&&near(plugin.pointer.x,rect.left+(20+embedded.clientLeft)*rect.width/embedded.offsetWidth)&&near(plugin.pointer.y,rect.top+(30+embedded.clientTop)*rect.height/embedded.offsetHeight),'iframe pointer not translated; bindings='+plugin.frameListeners.size);
                    embedded.contentDocument.querySelector('button').dispatchEvent(new KeyboardEvent('keydown',{key:'v',ctrlKey:true,bubbles:true}));
                    assert(plugin.pendingShortcut==='Ctrl+V','iframe shortcut missing');plugin.pendingShortcut=null;
                    const child=embedded.contentDocument.createElement('iframe');child.style.cssText='width:180px;height:80px;border:5px solid black';child.srcdoc='<button>Nested button</button>';
                    const childReady=new Promise(resolve=>child.onload=resolve);embedded.contentDocument.body.append(child);await childReady;await frame();
                    assert(plugin.frameListeners.size===2,'dynamically inserted nested frame was not observed');
                    const childDoc=child.contentDocument;childDoc.body.dispatchEvent(new PointerEvent('pointermove',{clientX:12,clientY:16,pointerType:'mouse',bubbles:true}));
                    const c=child.getBoundingClientRect(),e=embedded.getBoundingClientRect(),expected={x:e.left+(c.left+(12+child.clientLeft)*c.width/child.offsetWidth+embedded.clientLeft)*e.width/embedded.offsetWidth,y:e.top+(c.top+(16+child.clientTop)*c.height/child.offsetHeight+embedded.clientTop)*e.height/embedded.offsetHeight};
                    assert(near(plugin.pointer.x,expected.x)&&near(plugin.pointer.y,expected.y),'nested frame pointer not translated through parent');
                    embedded.style.cssText='position:fixed;left:180px;top:120px;width:310px;height:180px;box-sizing:border-box;border:7px solid black;transform:rotate(13deg) scale(-.9,.85)';child.style.cssText='position:absolute;left:18px;top:16px;width:180px;height:90px;box-sizing:border-box;border:5px solid black;transform:rotate(-8deg) skewX(6deg)';
                    childDoc.body.dispatchEvent(new PointerEvent('pointermove',{clientX:12,clientY:16,pointerType:'mouse',bubbles:true}));
                    const innerPoint=projectedFramePoint(child,{x:17,y:21}),rotatedExpected=projectedFramePoint(embedded,{x:innerPoint.x+7,y:innerPoint.y+7});assert(plugin.pointer&&Math.hypot(plugin.pointer.x-rotatedExpected.x,plugin.pointer.y-rotatedExpected.y)<.6,'rotated nested pointer event drift');
                    childDoc.querySelector('button').dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,bubbles:true}));assert(plugin.pendingShortcut==='Ctrl+B','nested shortcut missing');plugin.pendingShortcut=null;
                    const nextDocument=new Promise(resolve=>child.onload=resolve);child.srcdoc='<button>New nested page</button>';await nextDocument;
                    const before=JSON.stringify(plugin.pointer);childDoc.body.dispatchEvent(new PointerEvent('pointermove',{clientX:60,clientY:50,pointerType:'mouse',bubbles:true}));assert(JSON.stringify(plugin.pointer)===before,'replaced frame document kept its pointer listener');
                    child.remove();await frame();assert(plugin.frameListeners.size===1,'removed nested iframe leaked binding');
                    plugin.openPeople();plugin.peopleDialog.element.querySelector('.b3-dialog__scrim').click();await settleDialog();assert(!plugin.peoplePanel,'native scrim did not dismiss list');
                } finally {embedded.remove();button.remove();plugin.bindFrames();plugin.pendingShortcut=null;}
                assert(plugin.frameListeners.size===0,'iframe listeners leaked');
            });
            await test('编辑框合并同块多人，随滚动裁剪，缺失块不显示且不改正文', async () => {
                await expose(block,10);select(block,10);
                const editing=captureEditing(), before=block.outerHTML;
                assert(editing?.blockId===block.dataset.nodeId,'focused caret not captured');
                const legacyEditing={...editing};delete legacyEditing.region;
                const activity={name:'<b>Bob</b>',hue:210,editing:legacyEditing};
                plugin.clients.push({name:activity.name});
                plugin.updateCursors({tick:10,cursors:[],editing:[{name:'A',hue:120,editing},activity]});
                await frame();
                let markers=document.querySelectorAll('.collab-editing');
                assert(markers.length===1 && markers[0].textContent==='A、<b>Bob</b> 正在编辑','same-block participants missing');
                assert(!markers[0].querySelector('b'),'name interpreted as HTML');
                assert(getComputedStyle(markers[0]).pointerEvents==='none','editing frame intercepts input');
                assert(block.outerHTML===before,'frame rewrote block');
                const clip=scroller.getBoundingClientRect(), rect=markers[0].getBoundingClientRect();
                assert(rect.top>=clip.top && rect.bottom<=clip.bottom+1,'frame outside scroll viewport');
                scroller.scrollTop+=32;plugin.renderEditing();
                assert(markers[0].getBoundingClientRect().bottom<=clip.bottom+1,'frame did not follow scroll');
                scroller.scrollTop=0;await frame();
                const walker=document.createTreeWalker(cursorTextRoot(block),4), texts=[];let node;
                while((node=walker.nextNode()))texts.push([node,node.textContent]);
                const originalHeight=markers[0].getBoundingClientRect().height;
                try {
                    for(const [text] of texts)text.textContent='x';await frame();
                    assert(markers[0].getBoundingClientRect().height!==originalHeight,'text-only resize did not update frame');
                } finally {for(const [text,value] of texts)text.textContent=value;await frame();}
                block.classList.add('fn__none');await frame();
                assert(!document.querySelector('.collab-editing'),'hidden block retained frame');
                block.classList.remove('fn__none');await frame();
                const saved=editing.documentId;
                plugin.updateCursors({tick:10,cursors:[],editing:[{...activity,editing:{...editing,documentId:'20261030165150-other01'}}]});await frame();
                assert(!document.querySelector('.collab-editing'),'other document framed');
                plugin.updateCursors({tick:10,cursors:[],editing:[{...activity,editing:{...editing,blockId:'20261030165150-missing'}}]});await frame();
                assert(!document.querySelector('.collab-editing'),'missing block framed');
                plugin.updateCursors({tick:10,cursors:[],editing:[activity]});await frame();
                plugin.presenceReceivedAt=Date.now()-PRESENCE_TIMEOUT;plugin.renderEditing();
                assert(!document.querySelector('.collab-editing'),'expired activity framed');
                await plugin.refreshInBackground();
                plugin.updateCursors({tick:10,cursors:[],editing:[]});
                assert(saved===editing.documentId && block.outerHTML===before,'rendering modified activity or note');
            });
            await test('不同反链分区同时编辑相同块时分别显示光晕与名字',async()=>{
                const fixture=document.createElement('div');fixture.className='sy__backlink sy__backlink--bottom dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;background:white;z-index:100';
                for(const section of ['backlinkList','backlinkMList'])fixture.insertAdjacentHTML('beforeend','<div class="'+section+'"><div class="backlinkList__item" data-node-id="20261104190000-source1"><div class="protyle" style="position:relative;width:400px"><div class="protyle-wysiwyg"><div data-node-id="20261104190000-repeat1">重复来源块</div></div></div></div></div>');document.body.append(fixture);const tab={model:{backlink:{element:fixture,type:'bottom',blockId:'20261104190000-target1'}}};testTabs.push(tab);const names=['A','region-peer'];plugin.clients.push({name:names[1]});
                try{const editors=[...fixture.querySelectorAll('.protyle')],editing=editors.map((editor,index)=>({name:names[index],hue:120+index*90,editing:{documentId:'20261104190000-source1',blockId:'20261104190000-repeat1',region:cursorRegion(editor)}}));plugin.updateCursors({tick:10,cursors:[],editing});await frame();for(const [index,editor]of editors.entries()){const markers=editor.querySelectorAll('.collab-editing');assert(markers.length===1&&markers[0].textContent===names[index]+' 正在编辑','same block merged participants across regions: '+[...fixture.querySelectorAll('.collab-editing')].map(marker=>marker.textContent).join('|'));}fixture.firstElementChild.style.display='none';plugin.renderEditing();assert(!editors[0].querySelector('.collab-editing')&&editors[1].querySelector('.collab-editing'),'hidden first region swallowed visible peer');}
                finally{plugin.updateCursors({tick:10,cursors:[],editing:[]});fixture.remove();testTabs.splice(testTabs.indexOf(tab),1);plugin.clients=plugin.clients.filter(client=>client.name!==names[1]);}
            });
            await test('搜索标签、弹窗和普通正文的同块编辑光晕分别显示，关闭预览不转移光晕',async()=>{
                const fixture=document.createElement('div');fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;background:white;z-index:100';const names=['A','search-peer','dialog-peer'];names.slice(1).forEach(name=>plugin.clients.push({name}));
                const editors=names.map((_,index)=>{const host=document.createElement('div');host.className=index===1?'layout-tab-container':index===2?'b3-dialog':'';if(index===2)host.dataset.key='dialog-globalsearch';host.innerHTML='<div data-id="local-search"><div class="protyle '+(index?'search__preview':'')+'" '+(index?'id="searchPreview"':'')+' style="position:relative;width:400px"><div class="protyle-background" data-node-id="20261104210000-doc0001"></div><div class="protyle-wysiwyg"><div data-node-id="20261104210000-repeat1">重复预览块</div></div></div></div>';fixture.append(host);return host.querySelector('.protyle');});document.body.append(fixture);
                try{const editing=editors.map((editor,index)=>({name:names[index],hue:120+index*70,editing:{documentId:'20261104210000-doc0001',blockId:'20261104210000-repeat1',region:cursorRegion(editor)}}));const modal=editors[2].closest('.b3-dialog');modal.classList.add('fn__none');plugin.updateCursors({tick:10,cursors:[],editing});await frame();for(const [index,editor]of editors.slice(0,2).entries())assert(editor.querySelectorAll('.collab-editing').length===1&&editor.querySelector('.collab-editing').textContent===names[index]+' 正在编辑','search preview merged or lost a participant');modal.classList.remove('fn__none');plugin.renderEditing();assert(!editors[0].querySelector('.collab-editing')&&!editors[1].querySelector('.collab-editing')&&editors[2].querySelector('.collab-editing')?.textContent===names[2]+' 正在编辑','modal search halo failed native layering');modal.classList.add('fn__none');editors[1].classList.add('fn__none');plugin.renderEditing();assert(!editors[1].querySelector('.collab-editing')&&editors[0].querySelector('.collab-editing').textContent==='A 正在编辑','hidden preview halo moved to main document');}
                finally{plugin.updateCursors({tick:10,cursors:[],editing:[]});fixture.remove();plugin.clients=plugin.clients.filter(client=>!names.slice(1).includes(client.name));}
            });
            await test('编辑光晕遵循原生层级，浮动工具栏、菜单与面板部分重叠时盖住边框和标签',async()=>{
                await expose(block,10);select(block,10);
                const editing=captureEditing(),editor=block.closest('.protyle');
                plugin.updateCursors({tick:10,cursors:[],editing:[{name:'A',hue:120,editing}]});await frame();
                const marker=plugin.editingMarkers.get(block);assert(marker && marker.closest('.protyle')===editor && !marker.closest('.collab-cursor-layer'),'editing frame is still in global top layer');
                const before=cursorTextRoot(block).innerHTML,r=marker.getBoundingClientRect();
                for(const className of ['protyle-toolbar','b3-menu','block__popover','dockPanel']){
                    const overlay=document.createElement('div');overlay.className=className;overlay.style.cssText='position:fixed;left:'+r.left+'px;top:'+r.top+'px;width:120px;height:70px;background:white;z-index:5';
                    document.body.append(overlay);marker.style.pointerEvents='auto';
                    try{assert(document.elementFromPoint(r.left+3,r.top+3)===overlay,'glow is above '+className);}
                    finally{marker.style.pointerEvents='';overlay.remove();}
                }
                assert(before===cursorTextRoot(block).innerHTML,'layer changed editable DOM');
                plugin.updateCursors({tick:10,cursors:[],editing:[]});await frame();assert(!document.querySelector('.collab-editing-layer'),'empty native layer leaked');
            });
            await test('集市和多层弹窗遮挡背景编辑框，关闭后自动恢复', async () => {
                await expose(block,10);select(block,10);
                const editing=captureEditing(), editor=block.closest('.protyle'), before=editor.querySelector('.protyle-wysiwyg').outerHTML;
                const dialog=document.createElement('div'), nested=document.createElement('div');
                dialog.className=nested.className='b3-dialog occluder';
                dialog.innerHTML='<div class="config__panel">集市</div>';
                const copy=editor.cloneNode(true);
                plugin.updateCursors({tick:10,cursors:[],editing:[{name:'A',hue:120,editing}]});await frame();
                assert(plugin.editingMarkers.has(block),'baseline frame missing');
                try {
                    document.body.append(dialog);await frame();
                    assert(plugin.editingMarkers.size===0,'background frame leaked into marketplace');
                    dialog.classList.add('fn__none');await frame();
                    assert(plugin.editingMarkers.has(block),'hidden dialog suppressed document frame');
                    dialog.classList.remove('fn__none');await frame();
                    assert(plugin.editingMarkers.size===0,'reopened dialog retained background frame');
                    dialog.replaceChildren(copy);await frame();
                    const dialogBlock=copy.querySelector('[data-node-id="'+editing.blockId+'"]');
                    assert(plugin.editingMarkers.size===0,'main-document frame leaked into dialog preview');
                    document.body.append(nested);await frame();
                    assert(plugin.editingMarkers.size===0,'second dialog leaked lower editor frame');
                    nested.remove();await frame();
                    assert(plugin.editingMarkers.size===0,'main-document frame leaked into lower dialog preview');
                    dialog.remove();await frame();
                    assert(plugin.editingMarkers.size===1&&plugin.editingMarkers.has(block),'closing dialog did not restore document frame');
                    assert(editor.querySelector('.protyle-wysiwyg').outerHTML===before,'dialog visibility changed note content');
                } finally {
                    nested.remove();dialog.remove();
                    plugin.updateCursors({tick:10,cursors:[],editing:[]});await frame();
                }
            });
            await test('编辑状态只读焦点，切块与离开编辑区清空，发送失败可重试', async () => {
                const sent=[], realUpdate=plugin.kernel.rpc.call;
                let fail=true;
                plugin.kernel.rpc.call={editingUpdate:async(...args)=>{if(fail)throw Error('offline');sent.push(args);}};
                try {
                    select(block,10);plugin.lastEditingSignature='null';await plugin.sendEditing();
                    fail=false;await plugin.sendEditing();await plugin.sendEditing();
                    assert(sent.length===1 && sent[0][3].blockId===block.dataset.nodeId,'failed activity was not retried or deduplicated');
                    plugin.editingSentAt=Date.now()-10001;await plugin.sendEditing();
                    assert(sent.length===1,'idle activity sent redundant packets');
                    const nested=document.querySelector('[data-node-id="20261030165150-para002"]');select(nested,2);
                    await plugin.sendEditing();assert(sent.at(-1)[3].blockId===nested.dataset.nodeId,'block switch not reported');
                    const outside=document.createElement('input');document.body.append(outside);outside.focus();
                    assert(captureEditing()===null,'stale editor selection reported while typing outside');
                    await plugin.sendEditing();assert(sent.at(-1)[3]===null,'leaving editor did not clear');outside.remove();
                } finally {plugin.kernel.rpc.call=realUpdate;}
            });
            await test('原生下拉弹层上的光标实际可见，关闭重开不抢焦点且选项照常点击',async()=>{
                const fixture=document.createElement('div');fixture.dataset.key='dialog-native-picker';fixture.innerHTML='<div class="b3-dialog" style="position:fixed;left:30px;top:30px;width:420px;height:100px;z-index:100;background:white"><div class="b3-dialog__container"><select id="native-picker" style="appearance:base-select;width:280px"><option value="first">中文 English 😀</option><option value="second">第二项</option></select></div></div><style>#native-picker::picker(select){appearance:base-select}#native-picker option{font:16px/24px sans-serif}</style>';document.body.append(fixture);
                const field=fixture.querySelector('select'),option=field.options[0],point=()=>{const r=componentCharacter(option,1);return {x:r.left+r.width*.5,y:r.top+r.height*.5};};
                const click=(name,action)=>new Promise((resolve,reject)=>{const button=document.createElement('button');button.textContent=name;button.style.cssText='position:fixed;left:30px;top:150px;z-index:100';fixture.append(button);button.onclick=()=>{try{action?.();button.remove();resolve();}catch(error){button.remove();reject(error);}};});
                const peer={name:'picker-peer',hue:290};plugin.clients.push(peer);let inputs=0,changes=0;field.addEventListener('input',()=>inputs++);field.addEventListener('change',()=>changes++);
                try{
                    await click('展开原生下拉框进行层级验证',()=>field.showPicker());await frame();assert(field.matches(':open'),'native picker did not open');
                    plugin.clients.push(peer);plugin.presenceReceivedAt=Date.now();
                    const anchor=captureCursor(point(),plugin);assert(anchor?.ui.version===3,'native option identity missing');plugin.updateCursors({tick:10,cursors:[{...peer,cursor:anchor}]});plugin.renderCursors(false);
                    const marker=plugin.cursorMarkers.get(peer.name),active=document.activeElement;assert(marker&&plugin.cursorLayer.matches(':popover-open'),'cursor layer remained below picker');assert(field.contains(active),'cursor stole native option focus');
                    const check=()=>{const marker=plugin.cursorMarkers.get(peer.name),p=point(),r=marker.getBoundingClientRect();assert(Math.hypot(r.left-p.x,r.top-p.y)<.02,'native option cursor drifted');marker.style.pointerEvents='auto';try{assert(marker.contains(document.elementFromPoint(p.x+3,p.y+3)),'picker covers cursor');}finally{marker.style.pointerEvents='';}assert(document.elementFromPoint(p.x,p.y)===option,'cursor intercepts native option');assert(document.activeElement===active,'render changed native focus');};
                    check();option.style.fontSize='22px';field.style.width='350px';plugin.renderCursors(false);check();
                    await click('关闭并重开原生下拉框');await frame();assert(!field.matches(':open'),'outside click failed to close picker');plugin.renderCursors(false);assert(resolveCursor(anchor,plugin)===null&&!plugin.cursorLayer.hasAttribute('popover'),'closed picker kept pointer or top layer');
                    plugin.clients.push(peer);plugin.presenceReceivedAt=Date.now();field.showPicker();await frame();plugin.renderCursors(false);assert(field.matches(':open')&&plugin.cursorLayer.matches(':popover-open'),'reopened picker covered pointer');check();
                    document.getElementById('results').dataset.nativePicker='choose-second';await new Promise(resolve=>field.addEventListener('change',resolve,{once:true}));await frame();plugin.renderCursors(false);assert(field.value==='second'&&inputs===1&&changes===1,'cursor layer changed native input/change behavior');assert(!field.matches(':open')&&!plugin.cursorLayer.hasAttribute('popover'),'native selection left top layer open');
                    document.getElementById('results').dataset.nativePicker='complete';
                }finally{fixture.remove();plugin.updateCursors({tick:10,cursors:[]});plugin.clients=plugin.clients.filter(client=>client.name!==peer.name);plugin.renderCursors(false);}
            });
            for(const disconnected of [false,true]) {
                offline=disconnected;await plugin.refreshInBackground();await plugin.loadCursors();
                await expose(block,10);select(block,10);
                for(const key of ['a','Enter','Backspace','Delete','Tab','Escape','Process','z','y']) {
                    const event=new KeyboardEvent('keydown',{key,ctrlKey:['z','y'].includes(key),bubbles:true,cancelable:true});
                    assert(input.dispatchEvent(event),'keyboard blocked: '+key);
                }
                for(const type of ['insertText','insertParagraph','insertCompositionText','deleteContentBackward','historyUndo','historyRedo']) {
                    assert(input.dispatchEvent(new InputEvent('beforeinput',{inputType:type,data:'字',bubbles:true,cancelable:true})),'beforeinput blocked: '+type);
                }
                for(const type of ['paste','cut','drop','dragstart','compositionstart','contextmenu']) {
                    assert(input.dispatchEvent(new Event(type,{bubbles:true,cancelable:true})),'native event blocked: '+type);
                }
                assert(input.innerHTML===original,'display rewrote editor content');
                assert(document.execCommand('insertText',false,'X'),'native typing failed');
                assert(input.innerHTML!==original,'typing was swallowed');
                assert(document.execCommand('undo')&&input.innerHTML===original,'native undo did not restore text');
            }
            assert(commands.length===1&&commands[0].langKey==='checkOnline','personal history command remains');
            assert(!messages.length,'display failure showed an editing permission notice');
        } finally {await plugin.onunload();rangeStyle.remove();}
        assert(!document.querySelector('.collab-cursor-layer,.collab-range-measure')&&!subscriptions.size&&!editorEvents.size,'display leaked after unload');
    });
    document.title = results.some(result=>result.startsWith('FAIL')) ? 'FAIL Cursor browser regression' : 'PASS Cursor browser regression';
    document.getElementById('results').dataset.complete = 'true';
    await fetch('/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({results})});
})();
</script></html>`;
for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new (require('node:vm').Script)(script[1]);
const server = http.createServer((request, response) => {
    if(request.url==='/results' && request.method==='POST') {
        let body='';request.on('data',chunk=>{body+=chunk;if(body.length>100000)request.destroy();});
        request.on('end',()=>{
            try {
                const {results}=JSON.parse(body);
                if(!Array.isArray(results)||!results.length||results.some(row=>typeof row!=='string'||! /^(PASS|FAIL) /.test(row)))throw Error('Invalid results');
                const failed=results.filter(row=>row.startsWith('FAIL'));
                console.log(JSON.stringify({passed:results.length-failed.length,failed}));
                response.writeHead(200);response.end('OK');
                if(process.argv.includes('--once'))server.close(()=>{process.exitCode=failed.length?1:0;});
            }catch{response.writeHead(400);response.end('Invalid results');}
        });return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(html);
});
const port=Number(process.env.CHORD_BROWSER_PORT || 18086);
server.listen(port, "127.0.0.1", () => console.log('http://127.0.0.1:'+port+'/'));
