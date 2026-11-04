// Run with node tests/browser.test.cjs, then open the printed local URL.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const frontendSource = fs.readFileSync(path.join(root, "index.js"), "utf8");
const helpers = fs.readFileSync(path.join(root,'src/protocol.js'),'utf8')+'\n'+fs.readFileSync(path.join(root, 'src/frontend/anchors.js'), 'utf8').split('\n').slice(1).join('\n')+'\n'+fs.readFileSync(path.join(root,'src/frontend/surfaces.js'),'utf8');
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
            assert(captureCursor({x:r.right-4,y:r.top+r.height/2})===null,'label whitespace shared');
            const toggle=row.querySelector('.b3-list-item__toggle'),t=toggle.getBoundingClientRect();
            assert(captureCursor({x:t.left+5,y:t.top+t.height/2})===null,'indentation shared');
        } finally {fixture.remove();}
    });
    await test('空白、分屏缝隙和旧比例锚点均不显示指针',async()=>{
        const fixture=document.createElement('div');fixture.id='blank-layout';fixture.className='layout__wnd--active';
        fixture.style.cssText='position:fixed;left:20px;top:20px;width:600px;height:240px;background:white;z-index:100';
        fixture.innerHTML='<div class="sy__file" style="height:80px"></div><div class="b3-list-item" style="height:30px"><span class="b3-list-item__text">反链列表行</span></div><div class="protyle-breadcrumb__space" style="height:40px"></div><div class="layout__resize" style="height:30px"></div>';
        document.body.append(fixture);
        try {
            for(const element of [fixture,...fixture.children]) {
                const r=element.getBoundingClientRect();assert(captureCursor({x:r.left+10,y:r.bottom-5})===null,'blank region shared: '+element.className);
            }
            const old={surface:'ui',documentId:null,blockId:null,page:{kind:'workspace',title:''},screen:{x:.2,y:.2},x:.5,y:.5,ui:{version:2,kind:'id',id:fixture.id,path:[],tag:'div'}};
            assert(resolveCursor(old)===null,'legacy container anchor displayed');
            assert(resolveDocumentCursor({surface:'tree',blockId:'20261030165150-file001',documentId:null,x:.5,y:.5})===null,'legacy row fraction displayed');
            assert(resolveDocumentCursor({...window.savedAnchor,text:undefined})===null,'legacy block fraction displayed');
        } finally {fixture.remove();}
        await expose(block,10);const r=cursorTextRoot(block).getBoundingClientRect();
        assert(captureCursor({x:r.right-2,y:r.bottom-2})===null,'paragraph trailing blank shared');
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
        const cover=document.createElement('div');cover.className='occluder';document.body.append(cover);
        assert(resolveCursor(anchor)===null,'covered editor displayed cursor');cover.remove();
    });
    await test('悬浮工具栏与顶部空白禁用，面包屑控件按文档定位',async()=>{
        const fixture=document.createElement('div');fixture.id='shared-layout-id';
        fixture.style.cssText='position:fixed;left:20px;top:20px;width:900px;background:white;z-index:100;display:flex;gap:20px';
        const ids=['20261030165150-uiroot1','20261030165150-uiroot2'];
        const windows=ids.map((id,index)=>{
            const wnd=document.createElement('div');wnd.className=index ? 'layout__wnd--active':'layout__wnd';
            wnd.innerHTML='<div class="protyle" style="width:400px"><div class="protyle-background" data-node-id="'+id+'"></div><div class="protyle-breadcrumb"><button data-type="doc">文档</button><span class="protyle-breadcrumb__space" style="display:inline-block;width:100px;height:24px"></span></div><div class="protyle-toolbar"><button data-type="b">粗体</button></div><div class="protyle-content"><div class="protyle-title"><div class="protyle-title__input" contenteditable="true">同名文档</div></div><button data-topbar-entry="document-plugin">文档插件</button></div></div>';
            fixture.append(wnd);return wnd;
        });document.body.append(fixture);
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
                assert(captureCursor({x:r.right-2,y:r.top+r.height/2},plugin)===null,'excluded editor area shared: '+selector);
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
                const selection=document.getSelection(),range=document.createRange();range.setStart(text.firstChild,1);range.setEnd(text.firstChild,4);text.focus();selection.removeAllRanges();selection.addRange(range);
                const shared=captureSelection();assert(shared.region.id===anchor.region.id && resolveSelection(shared).length===1,'selection escaped region');
                assert(captureEditing().region.id===anchor.region.id,'editing lost region');
                pane.classList.add('fn__none');assert(resolveCursor(anchor)===null && resolveSelection(shared).length===0,'hidden region matched other pane');pane.classList.remove('fn__none');
                pane.remove();assert(resolveCursor(anchor)===null,'missing region fell back to document');fixture.append(pane);
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
                    const rect=embedded.getBoundingClientRect();assert(plugin.pointer&&near(plugin.pointer.x,rect.left+20*rect.width/embedded.clientWidth)&&near(plugin.pointer.y,rect.top+30*rect.height/embedded.clientHeight),'iframe pointer not translated; bindings='+plugin.frameListeners.size);
                    embedded.contentDocument.querySelector('button').dispatchEvent(new KeyboardEvent('keydown',{key:'v',ctrlKey:true,bubbles:true}));
                    assert(plugin.pendingShortcut==='Ctrl+V','iframe shortcut missing');plugin.pendingShortcut=null;
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
            await test('集市和多层弹窗遮挡背景编辑框，关闭后自动恢复', async () => {
                await expose(block,10);select(block,10);
                const editing=captureEditing(), editor=block.closest('.protyle'), before=editor.outerHTML;
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
                    assert(editor.outerHTML===before,'dialog visibility changed note content');
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
