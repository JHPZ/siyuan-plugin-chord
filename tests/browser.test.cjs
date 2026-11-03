// Run with node tests/browser.test.cjs, then open the printed local URL.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const frontendSource = fs.readFileSync(path.join(root, "index.js"), "utf8");
const helpers = fs.readFileSync(path.join(root, 'src/frontend/anchors.js'), 'utf8').split('\n').slice(1).join('\n');
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
<div class="sy__file"><ul>
${Array.from({ length: 25 }, (_, i) => `<li data-type="navigation-file" data-node-id="20261030165150-row${String(i).padStart(4,"0")}"><span class="b3-list-item__toggle">›</span><span class="b3-list-item__icon">📄</span><span class="b3-list-item__text">文档 ${i + 1}</span></li>`).join("")}
</ul></div><div class="protyle"><div class="protyle-background" data-node-id="20261030165150-doc0001"></div><div class="protyle-content"><div class="protyle-wysiwyg">
<div class="p" data-node-id="20261030165150-block01"><div contenteditable="true">${"长篇文档定位验证，每个字符必须跟随本地换行和滚动。".repeat(50)}<strong>内联加粗文字</strong>${"继续验证跨节点字符偏移。".repeat(20)}</div></div>
<div class="list" data-node-id="20261030165150-list001"><div data-node-id="20261030165150-item001">1.<div class="p" data-node-id="20261030165150-para001"><div contenteditable="true">普通列表项目</div></div>
<div class="list" data-node-id="20261030165150-list002"><div data-node-id="20261030165150-item002">a.<div class="p" data-node-id="20261030165150-para002"><div contenteditable="true">嵌套列表项目同样按文字定位</div></div></div></div></div></div>
<div class="p" data-node-id="20261030165150-block02"><div contenteditable="true">${"第二段内容用于验证鼠标静止时滚动切换锚点。".repeat(35)}</div></div>
</div></div></div></div><script>${helpers}\n${selectionMethods}\n${treeMethods}</script><script>
const viewerMenus=[];
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
    await test('完整插件在在线和断线时都放行正文编辑、拖拽与原生撤销', async () => {
        const commands=[], messages=[], subscriptions=new Map();
        const NativePlugin = (() => {
            const module={exports:{}};
            const store=new Map(),sessionStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
            const require = () => ({
                Plugin:class { addCommand(command){commands.push(command);} addTopBar(){return document.createElement('button');} },
                Menu:class {addItem(){} open(){}}, Setting:class {addItem(){}}, showMessage:message=>messages.push(message),
                openTab:()=>{throw Error('Unexpected navigation');}
            });
            ${frontendSource}
            return module.exports;
        })();
        const plugin=new NativePlugin();let offline=false;
        Object.assign(plugin,{name:'chord-native-test',i18n:${JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'i18n/zh-CN.json'),'utf8')))},
            eventBus:{on(){},off(){}},kernel:{rpc:{bind:async(name,handler)=>subscriptions.set(name,handler),unbind:async name=>subscriptions.delete(name),
                call:new Proxy({},{get:(_,name)=>async()=>{
                    if(offline)throw Error('Offline');
                    if(name==='presenceHeartbeat')return {count:1,clients:[{name:'A',hue:120,documentId:'20261030165150-doc0001'}],self:{name:'A',hue:120}};
                    if(name==='cursorSnapshot')return {tick:10,cursors:[],selections:[]};
                    if(['cursorUpdate','selectionUpdate','presenceLeave'].includes(name))return true;
                    throw Error('Unexpected RPC '+name);
                }})}}});
        const input=cursorTextRoot(block), original=input.innerHTML;
        try {
            await plugin.onload();await plugin.onLayoutReady();
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
