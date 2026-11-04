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
            assert(near(resolved.x,column.left+(column.right-column.left)*anchor.space.x),'blank column moved with line ending');
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
    await test('标签完整路径和书签组身份独立于计数、嵌套列表顺序及同名叶节点',async()=>{
        for(const kind of ['tag','bookmark']){
            const fixture=document.createElement('div'),dock=document.createElement('div'),previous=dockModels.get(kind);
            fixture.className='sy__'+kind+' dockPanel';fixture.style.cssText='position:fixed;left:25px;top:25px;width:420px;height:300px;z-index:100;background:white';dock.className='dock__item';dock.dataset.type=kind;
            const attribute=kind==='tag'?'data-label':'data-bookmark';
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
                if(kind==='bookmark'){
                    nested[1].append(leaf[0]);samples.forEach(check);nested[0].append(leaf[0]);samples.forEach(check);
                }
                const duplicate=leaf[0].cloneNode(true);nested[1].append(duplicate);for(const s of samples.filter(s=>leaf[0].contains(s.root)))assert(resolveCursor(s.anchor)===null,'ambiguous tree row guessed');duplicate.remove();samples.forEach(check);
            }finally{if(previous)dockModels.set(kind,previous);else dockModels.delete(kind);fixture.remove();dock.remove();}
        }
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
        const commands=[], messages=[], subscriptions=new Map();
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
                globalCommand:command=>{navigation.commands.push(command);return true;}
            });
            ${frontendSource}
            module.exports.testPage=currentPage;
            return module.exports;
        })();
        const plugin=new NativePlugin();let offline=false;
        Object.assign(plugin,{name:'chord-native-test',i18n:${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'i18n/zh-CN.json'),'utf8')))},
            eventBus:{on(){},off(){}},kernel:{rpc:{bind:async(name,handler)=>subscriptions.set(name,handler),unbind:async name=>subscriptions.delete(name),
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
                const activity={name:'<b>Bob</b>',hue:210,editing};
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
        } finally {await plugin.onunload();}
        assert(!document.querySelector('.collab-cursor-layer')&&!subscriptions.size,'display leaked after unload');
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
