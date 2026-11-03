# 开发和弦

先读 [架构与编辑流程](architecture.md)。修改源码放在 `src/`；根目录的 `index.js`、`kernel.js` 是思源加载的生成文件，不直接编辑。

## 项目结构

```text
src/
├─ kernel.js                       内核会话、协作状态和整组块锁
└─ frontend/
   ├─ anchors.js                   指针和选区的内容锚点
   ├─ plugin.js                    加载、会话、菜单、协作显示和卸载
   ├─ editor-adapter.js            思源 DOM、影响块、输入执行和保存接口
   ├─ edit-coordinator.js          编辑状态、任务顺序、租约和保存屏障
   ├─ edit-controller.js           鼠标键盘入口、输入缓冲和目标切换
   ├─ edit-lock-view.js            只读的锁光晕渲染
   └─ personal-history.js          本窗口历史、冲突校验和撤销意图
scripts/
├─ compile.cjs                     按固定顺序生成两个加载入口
├─ check.cjs                       清单、资源、翻译与架构边界检查
└─ package.cjs                     发布白名单打包和逐文件校验
tests/
├─ smoke.test.cjs                  多前端协议、编辑状态和故障注入
└─ browser.test.cjs                DOM、Range、输入时序与 Lute 回归
```

源文件按固定顺序组合到一个作用域，不在思源运行时使用相对 `require`。组合顺序在 `compile.cjs`，新增文件时在这里登记。编译不压缩代码，也不需要第三方依赖。

## 开发命令

需要 Node.js 22 或以上，不需要 `npm install`。

```sh
npm run compile
npm test
npm run check
npm run test:browser:once
npm run build
```

修改源码后先编译。测试和仓库检查会拒绝源码与生成文件不一致的版本；打包会先编译。`build` 使用 Windows 自带的 `tar.exe`，输出 `dist/package.zip` 和 SHA256 文件。

浏览器回归默认监听 `127.0.0.1:18086`。打开终端给出的地址后，页面会执行测试并回传结果；`test:browser:once` 会据此以 0 或 1 退出。保留页面调试时使用 `npm run test:browser`，结束后按 Ctrl+C。环境变量 `CHORD_BROWSER_PORT` 可更换端口。

Lute 检查读取本机思源安装中的 `lute.min.js`，也可以用 `SIYUAN_TEST_LUTE` 指定路径。缺少 Lute 时不运行对应用例，不把跳过当作通过。不要把思源安装文件或用户工作区提交到仓库。

## 通信

复用思源 Kernel RPC，不启动独立 WS 服务。正文保存与协作 RPC 是不同通道。

| RPC | 内容 |
| --- | --- |
| `presenceHeartbeat(sessionId, payload)` | 注册、名字、观看文档、刷新代次；不释放编辑锁 |
| `presenceRename(sessionId, name, generation)` | 改名，公开的锁归属使用 `peerId` |
| `presenceLeave(sessionId, generation)` / `getStatus()` | 注销 / 查询在线状态 |
| `cursorUpdate(sessionId, generation, sequence, cursor)` | 指针锚点或 null |
| `selectionUpdate(sessionId, generation, sequence, selection)` | 文本选区或 null，不申请编辑权 |
| `cursorSnapshot()` / `setCursorTick(tick)` | 快照 / 共享频率 |
| `editSnapshot()` | 带版本的块锁快照 |
| `editClaim(sessionId, generation, sequence, documentId, blocks)` | 整组替换锁；冲突保留旧组，空数组和 null 文档表示释放 |

广播为 `presence-changed`、`cursor-changed` 和 `edit-locks-changed`。指针、选区只传文档 ID、块 ID 和坐标，不发送所选正文。名字用于显示，不作为锁的身份依据；公开 `peerId` 不具备会话凭据的作用。

| 参数 | 当前值 |
| --- | --- |
| 指针 / 选区广播 | 默认 10 tick/秒，可设 1–30；不变不发，失败保留待发标记 |
| 在线心跳 / 会话过期 | 20 秒 / 90 秒 |
| 编辑锁续租 / 租期 | 3 秒 / 15 秒；前端提前 1 秒停止使用 |
| 单次锁申请 | 同一文档，最多 200 个块，每块最多 32 个祖先 |
| 本窗口个人历史 | 每篇文档最多 100 项，约 1000 万序列化字符 |

锁与会话放在内核内存，个人历史放在前端内存。窗口 sessionStorage 保存身份、加载代次、名字和最近文档。刷新恢复与复制窗口共用存储的识别仍有边界，本次编辑架构调整没有重做这套身份协议。

## 修改约定

- 新增编辑功能使用 `runOperation`，不要复制一套申请、释放或提交重试逻辑。
- `prepare`、`validate` 只读；写入只在 `execute`，且必须等待结果。异步函数启动后台写入后立即返回，不算完成。
- 编辑器相关 DOM、选区和完成信号放进适配层。没有可靠完成接口时拒绝执行，不用固定延时猜测。
- RPC 校验 ID、类型、数量、代次和序号。块组要完整提交，不能逐块申请后边成功边写。
- 覆盖层只读状态，不修改正文 DOM；名字用 `textContent` 或转义后插入 HTML。
- 编辑器销毁时解绑历史补丁；卸载先结束正在提交的操作和保存，再释放、注销。
- 清单、包版本及中英文键保持一致。不要提交访问令牌、笔记、配置或 IDE 缓存。

`check` 会检查关键模块边界，但它不能证明程序正确。状态时序由故障测试验证；真实编辑器适配还需要端到端验收。

## 编辑改动的验收

至少覆盖：延迟保存后切块、切文档、卸载；两前端争用整组块；父子块冲突；等待授权后移动选区；异步回车后连续输入；撤销提交中退出；保存失败；提交成功但应答丢失；内核重启后旧请求返回。

在两个真实思源前端中，只使用临时测试文档核对普通段落、列表、中文输入法、粘贴、剪切及个人撤销。浏览器测试页使用真实 DOM 和模拟编辑器完成信号，不能替代这一步。
