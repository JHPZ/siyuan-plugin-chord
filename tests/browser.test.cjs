// Run with node tests/browser.test.cjs, then open the printed local URL.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const lutePath = process.env.SIYUAN_TEST_LUTE || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'SiYuan', 'resources', 'stage', 'protyle', 'js', 'lute', 'lute.min.js');
const hasLute = fs.existsSync(lutePath);
const frontendSource = fs.readFileSync(path.join(root, "index.js"), "utf8");
const helpers = fs.readFileSync(path.join(root, 'src/frontend/anchors.js'), 'utf8').split('\n').slice(1).join('\n') +
    ['editor-adapter', 'edit-coordinator', 'edit-lock-view', 'edit-controller', 'personal-history', 'history-replay', 'history-view']
        .map(name => fs.readFileSync(path.join(root, 'src/frontend', name + '.js'), 'utf8')).join('\n');
const selectionMethods = frontendSource.slice(frontendSource.indexOf('    renderSelections() {'), frontendSource.indexOf('    clearRow(')).replace('renderSelections() {','function renderSelections() {') +
    frontendSource.slice(frontendSource.indexOf('    async sendSelection() {'), frontendSource.indexOf('    scheduleCursorRender(')).replace('async sendSelection() {','async function sendSelection() {');
const treeMethods = frontendSource.slice(frontendSource.indexOf('    clearRow('), frontendSource.indexOf('    openMenu() {'))
    .replace('clearRow(row) {', 'function clearRow(row) {').replace('renderTreePresence() {', 'function renderTreePresence() {');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>协作光标浏览器回归</title>${hasLute ? '<script src="/test-lute.js"></script>' : ''}
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
<div class="sy__file"><ul>
${Array.from({ length: 25 }, (_, i) => `<li data-type="navigation-file" data-node-id="20261030165150-row${String(i).padStart(4,"0")}"><span class="b3-list-item__toggle">›</span><span class="b3-list-item__icon">📄</span><span class="b3-list-item__text">文档 ${i + 1}</span></li>`).join("")}
</ul></div><div class="protyle"><div class="protyle-background" data-node-id="20261030165150-doc0001"></div><div class="protyle-content"><div class="protyle-wysiwyg">
<div class="p" data-node-id="20261030165150-block01"><div contenteditable="true">${"长篇文档定位验证，每个字符必须跟随本地换行和滚动。".repeat(50)}<strong>内联加粗文字</strong>${"继续验证跨节点字符偏移。".repeat(20)}</div></div>
<div class="list" data-node-id="20261030165150-list001"><div data-node-id="20261030165150-item001">1.<div class="p" data-node-id="20261030165150-para001"><div contenteditable="true">普通列表项目</div></div>
<div class="list" data-node-id="20261030165150-list002"><div data-node-id="20261030165150-item002">a.<div class="p" data-node-id="20261030165150-para002"><div contenteditable="true">嵌套列表项目同样按文字定位</div></div></div></div></div></div>
<div class="p" data-node-id="20261030165150-block02"><div contenteditable="true">${"第二段内容用于验证鼠标静止时滚动切换锚点。".repeat(35)}</div></div>
</div></div></div></div><script>${helpers}\n${selectionMethods}\n${treeMethods}</script><script>
const testEditors=[];
let testPost;
function fetchSyncPost(route, body) { return testPost(route, body); }
function getAllEditor(){return testEditors;}
const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
const viewerMenus=[];
const historyI18n = ${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'i18n/zh-CN.json'), 'utf8')))};
const nativeComposite = ${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/history-superblock.json'), 'utf8')))};
class Dialog {
    constructor(options) {
        this.options=options;this.element=document.createElement('div');
        this.element.innerHTML=options.content;document.body.append(this.element);
    }
    destroy() { this.element.remove();this.options.destroyCallback?.(); }
}
class Menu {
    constructor() { this.items=[];viewerMenus.push(this); }
    addItem(item) { this.items.push(item); }
    open(position) { this.position=position; }
}
const results = [];
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
            clients:[{name:'<b>A</b>',hue:120,documentId:row.dataset.nodeId},{name:'B',hue:215,documentId:row.dataset.nodeId}],clearRow};
        renderTreePresence.call(viewer);
        const count=row.querySelector('.collab-presence-users'), icon=row.querySelector('.b3-list-item__icon');
        assert(count.tagName==='BUTTON' && count.textContent==='2','not a count button');
        assert(count.nextElementSibling===icon && count.previousElementSibling.classList.contains('b3-list-item__toggle'),'wrong count placement');
        let rowClicks=0;const onClick=()=>rowClicks++;row.addEventListener('click',onClick);
        count.click();assert(rowClicks===0,'count click navigated to the document');
        assert(viewerMenus.at(-1).items.length===2 && viewerMenus.at(-1).items[0].label==='&lt;b&gt;A&lt;/b&gt;','unsafe or incomplete viewer menu');
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
    await test('文档树行比例和滚动', async () => {
        const tree = document.querySelector('.sy__file');
        const row = tree.querySelectorAll('li')[4];
        let rect = row.getBoundingClientRect();
        const anchor = captureCursor({ x:rect.left + rect.width * .7, y:rect.top + rect.height * .5 });
        assert(anchor?.surface === 'tree' && near(anchor.x,.7) && near(anchor.y,.5), JSON.stringify(anchor));
        tree.scrollTop += 36;
        tree.style.width = '320px';
        await frame();
        rect = row.getBoundingClientRect();
        const resolved = resolveCursor(anchor);
        assert(resolved && near(resolved.x,rect.left + rect.width * .7) && near(resolved.y,rect.top + rect.height * .5), 'tree drift');
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
        assert(resolveCursor({...window.savedAnchor,blockId:'20261030165150-missing'}) === null,'missing block visible');
        assert(resolveCursor({...window.savedAnchor,documentId:'20261030165150-other01'}) === null,'wrong document visible');
    });
    await test('视口外或弹窗遮挡时隐藏', async () => {
        await expose(block,150);
        const cover = document.createElement('div');cover.className='occluder';document.body.append(cover);
        assert(resolveCursor(window.savedAnchor) === null,'occluded pointer visible');
        cover.remove();scroller.scrollTop += 1000;await frame();
        assert(resolveCursor(window.savedAnchor) === null,'offscreen pointer visible');
    });
    let editState = { version: 1, ttl: 15000, locks: [{ documentId:'20261030165150-doc0001', blockId:'20261030165150-block01', ancestors:[], name:'<b>Bob</b>', hue:215 }] };
    const layer = document.createElement('div');layer.className='collab-cursor-layer';document.body.append(layer);
    const editing = new EditLocks({ clientName:'Alice', currentDocument:()=>document.querySelector('.protyle-background').dataset.nodeId, cursorLayer:layer, i18n:{editOwner:'编辑中：'+'\u0024{name}',editLocked:'Locked',editPending:'Pending',editUnavailable:'Offline'}, showEditMessage() {}, kernel:{rpc:{unbind:async()=>{},call:{editSnapshot:async()=>editState,editClaim:async()=>({granted:false,...editState})}}} });
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
    await test('编辑锁准确识别嵌套块及父块', async () => {
        const nested=document.querySelector('[data-node-id="20261030165150-para002"]');
        await expose(nested,4);select(nested,4);
        const context=editing.context({type:'keydown',key:'a',target:cursorTextRoot(nested)});
        assert(context.blocks[0].blockId==='20261030165150-para002','wrong editable block');
        assert(context.blocks[0].ancestors.includes('20261030165150-item002') && context.blocks[0].ancestors.includes('20261030165150-list002'),'missing ancestry');
    });
    await test('跨块选区一次收集所有被改写的块', async () => {
        const nested=document.querySelector('[data-node-id="20261030165150-para002"]');
        const final=document.querySelector('[data-node-id="20261030165150-block02"]');
        const range=select(nested,2);const end=characterAt(cursorTextRoot(final),5);range.setEnd(end.node,end.offset);
        const context=editing.context({type:'beforeinput',target:cursorTextRoot(nested)});
        assert(context.blocks.some(b=>b.blockId==='20261030165150-para002') && context.blocks.some(b=>b.blockId==='20261030165150-block02'),'selection lost a block');
    });
    await test('块首退格包含即将被合并的相邻块', async () => {
        const final=document.querySelector('[data-node-id="20261030165150-block02"]');select(final,0);
        const context=editing.context({type:'keydown',key:'Backspace',target:cursorTextRoot(final)});
        assert(context.blocks.some(b=>b.blockId==='20261030165150-para002'),'adjacent merge target unprotected');
    });
    await test('锁定块在 beforeinput 粘贴和中文输入开始前阻断', async () => {
        await expose(block,150);select(block,150);await editing.start();await editing.activate(editing.context());
        for(const type of ['beforeinput','paste','cut','compositionstart','contextmenu']) {
            select(block,150);
            const event=new Event(type,{bubbles:true,cancelable:true});cursorTextRoot(block).dispatchEvent(event);
            assert(event.defaultPrevented,type+' was not blocked');
        }
        const copy=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});cursorTextRoot(block).dispatchEvent(copy);
        assert(!copy.defaultPrevented,'copy blocked');
    });
    await test('光晕不改写正文DOM，名字使用纯文本', async () => {
        const original=block.outerHTML;editing.render();
        assert(editing.markers.size===1,'missing lock halo');
        const marker=[...editing.markers.values()][0];
        assert(marker.firstElementChild.textContent==='编辑中：<b>Bob</b>' && !marker.querySelector('b'),'unsafe label');
        assert(block.outerHTML===original,'editor DOM modified');
        const rect=marker.getBoundingClientRect();assert(rect.top>=scroller.getBoundingClientRect().top && rect.bottom<=scroller.getBoundingClientRect().bottom+1,'halo escaped scroll viewport');
    });
    await test('编辑标签在块外，滚动至顶部时半透明避让', async () => {
        const original=block.outerHTML;
        scroller.scrollTop=0;
        scroller.querySelector('.protyle-wysiwyg').style.paddingTop='40px';await frame();editing.render();
        const marker=editing.markers.get(block), label=marker.firstElementChild;
        assert(label.getBoundingClientRect().bottom < marker.getBoundingClientRect().top,'label overlaps block');
        assert(label.getBoundingClientRect().top >= scroller.getBoundingClientRect().top,'label escaped viewport');
        scroller.scrollTop=120;await frame();editing.render();
        assert(marker.classList.contains('collab-edit-lock--inset') && Number(getComputedStyle(label).opacity)<=0.3,'clipped label not translucent');
        assert(label.getBoundingClientRect().top>=scroller.getBoundingClientRect().top,'fallback hidden above viewport');
        assert(getComputedStyle(label).pointerEvents==='none' && block.outerHTML===original,'label intercepts input or changes content');
        scroller.scrollTop=0;await frame();editing.render();
        assert(!marker.classList.contains('collab-edit-lock--inset'),'label did not return outside');
        scroller.querySelector('.protyle-wysiwyg').style.paddingTop='';
    });
    await test('浮动工具栏也不能修改别人锁定的选区', async () => {
        select(block,150,153);
        const toolbar=document.createElement('div');toolbar.className='protyle-toolbar';
        const button=document.createElement('button');button.textContent='Bold';toolbar.append(button);document.body.append(toolbar);
        const event=new MouseEvent('click',{bubbles:true,cancelable:true});button.dispatchEvent(event);
        assert(event.defaultPrevented,'format toolbar bypassed edit lock');toolbar.remove();
    });
    await test('过期编辑权在前端立即禁止输入，卸载清理覆盖层', async () => {
        editState={version:2,ttl:15000,locks:[]};editing.update(editState);
        const context=editing.context({type:'beforeinput',target:cursorTextRoot(block)});
        editing.held=context.blocks;editing.leaseUntil=Date.now()-1;
        const event=new Event('beforeinput',{bubbles:true,cancelable:true});cursorTextRoot(block).dispatchEvent(event);
        assert(event.defaultPrevented,'expired edit lease allowed input');
        await editing.stop();assert(!layer.children.length,'lock overlays leaked');layer.remove();
    });
    async function deletionFixture(run) {
        const host=document.createElement('div');host.className='protyle';
        host.innerHTML='<div class="protyle-background" data-node-id="20261030165150-doc0002"></div><div class="protyle-wysiwyg"><div data-node-id="20261030165150-prev001"><div contenteditable="true">Previous</div></div><div data-node-id="20261030165150-empty01"><div contenteditable="true"><br></div></div></div>';
        document.body.append(host);
        const inputTasks=new Set();
        const editor={protyle:{block:{rootID:'20261030165150-doc0002'}},flushPendingTransactions:async()=>{
            while(inputTasks.size)await Promise.all([...inputTasks]);
        }};
        testEditors.push(editor);
        const empty=host.querySelector('[data-node-id="20261030165150-empty01"]'), input=empty.firstElementChild;
        const previous=host.querySelector('[data-node-id="20261030165150-prev001"]');
        const requests=[],messages=[];let calls=0, deletes=0;
        const state={version:1,ttl:15000,locks:[]};
        const edit=new EditLocks({clientName:'Alice',currentDocument:()=>host.querySelector('.protyle-background').dataset.nodeId,i18n:{editPending:'Pending',editLocked:'Locked',editUnavailable:'Offline',editInputCancelled:'Input cancelled'},showEditMessage(message){messages.push(message);},kernel:{rpc:{unbind:async()=>{},call:{editSnapshot:async()=>state,editClaim:async(...args)=>{
            if(!args[4].length)return {granted:true,...state};
            calls++;return new Promise(resolve=>{requests.push((granted=true)=>resolve({granted,...state}));});
        }}}}});
        input.focus();const range=document.createRange();range.setStart(input,0);range.collapse(true);
        const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);
        await edit.start();
        const own=edit.context();edit.editTarget={documentId:own.documentId,blockId:own.blocks[0].blockId};edit.held=own.blocks;edit.ready=true;edit.phase="editing";edit.leaseUntil=Date.now()+14000;
        edit.signature=edit.key(own);edit.desired=own.blocks;edit.desiredDocumentId=own.documentId;
        edit.lease={context:own,until:edit.leaseUntil,editors:[editor]};
        input.addEventListener('keydown',event=>{if(event.key==='Backspace'){deletes++;event.preventDefault();empty.remove();}});
        const press=()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',code:'Backspace',bubbles:true,cancelable:true}));
        try { await run({edit,empty,input,previous,press,inputTasks,editor,messages,finish:async(granted,optional=false)=>{await turn();const request=requests.shift();if(optional&&!request)return;assert(request,'no pending grant');request(granted);await turn();},calls:()=>calls,deletes:()=>deletes}); }
        finally { for(const resolve of requests.splice(0))resolve(false);await edit.stop();testEditors.splice(testEditors.indexOf(editor),1);host.remove(); }
    }
    await test('空块退格等待内核后自动执行一次，选区通知不抢回单块锁', async () => {
        await deletionFixture(async ({edit,input,press,finish,calls,deletes})=>{
            press();edit.handleSelection();
            for(let i=0;i<5;i++)input.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',repeat:true,bubbles:true,cancelable:true}));
            await turn();assert(calls()===1 && deletes()===0,'delete before grant or duplicate claim');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(deletes()===1,'granted deletion was lost');
        });
    });
    await test('待执行退格在选区移动或正文变化后取消，避免误删', async () => {
        for(const change of ['selection','content','blur']) await deletionFixture(async ({edit,input,previous,press,finish,deletes})=>{
            press();
            if(change==='selection'){
                const selection=document.getSelection();selection.collapse(previous.firstElementChild.firstChild,1);edit.handleSelection();
            } else if(change==='content') previous.firstElementChild.textContent='Changed by another edit';
            else edit.release();
            await finish(true,true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(deletes()===0,change+' replayed an obsolete deletion');
        });
    });
    await test('相邻块未获授权时不补发退格', async () => {
        await deletionFixture(async ({press,finish,deletes})=>{
            press();await finish(false);await new Promise(resolve=>setTimeout(resolve,0));
            assert(deletes()===0,'denied deletion replayed');
        });
    });
    await test('单击申请编辑权，复制保持可用，单击另一块切换编辑目标', async () => {
        await deletionFixture(async ({edit,input,previous,finish,calls})=>{
            await edit.release();
            input.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));edit.handleSelection();
            const copy=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});input.dispatchEvent(copy);
            assert(!copy.defaultPrevented && calls()===0,'selection or copy acquired a lease');
            input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));await turn();assert(calls()===1,'click did not request a lease');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            const editable=new Event('beforeinput',{bubbles:true,cancelable:true});input.dispatchEvent(editable);
            assert(!editable.defaultPrevented,'click grant did not enable editing');
            previous.firstElementChild.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
            assert(!edit.editTarget,'leaving the old block did not cancel editing');
            document.getSelection().collapse(previous.firstElementChild.firstChild,1);
            previous.firstElementChild.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            await new Promise(resolve=>setTimeout(resolve,0));
            await turn();assert(calls()===2 && edit.editTarget.blockId===previous.dataset.nodeId,'single click did not request the new block');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            const next=new Event('beforeinput',{bubbles:true,cancelable:true});previous.firstElementChild.dispatchEvent(next);
            assert(!next.defaultPrevented,'newly selected block remained locked after grant');
        });
    });
    await test('工具栏、撤销按钮和右键点击不额外申请，正文外点击退出编辑', async () => {
        await deletionFixture(async ({edit,input,calls})=>{
            const toolbar=document.createElement('div');toolbar.className='protyle-toolbar';
            const button=document.createElement('button'),undo=document.createElement('button');undo.dataset.type='undo';
            toolbar.append(button);document.body.append(toolbar,undo);
            try {
                button.click();undo.click();input.dispatchEvent(new MouseEvent('click',{button:2,bubbles:true}));
                await turn();assert(calls()===0,'toolbar or secondary click acquired a lease');
                document.body.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
                document.body.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
                assert(!edit.editTarget && calls()===0,'outside click retained or acquired editing');
            } finally {toolbar.remove();undo.remove();}
        });
    });
    await test('单击后选区短暂清空，延迟授权仍可输入；重复单击不重复申请', async () => {
        await deletionFixture(async ({edit,input,finish,calls})=>{
            await edit.release();
            input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            const selection=document.getSelection(), range=selection.getRangeAt(0).cloneRange();
            selection.removeAllRanges();edit.handleSelection();
            await turn();assert(edit.editTarget && calls()===1,'temporary selection loss cancelled or duplicated the claim');
            await new Promise(resolve=>setTimeout(resolve,50));
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            selection.addRange(range);edit.handleSelection();
            const inputEvent=new InputEvent('beforeinput',{inputType:'insertText',data:'a',bubbles:true,cancelable:true});
            input.dispatchEvent(inputEvent);
            assert(!inputEvent.defaultPrevented,'delayed grant did not enable input');
        });
    });
    await test('单击正文空白区域时按已经落下的选区进入编辑，点到别处取消晚到授权', async () => {
        await deletionFixture(async ({edit,input,previous,finish,calls})=>{
            await edit.release();
            input.parentElement.parentElement.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            await turn();assert(calls()===1 && edit.editTarget,'blank-area click ignored the selection');
            previous.firstElementChild.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(!edit.editTarget && !edit.held.length,'late grant reactivated a cancelled click');
        });
    });
    await test('双击空行或段落的选区停在下一块开头时，不顺带锁定下一块', async () => {
        for(const text of ['', 'Heading'])for(const reverse of [false,true])await deletionFixture(async ({edit,input,previous,finish,calls})=>{
            await edit.release();
            const root=previous.firstElementChild;
            root.innerHTML=text || '<br>';input.textContent='Next paragraph';root.focus();
            document.getSelection().collapse(root,0);
            root.dispatchEvent(new MouseEvent('click',{button:0,detail:1,bubbles:true}));
            const start=root.firstChild,end=input.firstChild;
            document.getSelection().setBaseAndExtent(reverse?end:start,0,reverse?start:end,0);
            root.dispatchEvent(new MouseEvent('click',{button:0,detail:2,bubbles:true}));edit.handleSelection();
            await turn();assert(edit.desired.length===1 && edit.desired[0].blockId===previous.dataset.nodeId && calls()===1,'double click claimed the next block at offset zero');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));edit.handleSelection();
            assert(edit.held.length===1 && calls()===1,'selection update claimed the next block again');
            const copy=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});root.dispatchEvent(copy);
            assert(!copy.defaultPrevented,'boundary selection cannot be copied');
            const mutation=new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true});root.dispatchEvent(mutation);
            await turn();assert(mutation.defaultPrevented && edit.desired.length===2 && calls()===2,'cross-block deletion bypassed the next block lease');
            await finish(false);await new Promise(resolve=>setTimeout(resolve,0));
            assert(!edit.held.length && input.textContent==='Next paragraph','denied cross-block edit changed the next block');
        });
    });
    await test('边界选区可复制，下一块被别人占用时禁止跨块修改', async () => {
        await deletionFixture(async ({edit,input,empty,previous,finish,calls})=>{
            await edit.release();input.textContent='Next paragraph';previous.firstElementChild.focus();
            document.getSelection().setBaseAndExtent(previous.firstElementChild.firstChild,0,input.firstChild,0);
            previous.firstElementChild.dispatchEvent(new MouseEvent('click',{button:0,detail:2,bubbles:true}));
            assert(edit.desired.length===1,'boundary acquired an unrelated block');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            edit.locks=[{documentId:edit.editTarget.documentId,blockId:empty.dataset.nodeId,ancestors:[],name:'Bob',hue:215}];
            const mutation=new InputEvent('beforeinput',{inputType:'insertText',data:'x',bubbles:true,cancelable:true});previous.firstElementChild.dispatchEvent(mutation);
            await turn();
            assert(mutation.defaultPrevented && calls()===2 && input.textContent==='Next paragraph','cross-block input bypassed server confirmation');
            await finish(false);
            assert(input.textContent==='Next paragraph','denied boundary block was modified');
        });
    });
    await test('单击后编辑器扩展到下一块的正文，按实际跨块选区申请', async () => {
        await deletionFixture(async ({edit,input,previous,finish,calls})=>{
            await edit.release();
            previous.firstElementChild.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            input.textContent='Following';
            const range=document.createRange();range.setStart(previous.firstElementChild.firstChild,0);range.setEnd(input.firstChild,1);
            const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);edit.handleSelection();
            await turn();assert(calls()===1,'claims must be serialized while the first response is pending');
            await finish(true);assert(calls()===2,'final noncollapsed selection did not acquire both affected blocks');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            const event=new InputEvent('beforeinput',{inputType:'insertText',data:'a',bubbles:true,cancelable:true});previous.firstElementChild.dispatchEvent(event);
            assert(!event.defaultPrevented && edit.held.length===2,'self-owned selection was still blocked');
        });
    });
    await test('回车产生新块后立即申请新块，不等下一次按键才开始申请', async () => {
        await deletionFixture(async ({edit,input,empty,finish,calls})=>{
            const next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-new0001';
            input.addEventListener('keydown',event=>{
                if(event.key!=='Enter')return;
                event.preventDefault();empty.after(next);
                document.getSelection().collapse(next.firstElementChild,0);
            });
            input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            await Promise.resolve();
            await turn();assert(calls()===1 && edit.desired[0].blockId===next.dataset.nodeId,'new block was not requested after Enter');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            const event=new InputEvent('beforeinput',{inputType:'insertText',data:'a',bubbles:true,cancelable:true});next.firstElementChild.dispatchEvent(event);
            assert(!event.defaultPrevented,'new block grant was not usable');
        });
    });
    await test('未单击或 Esc 退出后直接输入会自动申请，等待时安静排队并保留首字', async () => {
        await deletionFixture(async ({edit,input,finish,calls,messages})=>{
            await edit.release();
            input.dispatchEvent(new KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'bc',bubbles:true,cancelable:true}));
            await turn();
            assert(calls()===1&&!messages.length&&!input.textContent,'did not quietly request permission before writing');
            await finish(true);
            assert(input.textContent==='abc'&&!messages.length&&!edit.deferredEdit,'automatic grant lost or duplicated input');
            input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await turn();
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'d',bubbles:true,cancelable:true}));
            await finish(true);
            assert(input.textContent==='abcd'&&calls()===2&&!messages.length,'typing after Escape still required a click');
        });
    });
    await test('本地过期占锁信息仍向内核确认，失败才提示一次，下一次输入可重试', async () => {
        for(const granted of [true,false])await deletionFixture(async ({edit,input,empty,finish,calls,messages})=>{
            await edit.release();
            edit.locks=[{documentId:'20261030165150-doc0002',blockId:empty.dataset.nodeId,ancestors:[],name:'Bob',hue:215}];
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'a',bubbles:true,cancelable:true}));
            await turn();assert(calls()===1&&!messages.length&&!input.textContent,'cached ownership prevented a fresh claim');
            await finish(granted);
            assert(granted?input.textContent==='a':!input.textContent,'input escaped a rejected claim');
            assert(messages.length===(granted?0:1)&&calls()===1,'duplicate failure toast or automatic retry');
            if(!granted){
                input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'b',bubbles:true,cancelable:true}));
                await finish(true);assert(input.textContent==='b'&&calls()===2,'subsequent edit did not retry');
            }
        });
    });
    await test('不能补发的操作也先申请，合并重复等待，失败才提示且忽略已取消的请求',async()=>{
        for(const outcome of ['granted','denied','cancelled'])await deletionFixture(async({edit,input,finish,calls,messages})=>{
            await edit.release();
            for(let n=0;n<3;n++)input.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true}));
            await turn();assert(calls()===1&&!messages.length,'paste showed a notice before the response or duplicated claims');
            if(outcome==='cancelled')edit.release();
            await finish(outcome==='granted');
            assert(messages.length===(outcome==='denied'?1:0),'stale or premature acquisition error');
        });
    });
    await test('点击或不可补发按键与文字等待同一申请时，拒绝只提示一次',async()=>{
        for(const initial of ['click','Process'])await deletionFixture(async({edit,input,finish,messages})=>{
            await edit.release();
            input.dispatchEvent(initial==='click'?new MouseEvent('click',{button:0,bubbles:true}):
                new KeyboardEvent('keydown',{key:initial,bubbles:true,cancelable:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'x',bubbles:true,cancelable:true}));
            assert(!messages.length,'notice appeared before grant');
            await finish(false);
            assert(!input.textContent&&messages.length===1,'one rejected request produced duplicate notices');
        });
    });
    await test('自动申请期间移动光标会取消原位置的文字，迟到授权不补写',async()=>{
        await deletionFixture(async({edit,input,previous,finish})=>{
            await edit.release();
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'old',bubbles:true,cancelable:true}));
            document.getSelection().collapse(previous.firstElementChild.firstChild,1);edit.handleSelection();
            await finish(true);await finish(true,true);
            assert(!input.textContent&&previous.textContent==='Previous','cancelled input moved to a different block');
        });
    });
    await test('等待单击授权时的连续字符拿到锁后一次写入，不丢首字、不重复', async () => {
        await deletionFixture(async ({edit,input,finish,calls})=>{
            await edit.release();
            input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            const first=new KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true});input.dispatchEvent(first);
            for(const data of ['b','c'])input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data,bubbles:true,cancelable:true}));
            await turn();assert(first.defaultPrevented && !input.textContent && calls()===1,'input escaped pending lease');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(input.textContent==='abc' && !edit.deferredEdit,'buffered text missing or duplicated');
        });
    });
    await test('排队的回车与文字按顺序执行，新块重新获锁后才写入', async () => {
        await deletionFixture(async ({edit,input,empty,finish,calls})=>{
            const scope=empty.parentElement;scope.contentEditable='true';scope.focus();document.getSelection().collapse(input,0);
            edit.held=[];edit.leaseUntil=0;
            const next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-new0002';
            input.addEventListener('keydown',event=>{
                if(event.key!=='Enter')return;
                event.preventDefault();empty.after(next);document.getSelection().collapse(next.firstElementChild,0);
            });
            input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'next',bubbles:true,cancelable:true}));
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            await turn();assert(calls()===2 && next.isConnected && !next.textContent,'new block written before grant');
            await finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(next.textContent==='next' && !input.textContent,'queued text inserted into wrong block: '+JSON.stringify([input.textContent,next.textContent]));
        });
    });
    await test('延迟文字遇到移动选区、正文变化、退出编辑或拒绝授权时取消', async () => {
        for(const change of ['selection','content','blur','denied'])await deletionFixture(async ({edit,input,previous,finish})=>{
            edit.held=[];edit.leaseUntil=0;
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'late',bubbles:true,cancelable:true}));
            if(change==='selection'){document.getSelection().collapse(previous.firstElementChild.firstChild,1);edit.handleSelection();}
            else if(change==='content')input.textContent='Remote edit';
            else if(change==='blur')edit.release();
            await finish(change!=='denied',change!=='denied');await new Promise(resolve=>setTimeout(resolve,0));
            assert(!input.textContent.includes('late'),'obsolete or denied input was replayed: '+change);
        });
    });
    await test('换块申请发出后旧块立即停止可写，等待新授权再恢复', async () => {
        await deletionFixture(async ({edit,previous,finish})=>{
            const context={documentId:edit.editTarget.documentId,blocks:[{blockId:previous.dataset.nodeId,ancestors:[]}]};
            document.getSelection().collapse(previous.firstElementChild.firstChild,1);
            const request=edit.claim(context);
            assert(!edit.held.length && !edit.leaseUntil,'old lease remained usable during replacement');
            await finish(true);await request;
            assert(edit.held[0].blockId===previous.dataset.nodeId,'replacement grant missing');
        });
    });
    await test('更新时间变化不丢弃等待权限的文字，正文变化会明确提示取消',async()=>{
        for(const changed of ['metadata','content'])await deletionFixture(async({edit,input,empty,finish,messages})=>{
            await edit.release();input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'kept',bubbles:true,cancelable:true}));
            if(changed==='metadata')empty.setAttribute('updated','20261103123456');else input.textContent='Other edit';
            await finish(true);
            assert(changed==='metadata'?input.textContent==='kept':input.textContent==='Other edit','incorrect buffered input outcome');
            assert(changed==='metadata'?!messages.includes('Input cancelled'):messages.includes('Input cancelled'),'missing or spurious cancellation notice');
        });
    });
    await test('异步回车完成并取得新块权限后，才写入排队文字',async()=>{
        await deletionFixture(async({edit,input,empty,inputTasks,finish,calls})=>{
            const scope=empty.parentElement;scope.contentEditable='true';scope.focus();document.getSelection().collapse(input,0);
            edit.held=[];edit.leaseUntil=0;
            const next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-new0003';
            let finishEnter;const waiting=new Promise(resolve=>{finishEnter=resolve;});
            input.addEventListener('keydown',event=>{
                if(event.key!=='Enter')return;event.preventDefault();
                const task=waiting.then(()=>{empty.after(next);document.getSelection().collapse(next.firstElementChild,0);}).finally(()=>inputTasks.delete(task));
                inputTasks.add(task);
            });
            try {
                input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
                input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'after',bubbles:true,cancelable:true}));
                await finish(true);assert(!next.isConnected&&!input.textContent&&calls()===1,'text raced ahead of async Enter');
                finishEnter();await turn();assert(next.isConnected&&!next.textContent&&calls()===2,'new block was written before its grant');
                await finish(true);assert(next.textContent==='after'&&!input.textContent,'text landed in the old block');
            } finally {finishEnter();}
        });
    });
    await test('已获锁的原生异步回车也建立完成屏障，随后输入进入新块',async()=>{
        await deletionFixture(async({edit,input,empty,inputTasks,finish})=>{
            const scope=empty.parentElement;scope.contentEditable='true';scope.focus();document.getSelection().collapse(input,0);
            const next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-new0004';
            let finishEnter;const waiting=new Promise(resolve=>{finishEnter=resolve;});
            input.addEventListener('keydown',event=>{
                if(event.key!=='Enter')return;event.preventDefault();
                const task=waiting.then(()=>{empty.after(next);document.getSelection().collapse(next.firstElementChild,0);}).finally(()=>inputTasks.delete(task));inputTasks.add(task);
            });
            try {
                const enter=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});input.dispatchEvent(enter);
                await turn();input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'native',bubbles:true,cancelable:true}));
                assert(!input.textContent&&!next.isConnected,'typing escaped the native completion barrier');
                finishEnter();await turn();await finish(true);
                assert(next.textContent==='native'&&!input.textContent,'native async edit lost its following input');
            } finally {finishEnter();}
        });
    });
    await test('快速输入的回车补发携带思源键码，连续段落逐块授权后写入',async()=>{
        await deletionFixture(async({edit,input,empty,finish,calls,messages})=>{
            const scope=empty.parentElement;scope.contentEditable='true';scope.focus();document.getSelection().collapse(input,0);
            edit.held=[];edit.leaseUntil=0;
            let enters=0;
            scope.addEventListener('keydown',event=>{
                if(event.key!=='Enter'||event.keyCode!==13)return;
                event.preventDefault();const next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-fast00'+(++enters);
                next.firstElementChild.innerHTML='<br>';
                const anchor=document.getSelection().anchorNode;
                (anchor.nodeType===3?anchor.parentElement:anchor).closest('[data-node-id]').after(next);
                document.getSelection().collapse(next.firstElementChild,0);
            });
            for(const text of ['123','456','789']){
                input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
                input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:text,bubbles:true,cancelable:true}));
            }
            for(let n=0;n<4;n++)await finish(true);
            assert(enters===3&&calls()===4,'queued Enter was ignored or grant bypassed');
            assert([...scope.children].slice(2).map(node=>node.textContent).join('|')==='123|456|789','queued text merged or reordered');
            assert(!edit.deferredEdit&&!messages.length,'successful input was cancelled or reported as unavailable');
        });
    });
    await test('Esc 后自动获权补发文字退出块选中模式，排队回车仍然分段',async()=>{
        await deletionFixture(async({edit,input,empty,finish,messages})=>{
            const scope=empty.parentElement;scope.contentEditable='true';scope.focus();document.getSelection().collapse(input,0);
            await edit.release();empty.classList.add('protyle-wysiwyg--select-mode');
            let next;
            scope.addEventListener('keydown',event=>{
                if(event.key!=='Enter'||event.keyCode!==13)return;
                event.preventDefault();
                if(scope.querySelector('.protyle-wysiwyg--select-mode')) {
                    empty.classList.remove('protyle-wysiwyg--select-mode');return;
                }
                next=empty.cloneNode(true);next.dataset.nodeId='20261030165150-escape1';next.firstElementChild.innerHTML='<br>';
                empty.after(next);document.getSelection().collapse(next.firstElementChild,0);
            });
            for(const key of ['4','5','6','Enter','7','8','9'])input.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
            await finish(true);await finish(true);
            assert(input.textContent==='456'&&next?.textContent==='789','Escape mode swallowed the queued paragraph break');
            assert(!edit.deferredEdit&&!messages.length,'auto-acquired input failed');
        });
    });
    await test('等锁时排队的段内退格和 Delete 执行浏览器默认删除且不吞后续文字',async()=>{
        for(const key of ['Backspace','Delete'])await deletionFixture(async({edit,previous,finish,messages})=>{
            await edit.release();const input=previous.firstElementChild;input.focus();document.getSelection().collapse(input.firstChild,3);
            input.dispatchEvent(new MouseEvent('click',{button:0,bubbles:true}));
            input.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'X',bubbles:true,cancelable:true}));
            await finish(true);
            assert(input.textContent===(key==='Backspace'?'PrXvious':'PreXious'),'buffered character deletion was lost: '+key+' '+input.textContent);
            assert(!edit.deferredEdit&&!messages.length,'character deletion did not drain');
        });
    });
    await test('编辑器未处理补发回车时明确失败，不继续把排队文字写到旧段落',async()=>{
        await deletionFixture(async({edit,input,finish,messages})=>{
            edit.held=[];edit.leaseUntil=0;
            input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
            input.dispatchEvent(new InputEvent('beforeinput',{inputType:'insertText',data:'wrong',bubbles:true,cancelable:true}));
            await finish(true);
            assert(!input.textContent&&!edit.deferredEdit&&messages.includes('Offline'),'unhandled Enter silently consumed');
        });
    });
    await test('多块落点按文档顺序生成整组移动，原地放下不创建历史，跨文档与结构转换提前拒绝', async () => {
        await deletionFixture(async ({edit,previous,empty,editor}) => {
            const scope=empty.parentElement, host=scope.parentElement;
            Object.assign(editor.protyle,{element:host,wysiwyg:{element:scope}});
            const third=empty.cloneNode(true);third.dataset.nodeId='20261030165150-third01';scope.append(third);
            const fourth=empty.cloneNode(true);fourth.dataset.nodeId='20261030165150-fourth1';scope.append(fourth);
            const ids=[previous,empty,third].map(node=>node.dataset.nodeId);
            const event={target:fourth,dataTransfer:{types:['application/siyuan-gutternodeparagraph'+String.fromCharCode(8203)+String.fromCharCode(8203)+[...ids].reverse().join(',')]}};
            fourth.classList.add('dragover__bottom');
            const plan=edit.adapter.dropPlan(event);
            assert(plan.forward.map(op=>op.id).join()===ids.join(),'source order followed payload instead of document');
            assert(plan.forward[0].previousID===fourth.dataset.nodeId && plan.backward[0].previousID==='','wrong insertion anchors');
            assert(plan.locations.size===4,'drop target not validated');
            fourth.classList.replace('dragover__bottom','dragover__top');
            assert(edit.adapter.dropPlan(event).noop,'same position created a write');
            fourth.classList.replace('dragover__top','dragover__right');
            let refused=false;try{edit.adapter.dropPlan(event);}catch(error){refused=error.message==='editMoveUnsupported';}
            assert(refused,'horizontal structure conversion escaped');
            event.dataTransfer.types=['application/siyuan-gutternodeparagraph'+String.fromCharCode(8203)+String.fromCharCode(8203)+'20261030165150-missing'];
            refused=false;try{edit.adapter.dropPlan(event);}catch(error){refused=error.message==='editMoveSameDocument';}
            assert(refused,'missing source accepted');
            const tip=document.createElement('div');tip.className='drag-tip';document.body.append(tip);
            edit.adapter.clearDrop(event);await frame();
            assert(!tip.isConnected && !fourth.className.includes('dragover'),'drop indicators left behind');
            const quote=document.createElement('div');quote.dataset.nodeId='20261030165150-quote01';quote.dataset.type='NodeBlockquote';scope.append(quote);
            const anchor=empty.cloneNode(true);anchor.dataset.nodeId='20261030165150-anchor1';anchor.classList.add('dragover__top');quote.append(anchor);
            event.target=anchor;event.dataTransfer.types=['application/siyuan-gutternodeparagraph'+String.fromCharCode(8203)+String.fromCharCode(8203)+ids.join(',')];
            const reparent=edit.adapter.dropPlan(event);
            assert(reparent.forward.every(op=>op.parentID===quote.dataset.nodeId) && reparent.backward.every(op=>op.parentID===editor.protyle.block.rootID),'cross-container move lost parent anchors');
            anchor.classList.remove('dragover__top');fourth.classList.add('dragover__bottom');event.target=fourth;
            event.dataTransfer.types=['application/siyuan-gutternodeparagraph'+String.fromCharCode(8203)+String.fromCharCode(8203)+anchor.dataset.nodeId];
            refused=false;try{edit.adapter.dropPlan(event);}catch(error){refused=error.message==='editMoveUnsupported';}
            assert(refused,'moving the last child silently required container cleanup');
        });
    });
    await test('拖拽放下等待整组权限，随即输入会在移动成功后写入，失败不写入', async () => {
        for(const granted of [true,false]) await deletionFixture(async ({edit,previous,empty,input,editor,finish,messages}) => {
            const scope=empty.parentElement,host=scope.parentElement;
            Object.assign(editor.protyle,{element:host,wysiwyg:{element:scope,lastHTMLs:{}},undo:{add(){},undo(){},redo(){},renderLocal(p,operations){
                for(const op of operations){const node=scope.querySelector('[data-node-id="'+op.id+'"]');
                    if(op.previousID)scope.querySelector('[data-node-id="'+op.previousID+'"]').after(node);else scope.prepend(node);}
            }}});
            const plugin=edit.plugin;plugin.editing=edit;plugin.app={appId:'browser-test'};
            const history=plugin.history=new PersonalHistory(plugin);history.attach();
            history.canonical=(_,html)=>html;
            input.addEventListener('input',()=>editor.protyle.undo.add([{action:'update',id:empty.dataset.nodeId,data:empty.outerHTML}],
                [{action:'update',id:empty.dataset.nodeId,data:editor.protyle.wysiwyg.lastHTMLs[empty.dataset.nodeId]}],editor.protyle));
            history.syncIndex=async()=>{};history.validate=async()=>{};
            history.context=async()=>({documentId:editor.protyle.block.rootID,blocks:[previous,empty].map(node=>({blockId:node.dataset.nodeId,ancestors:[]}))});
            let posts=0;testPost=async(route,body)=>{posts++;return {code:0,data:[{doOperations:body.transactions[0].doOperations}]};};
            previous.classList.add('dragover__top');
            const transfer=new DataTransfer();transfer.setData('application/siyuan-gutternodeparagraph'+String.fromCharCode(8203)+String.fromCharCode(8203)+empty.dataset.nodeId,'test');
            const drop=new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true});previous.dispatchEvent(drop);
            const moving=history.active.promise;
            document.getSelection().removeAllRanges();input.blur();
            document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'x',bubbles:true,cancelable:true}));
            assert(drop.defaultPrevented && !input.textContent && !posts,'native drop or typing ran before grant');
            await finish(granted);
            if(granted)await finish(true);else await finish(true,true);
            await moving;
            assert(posts===(granted?1:0),'wrong write count');
            assert(granted?scope.firstElementChild===empty && input.textContent==='x':scope.firstElementChild===previous && !input.textContent,'drop/typing outcome wrong');
            if(granted){
                assert(edit.editTarget && edit.owns(edit.context()),'editing not restored after move');
                const entries=history.stack(editor.protyle.block.rootID).undo;
                assert(entries.length===2 && !entries[1].unsupported && entries[1].backward[0].data.includes('<br>'),'first typed character has no valid undo snapshot');
            }
            else assert(messages.includes('Input cancelled'),'failed move silently lost queued text');
            assert(!history.active,'move remained busy');await history.stop();
        });
    });
    await test('拖拽手柄按下与取消不清除现有编辑意图，下一次输入仍可用', async()=>{
        await deletionFixture(async({edit,input})=>{
            const gutter=document.createElement('div');gutter.className='protyle-gutters';const handle=document.createElement('span');gutter.append(handle);input.closest('.protyle').append(gutter);
            const target=edit.editTarget;
            handle.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
            const start=new DragEvent('dragstart',{bubbles:true,cancelable:true});handle.dispatchEvent(start);
            handle.dispatchEvent(new DragEvent('dragend',{bubbles:true}));
            assert(!start.defaultPrevented && edit.editTarget===target,'starting/cancelling a drag revoked edit intent');
            const event=new InputEvent('beforeinput',{inputType:'insertText',data:'x',bubbles:true,cancelable:true});input.dispatchEvent(event);
            assert(!event.defaultPrevented,'cancelled drag left editor blocked');
        });
    });
    await test('拖拽结束瞬间选区和焦点为空，Ctrl+Z 仍交给这次移动的个人历史', async()=>{
        await deletionFixture(async({edit,input,editor})=>{
            editor.protyle.element=input.closest('.protyle');
            const history=new PersonalHistory(edit.plugin);history.active={kind:'move',editor};
            let requested;history.request=(owner,direction)=>{requested={owner,direction};};
            document.getSelection().removeAllRanges();input.blur();
            const event=new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true});
            document.body.addEventListener('keydown',event=>history.handle(event),{once:true});document.body.dispatchEvent(event);
            assert(event.defaultPrevented && requested?.owner===editor && requested.direction==='undo','empty selection escaped to shared undo');
        });
    });
    await test('个人撤销列表显示分组、详情和失败原因，保持展开状态，安全显示文档标题', async()=>{
        await deletionFixture(async({edit,input,editor})=>{
            const host=input.closest('.protyle'), title=document.createElement('div');title.className='protyle-title';
            title.textContent='<img src=x onerror=alert(1)>';host.prepend(title);
            Object.assign(editor.protyle,{element:host,wysiwyg:{element:host.querySelector('.protyle-wysiwyg')}});
            edit.plugin.i18n=historyI18n;edit.plugin.editing=edit;
            const history=new PersonalHistory(edit.plugin);edit.plugin.history=history;
            history.open(editor);const view=history.view, stack=history.stack(editor.protyle.block.rootID);
            try {
                assert(view.undo.disabled && view.redo.disabled,'empty actions enabled');
                assert(view.root.querySelector('.collab-history__document').textContent===title.textContent && !view.root.querySelector('img'),'unsafe title');
                const entry={time:Date.now(),actions:['move'],blockIds:['20261030165150-prev001','20261030165150-empty01']};
                stack.undo.push(entry);view.render();
                assert(!view.undo.disabled && view.sections.undo.querySelector('strong').textContent===historyI18n.historyActionMove,'missing summary');
                assert(view.sections.undo.querySelector('.collab-history__meta').textContent.includes('2'),'missing block count');
                const detail=view.root.querySelector('details');detail.open=true;
                entry.lastAttempt={time:Date.now(),direction:'undo',success:false,key:'historyReasonPosition',blockId:entry.blockIds[0]};view.render();
                assert(detail.open && view.root.querySelector('.collab-history__reason').textContent===historyI18n.historyReasonPosition,'failure detail lost');
                assert(view.root.textContent.includes(entry.blockIds[0]),'conflict block missing');
                history.request=(owner,direction)=>{
                    assert(owner===editor,'wrong document');
                    stack[direction].pop();stack[direction==='undo'?'redo':'undo'].push(entry);
                    entry.lastAttempt={time:Date.now(),direction,success:true};view.render();
                };
                view.undo.click();assert(view.undo.disabled && !view.redo.disabled && view.sections.redo.querySelector('details')===detail,'undo list did not update');
                view.redo.click();assert(!view.undo.disabled && view.redo.disabled,'redo list did not update');
                stack.undo.push({time:Date.now()+1,unsupported:true,actions:['other'],blockIds:entry.blockIds});view.render();
                assert(view.undo.disabled && view.root.textContent.includes(historyI18n.historyListUnsupported),'unsupported step hidden or skipped');
                host.classList.add('fn__none');view.render();assert(view.undo.disabled && view.redo.disabled && view.root.textContent.includes(historyI18n.historyListInactive),'inactive editor enabled');
            } finally { await history.stop(); }
            assert(!view.dialog && !view.editor && !document.querySelector('.collab-history-dialog'),'dialog leaked after stop');
        });
    });
    await test('撤销列表内点击不取消等待操作，快捷键仍走个人历史，旧窗口关闭回调不破坏新窗口', async()=>{
        await deletionFixture(async({edit,input,editor})=>{
            const host=input.closest('.protyle');Object.assign(editor.protyle,{element:host,wysiwyg:{element:host.querySelector('.protyle-wysiwyg')}});
            edit.plugin.i18n=historyI18n;edit.plugin.editing=edit;
            const history=new PersonalHistory(edit.plugin);edit.plugin.history=history;history.open(editor);
            const view=history.view, original=view.dialog;
            try {
                history.active={editor,documentId:editor.protyle.block.rootID};view.render();
                view.root.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
                assert(!history.active.cancelled && view.undo.disabled && view.redo.disabled,'dialog click cancelled operation');
                let requested;history.request=(owner,direction)=>{requested={owner,direction};};
                const key=new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true});view.root.dispatchEvent(key);
                assert(key.defaultPrevented && requested?.owner===editor && requested.direction==='undo','dialog key escaped personal history');
                history.active=null;
                const other={protyle:{...editor.protyle}};view.open(other);
                original.options.destroyCallback();
                assert(view.dialog && view.editor===other,'stale callback destroyed new dialog');
            } finally { history.active=null;await history.stop(); }
        });
    });
    if (typeof Lute !== 'undefined') {
        const doc='20261103150000-doc0001', a='20261103150000-block01', b='20261103150000-block02', c='20261103150000-block03', q='20261103150000-quote01';
        const paragraph=(id,text)=>'<div data-node-id="'+id+'" data-type="NodeParagraph" class="p"><div contenteditable="true">'+text+'</div><div class="protyle-attr" contenteditable="false"></div></div>';
        const quote=content=>'<div data-node-id="'+q+'" data-type="NodeBlockquote" class="bq">'+content+'<div class="protyle-attr" contenteditable="false"></div></div>';
        const fixture=html=>{
            const element=document.createElement('div');element.innerHTML=html;
            const p={lute:Lute.New(),block:{rootID:doc},wysiwyg:{element}};
            const history=new PersonalHistory({});return {p,history,element};
        };
        const unwrapForward=[{action:'move',id:a,previousID:q},{action:'move',id:b,previousID:a},{action:'delete',id:q}];
        const unwrapBackward=[{action:'insert',id:q,parentID:doc,data:quote('')},{action:'move',id:a,parentID:q},{action:'move',id:b,previousID:a}];
        await test('真实思源八块取消超级块事务保留完整前后状态与恢复顺序',()=>{
            const f=fixture(nativeComposite.afterHTML);f.p.block.rootID=nativeComposite.rootID;
            f.history.record(f.p,nativeComposite.forward,nativeComposite.backward);
            const entry=f.history.stack(nativeComposite.rootID).undo[0], container=nativeComposite.backward[0].id;
            assert(!entry.unsupported && entry.replay && entry.blockIds.length===8,'native composite rejected');
            assert(entry.expected.get(container)===null && entry.replay.before.expected.get(container).includes('alpha'),'container not restored');
            let previous='';
            for(const op of nativeComposite.forward.filter(op=>op.action==='move')){
                const loc=entry.replay.before.locations.get(op.id);
                assert(loc.parent===container && loc.previous===previous,'child order changed');previous=op.id;
            }
        });
        await test('移动多个块并删除空引用容器可验证双向恢复，原编辑器 DOM 保持不变',()=>{
            const f=fixture(paragraph(a,'Alpha')+paragraph(b,'Beta')+paragraph(c,'End')), original=f.element.innerHTML;
            f.history.record(f.p,unwrapForward,unwrapBackward);
            const entry=f.history.stack(doc).undo[0];
            assert(!entry.unsupported && entry.replay,'mixed move/delete rejected');
            assert(entry.expected.get(q)===null && entry.replay.before.expected.get(q).includes('Alpha'),'wrapper state incorrect');
            assert(entry.replay.before.locations.get(a).parent===q && entry.locations.get(a).parent===doc,'nested restoration location missing');
            assert(f.element.innerHTML===original,'simulation changed live editor');
        });
        await test('父块与子块连续快照、删除后重新包装均可作为一步恢复',()=>{
            const f=fixture(quote(paragraph(a,'New')+paragraph(b,'Beta'))+paragraph(c,'End'));
            f.history.record(f.p,[{action:'update',id:q,data:quote(paragraph(a,'Old')+paragraph(b,'Beta'))},{action:'update',id:a,data:paragraph(a,'New')}],
                [{action:'update',id:a,data:paragraph(a,'Old')},{action:'update',id:q,data:quote(paragraph(a,'Old')+paragraph(b,'Beta'))}]);
            let entry=f.history.stack(doc).undo.at(-1);assert(!entry.unsupported && entry.replay.before.expected.get(q).includes('Old'),'overlapping snapshots rejected');
            const g=fixture(quote(paragraph(a,'Alpha')+paragraph(b,'Beta'))+paragraph(c,'End'));
            g.history.record(g.p,[{action:'delete',id:a},{action:'delete',id:b},{action:'insert',id:q,parentID:doc,data:quote(paragraph(a,'Alpha')+paragraph(b,'Beta'))}],
                [{action:'delete',id:q},{action:'insert',id:a,parentID:doc,data:paragraph(a,'Alpha')},{action:'insert',id:b,previousID:a,data:paragraph(b,'Beta')}]);
            entry=g.history.stack(doc).undo[0];assert(!entry.unsupported && entry.replay.before.expected.get(q)===null,'wrapper conversion rejected');
        });
        await test('组合操作仍校验所有子块，缺失容器可申请整组恢复权限',async()=>{
            const f=fixture(paragraph(a,'Alpha')+paragraph(b,'Beta')+paragraph(c,'End'));
            f.history.record(f.p,unwrapForward,unwrapBackward);const entry=f.history.stack(doc).undo[0];
            testPost=async(route,body)=>{
                const node=f.element.querySelector('[data-node-id="'+body.id+'"]');
                if(route==='/api/query/sql')return {code:0,data:[...body.stmt.matchAll(/'(\\d{14}-[a-z0-9]{7})'/g)].map(match=>{
                    const block=f.element.querySelector('[data-node-id="'+match[1]+'"]');
                    return block && {id:match[1],root_id:doc,parent_id:block.parentElement.closest('[data-node-id]')?.dataset.nodeId || doc};
                }).filter(Boolean)};
                if(route==='/api/block/getBlockDOM')return {code:0,data:{dom:node?.outerHTML}};
                if(route==='/api/block/getBlockSiblingID')return {code:0,data:{parent:node.parentElement.closest('[data-node-id]')?.dataset.nodeId || doc,previous:node.previousElementSibling?.dataset.nodeId || ''}};
                throw Error(route);
            };
            const context=await f.history.context(doc,entry);assert(context.blocks.some(block=>block.blockId===q),'deleted wrapper missing from lock group');
            await f.history.validate(f.p,entry);
            f.element.querySelector('[data-node-id="'+a+'"] [contenteditable]').textContent='External';
            let error;try{await f.history.validate(f.p,entry);}catch(e){error=e;}
            assert(error?.reason==='historyReasonContent' && error.blockId===a,'external child edit accepted');
        });
        await test('无法验证的组合保留具体阻断原因，不删除正文或猜测逆操作',()=>{
            for(const [forward,backward,reason] of [
                [[{action:'convertList',id:a}],[{action:'convertList',id:a}],'historyUnsupportedAction'],
                [unwrapForward,[...unwrapBackward.slice(0,1),{action:'move',id:a,parentID:'20261103150000-missing'},unwrapBackward[2]],'historyUnsupportedLoaded'],
                [[unwrapForward[0],{action:'move',id:b,nextID:a},unwrapForward[2]],unwrapBackward,'historyUnsupportedRoundTrip'],
            ]){
                const f=fixture(paragraph(a,'Alpha')+paragraph(b,'Beta')+paragraph(c,'End')),original=f.element.innerHTML;
                f.history.record(f.p,forward,backward);const entry=f.history.stack(doc).undo[0];
                assert(entry.unsupported && entry.unsupportedReason===reason,JSON.stringify(entry));
                assert(f.element.innerHTML===original,'unsupported replay changed document');
            }
        });
        const history = new PersonalHistory({});
        const p = { lute: Lute.New(), block: { rootID: '20261030165150-doc0001' }, wysiwyg: {element: document.querySelector('.protyle-wysiwyg')} };
        const html = '<div data-node-id="20261030165150-block01" data-type="NodeParagraph" class="p" updated="20261031000000"><div contenteditable="true">hello<span data-type="strong">world</span></div><div class="protyle-attr" contenteditable="false">&#8203;</div></div>';
        await test('个人撤销使用真实 Lute 规范化临时光标和更新时间，保留正文与格式差异', async () => {
            const clean = history.canonical(p, html);
            assert(clean.includes('hello') && clean.includes('world'),'canonical lost text');
            assert(clean === history.canonical(p, html.replace('hello','hel<wbr>lo').replace('20261031000000','20261031999999')),'transient metadata caused a false conflict');
            assert(clean !== history.canonical(p, html.replace('hello','helloX')),'foreign text change was ignored');
            assert(clean !== history.canonical(p, html.replace('strong','em')),'foreign formatting change was ignored');
        });
        await test('个人撤销校验真实块 DOM，拒绝父子重叠快照、数据库和无效操作', async () => {
            const state = history.state(p,[{action:'update',id:'20261030165150-block01',data:html}]);
            assert(state.get('20261030165150-block01').includes('hello'),'normal paragraph rejected');
            for(const ops of [
                [{action:'move',id:'20261030165150-block01'}],
                [{action:'update',id:'bad',data:html}],
                [{action:'update',id:'20261030165150-block01',data:html.replace('NodeParagraph','NodeAttributeView')}],
                [{action:'update',id:'20261030165150-list001',data:'<div data-node-id="20261030165150-list001">'+html+'</div>'},{action:'update',id:'20261030165150-block01',data:html}]
            ]) {
                let refused=false;try{history.state(p,ops);}catch{refused=true;}assert(refused,'unsafe snapshot accepted');
            }
        });
    }
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
    if (request.url === '/test-lute.js' && hasLute) { response.writeHead(200, {'Content-Type':'text/javascript'});response.end(fs.readFileSync(lutePath));return; }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(html);
});
const port=Number(process.env.CHORD_BROWSER_PORT || 18086);
server.listen(port, "127.0.0.1", () => console.log('http://127.0.0.1:'+port+'/'));
