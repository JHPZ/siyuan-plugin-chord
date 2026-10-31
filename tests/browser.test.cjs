// Run with node tests/browser.test.cjs, then open the printed local URL.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const lutePath = process.env.SIYUAN_TEST_LUTE || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'SiYuan', 'resources', 'stage', 'protyle', 'js', 'lute', 'lute.min.js');
const hasLute = fs.existsSync(lutePath);
const frontendSource = fs.readFileSync(path.join(root, "index.js"), "utf8");
const helpers = frontendSource.split("\n").slice(1).join("\n").split("module.exports =")[0] + frontendSource.slice(frontendSource.indexOf("const EDIT_BLOCK_ID ="));
const selectionMethods = frontendSource.slice(frontendSource.indexOf('    renderSelections() {'), frontendSource.indexOf('    clearRow(')).replace('renderSelections() {','function renderSelections() {') +
    frontendSource.slice(frontendSource.indexOf('    async sendSelection() {'), frontendSource.indexOf('    scheduleCursorRender(')).replace('async sendSelection() {','async function sendSelection() {');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>协作光标浏览器回归</title>${hasLute ? '<script src="/test-lute.js"></script>' : ''}
<style>
${fs.readFileSync(path.join(root, "index.css"), "utf8")}
:root{--b3-theme-background:white;--b3-theme-on-background:#20252b;--b3-border-radius:4px}
body{margin:24px;font:16px/1.5 sans-serif;color:#20252b;background:#fafafa}
h1{font-size:24px}#results{font-size:14px;white-space:pre-wrap}
.workspace{display:flex;gap:20px;align-items:flex-start}.sy__file{width:280px;height:320px;overflow:auto;background:#fff}
.sy__file li{height:36px;box-sizing:border-box;padding:5px;list-style:none}.sy__file ul{margin:0;padding:0}
.protyle{width:720px;background:white}.protyle-content{height:340px;overflow:auto;border:1px solid #888}
.protyle-wysiwyg{padding:16px;font-size:20px;line-height:32px}.p{margin-bottom:16px}[contenteditable]{outline:none}
.list{padding-left:24px}.occluder{position:fixed;inset:0;background:white;z-index:9}
</style><h1>协作光标浏览器回归</h1><pre id="results">Running…</pre><div class="workspace">
<div class="sy__file"><ul>
${Array.from({ length: 25 }, (_, i) => `<li data-type="navigation-file" data-node-id="20261030165150-row${String(i).padStart(4,"0")}"><span class="b3-list-item__text">文档 ${i + 1}</span></li>`).join("")}
</ul></div><div class="protyle"><div class="protyle-background" data-node-id="20261030165150-doc0001"></div><div class="protyle-content"><div class="protyle-wysiwyg">
<div class="p" data-node-id="20261030165150-block01"><div contenteditable="true">${"长篇文档定位验证，每个字符必须跟随本地换行和滚动。".repeat(50)}<strong>内联加粗文字</strong>${"继续验证跨节点字符偏移。".repeat(20)}</div></div>
<div class="list" data-node-id="20261030165150-list001"><div data-node-id="20261030165150-item001">1.<div class="p" data-node-id="20261030165150-para001"><div contenteditable="true">普通列表项目</div></div>
<div class="list" data-node-id="20261030165150-list002"><div data-node-id="20261030165150-item002">a.<div class="p" data-node-id="20261030165150-para002"><div contenteditable="true">嵌套列表项目同样按文字定位</div></div></div></div></div></div>
<div class="p" data-node-id="20261030165150-block02"><div contenteditable="true">${"第二段内容用于验证鼠标静止时滚动切换锚点。".repeat(35)}</div></div>
</div></div></div></div><script>${helpers}\n${selectionMethods}</script><script>
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
    const editing = new EditLocks({ clientName:'Alice', cursorLayer:layer, i18n:{editOwner:'编辑中：'+'\u0024{name}',editLocked:'Locked',editPending:'Pending',editUnavailable:'Offline'}, showEditMessage() {}, kernel:{rpc:{unbind:async()=>{},call:{editSnapshot:async()=>editState,editClaim:async()=>({granted:false,...editState})}}} });
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
            selectionHighlights:new Set(),selectionStyle:style,cursorsReceivedAt:Date.now()};
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
        viewer.remoteSelections=[{name:'Bob',hue:215,selection:sharedSelection}];viewer.cursorsReceivedAt=Date.now()-5001;renderSelections.call(viewer);
        assert(!viewer.selectionHighlights.size,'expired selection left behind');style.remove();
    });
    await test('选区发送去重，取消选区发送清空，不申请编辑权', async () => {
        const sent=[];select(block,10,20);
        const sender={layoutReady:true,selectionSequence:0,lastSelectionSignature:'null',kernel:{rpc:{call:{selectionUpdate:async(...args)=>sent.push(args)}}}};
        await sendSelection.call(sender);await sendSelection.call(sender);
        assert(sent.length===1 && sent[0][3].anchor.offset===10,'selection updates not deduplicated');
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
        const empty=host.querySelector('[data-node-id="20261030165150-empty01"]'), input=empty.firstElementChild;
        const previous=host.querySelector('[data-node-id="20261030165150-prev001"]');
        const requests=[];let calls=0, deletes=0;
        const state={version:1,ttl:15000,locks:[]};
        const edit=new EditLocks({clientName:'Alice',i18n:{editPending:'Pending',editLocked:'Locked',editUnavailable:'Offline'},showEditMessage(){},kernel:{rpc:{unbind:async()=>{},call:{editSnapshot:async()=>state,editClaim:async(...args)=>{
            if(!args[4].length)return {granted:true,...state};
            calls++;return new Promise(resolve=>{requests.push((granted=true)=>resolve({granted,...state}));});
        }}}}});
        input.focus();const range=document.createRange();range.setStart(input,0);range.collapse(true);
        const selection=document.getSelection();selection.removeAllRanges();selection.addRange(range);
        await edit.start();
        const own=edit.context();edit.editTarget={documentId:own.documentId,blockId:own.blocks[0].blockId};edit.held=own.blocks;edit.ready=true;edit.leaseUntil=Date.now()+14000;
        input.addEventListener('keydown',event=>{if(event.key==='Backspace'){deletes++;event.preventDefault();empty.remove();}});
        const press=()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',code:'Backspace',bubbles:true,cancelable:true}));
        try { await run({edit,empty,input,previous,press,finish:(granted)=>requests.shift()(granted),calls:()=>calls,deletes:()=>deletes}); }
        finally { await edit.stop();host.remove(); }
    }
    await test('空块退格等待内核后自动执行一次，选区通知不抢回单块锁', async () => {
        await deletionFixture(async ({edit,input,press,finish,calls,deletes})=>{
            press();edit.handleSelection();
            for(let i=0;i<5;i++)input.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',repeat:true,bubbles:true,cancelable:true}));
            assert(calls()===1 && deletes()===0,'delete before grant or duplicate claim');
            finish(true);await new Promise(resolve=>setTimeout(resolve,0));
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
            finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            assert(deletes()===0,change+' replayed an obsolete deletion');
        });
    });
    await test('相邻块未获授权时不补发退格', async () => {
        await deletionFixture(async ({press,finish,deletes})=>{
            press();finish(false);await new Promise(resolve=>setTimeout(resolve,0));
            assert(deletes()===0,'denied deletion replayed');
        });
    });
    await test('单击框选复制不抢锁，双击才能编辑，点到别块退出', async () => {
        await deletionFixture(async ({edit,input,previous,finish,calls})=>{
            await edit.release();
            input.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));edit.handleSelection();
            const blocked=new Event('beforeinput',{bubbles:true,cancelable:true});input.dispatchEvent(blocked);
            const copy=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});input.dispatchEvent(copy);
            assert(blocked.defaultPrevented && !copy.defaultPrevented && calls()===0,'read-only gesture acquired a lease or blocked copy');
            input.dispatchEvent(new MouseEvent('dblclick',{button:0,bubbles:true}));assert(calls()===1,'double click did not request a lease');
            finish(true);await new Promise(resolve=>setTimeout(resolve,0));
            const editable=new Event('beforeinput',{bubbles:true,cancelable:true});input.dispatchEvent(editable);
            assert(!editable.defaultPrevented,'double-click grant did not enable editing');
            previous.firstElementChild.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
            assert(!edit.editTarget && calls()===1,'single click in another block acquired editing');
        });
    });
    if (typeof Lute !== 'undefined') {
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
})();
</script></html>`;
for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new (require('node:vm').Script)(script[1]);
const server = http.createServer((request, response) => {
    if (request.url === '/test-lute.js' && hasLute) { response.writeHead(200, {'Content-Type':'text/javascript'});response.end(fs.readFileSync(lutePath));return; }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(html);
});
server.listen(18086, "127.0.0.1", () => console.log("http://127.0.0.1:18086/"));
