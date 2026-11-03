# 开发和弦

先读[架构边界](architecture.md)。源码位于 `src/`；根目录 `index.js`、`kernel.js` 是生成文件，不直接编辑。

## 项目结构

```text
src/
├─ protocol.js            共用协议验证与字段白名单
├─ kernel.js              在线会话与展示状态广播
└─ frontend/
   ├─ anchors.js          指针和选区锚点
   ├─ surfaces.js         页面、界面锚点、跟踪与快捷键
   └─ plugin.js           生命周期、菜单与多人状态展示
scripts/
├─ compile.cjs            生成加载入口
├─ check.cjs              清单、资源与翻译检查
└─ package.cjs            发布白名单打包及逐文件校验
tests/
├─ smoke.test.cjs         会话协议、断线和清理回归
└─ browser.test.cjs       DOM、Range、展示与原生编辑放行回归
```

源文件按固定顺序合并，无第三方运行时依赖。需要 Node.js 22 或以上，无需 `npm install`。

```sh
npm run compile
npm test
npm run check
npm run test:browser:once
npm run build
```

修改源码后先编译；测试检查源码和生成文件是否一致。浏览器回归默认监听 `127.0.0.1:18086`，打开终端打印的地址后执行并回传结果。`--once` 模式以测试结果退出；环境变量 `CHORD_BROWSER_PORT` 可更换端口。测试不再依赖 Lute。

打包使用 Windows 自带 `tar.exe`，输出 `dist/package.zip` 和 SHA-256 校验文件。

## 通信

复用思源 Kernel RPC，不启动额外服务。

| RPC | 内容 |
| --- | --- |
| `presenceHeartbeat(sessionId, payload)` | 注册、名字、观看文档、页面与刷新代次 |
| `presenceRename(sessionId, name, generation)` | 修改显示名字 |
| `presenceLeave(sessionId, generation)` / `getStatus()` | 注销 / 在线状态 |
| `cursorUpdate(sessionId, generation, sequence, cursor)` | 指针锚点或 null |
| `selectionUpdate(sessionId, generation, sequence, selection)` | 文本选区或 null |
| `editingUpdate(sessionId, generation, sequence, editing)` | 当前聚焦的文档 ID、块 ID 或 null，无排他性 |
| `shortcut(sessionId, generation, sequence, keys)` | 只读组合键通知，无远端执行 |
| `cursorSnapshot()` / `setCursorTick(tick)` | 展示快照 / 共享频率 |

广播为 `presence-changed`、`cursor-changed` 与 `shortcut-shown`。页面参数先经共享协议验证、去除未知字段，再进入快照；不得携带搜索输入、剪贴板、密码、插件内部数据或任意可执行命令。不传选中的正文，会话密钥不出现在公共快照。参数必须验证 ID、类型、代次、序号和范围。

## 修改约定

- 展示与正文操作保持分离，不加入编辑权限或正文事件拦截。
- 覆盖层不接收鼠标事件，远端名字用 `textContent` 或转义后插入。
- 保留本地 Selection；远端选区使用 CSS Custom Highlight。
- 网络不可用时允许思源继续处理编辑；卸载清理自己的监听、定时器、覆盖层和高亮。
- 保持中英文键一致，不提交令牌、笔记、工作区配置或 IDE 缓存。

涉及展示交互的改动，需要在两个真实思源前端的临时文档中验证人数、光标、选区以及输入、拖拽和 Ctrl+Z。所有前端应加载同一版本；旧版本仍可能拦截编辑。
