# 开发和弦

读代码时，可以先分清两件事：哪些状态属于所有窗口，哪些事情只能由当前窗口决定。和弦沿着这条线组织实现。

## 项目结构

```text
siyuan-plugin-chord/
├─ kernel.js                 内核状态、RPC、租约与配置
├─ index.js                  前端交互、覆盖层、EditLocks、PersonalHistory
├─ index.css                 光晕、名字、指针与主题适配
├─ plugin.json               思源插件身份与兼容范围
├─ package.json              开发命令与发布文件白名单
├─ i18n/                     中文、英文提示
├─ icon.png / preview.png    插件资料
├─ docs/                     使用、开发、发布与素材说明
├─ scripts/                  仓库检查与 Windows 打包工具
├─ tests/                    模拟内核和真实浏览器回归
└─ .github/                  问题反馈与 Pull Request 模板
```

## 开发环境

需要 Node.js 22 或以上；本次整理实际使用 Node.js 24。运行时没有第三方依赖，不需要 `npm install` 或编译。插件本身仍由思源加载，不是独立 Node 服务。

打包脚本使用 Node.js 与 Windows 自带的 `tar.exe`，不修改 PowerShell 执行策略。其他系统可运行 JavaScript 测试，但本仓库暂未提供其打包入口。

```sh
npm test
npm run check
npm run test:browser
```

最后一条会启动仅监听 `127.0.0.1:18086` 的临时测试页。用桌面浏览器打开输出地址，确认每项显示 PASS，完成后按 Ctrl+C 停止。它不是生产服务器。

涉及 Lute 的检查会尝试读取 Windows 默认思源安装中的 `lute.min.js`；找不到时不会运行这两项。可用环境变量 `SIYUAN_TEST_LUTE` 指向真实安装中的该文件，不要把它或用户工作区复制进仓库。浏览器检查应记录实际通过项，不能把跳过写成通过。

## 职责分界

| 文件 / 对象 | 职责 | 不承担什么 |
| --- | --- | --- |
| `kernel.js` | 会话、名字、文档、指针、选区、块锁；输入校验、过期清理、广播 | 正文合并、账号认证、所有写入的事务拦截 |
| 前端插件实例 | 当前文档检测、恢复、心跳、菜单与设置、覆盖层渲染 | 替别人点击或滚动页面 |
| `EditLocks` | 收集实际目标块及祖先，申请租约，拦截本端修改，保存后放锁 | 约束未启用插件的客户端 |
| `PersonalHistory` | 记录本地正逆事务，校验后提交个人撤销/重做 | 持久历史、复杂操作变换、跨窗口合并 |

内核插件前端加载器不支持当前实现所需的相对 `require` 拆分，因此 `EditLocks` 与 `PersonalHistory` 保持内联。没有引入打包器之前，不要仅为缩短文件而拆成运行时相对引用。

## 通信与状态

复用思源提供的 Kernel RPC WebSocket，无独立端口。RPC 名称由插件通道承载，不另起全局广播服务。

| RPC | 内容 |
| --- | --- |
| `presenceHeartbeat(sessionId, payload)` | 注册或续期；payload 可含 name、documentId、generation |
| `presenceRename(sessionId, name, generation)` | 改名并立即广播；旧心跳不覆盖新名字 |
| `presenceLeave(sessionId, generation)` / `getStatus()` | 注销当前代次 / 查询状态 |
| `cursorUpdate(sessionId, generation, sequence, cursor)` | 指针锚点或 null；校验代次、序号与坐标范围 |
| `selectionUpdate(sessionId, generation, sequence, selection)` | 文本选区两端或 null；不申请编辑权 |
| `cursorSnapshot()` / `setCursorTick(tick)` | 获取指针与选区 / 保存共享频率 |
| `editSnapshot()` | 版本化的块锁快照 |
| `editClaim(sessionId, generation, sequence, documentId, blocks)` | 原子替换本会话的整组锁；空数组与 null 文档释放 |

广播为 `presence-changed`、`cursor-changed` 与 `edit-locks-changed`。公开数据包含显示名、颜色、文档/块 ID 和必要锚点，不包含私有 sessionId。名字不是身份凭据。

指针锚点包含 surface、documentId、blockId、0–1 范围的 x/y，可附字符 offset 及字符内比例。选区包含 documentId 与 anchor/focus 两端的 blockId、offset。字符偏移限制为 0–10000000 的整数。接收端按本地 DOM 投影，不传输所选文字正文。

锁申请包含最多 200 个 `{ blockId, ancestors }`。祖先由前端当前 DOM 或撤销元数据推导；内核检查父子冲突，不能把它解释为服务端验证过的文档授权。刷新代次防止旧窗口请求接管新会话，序号防止乱序更新和迟到释放。

| 时序 | 当前值 |
| --- | --- |
| 指针 / 选区合并广播 | 默认 10 tick/秒，可设 1–30 |
| 静止指针 / 选区续期与失效 | 约每秒续期，5 秒无更新失效 |
| 在线心跳 / 会话过期 / 清理 | 20 秒 / 90 秒 / 每 15 秒 |
| 编辑锁续租 / 租期 / 清理 | 3 秒 / 15 秒 / 每秒 |

频率保存到插件私有 `cursor-settings.json`，保存失败保持原值。会话与锁在内核内存；身份、加载代次、名字和最近文档在窗口 sessionStorage；个人正文快照只在该窗口内存。个人撤销会把必要正文事务发送给用户已连接的同一思源内核，普通协作广播不发送正文快照。

## 撤销为何要多核对一次

`undo.add` 记录本窗口的正向和逆向事务；`undo/redo` 替换为个人栈入口，卸载恢复原方法。不会调用共享撤销接口。

执行时先 flush 待保存输入，再收集目标、位置锚点和祖先，原子申请锁；随后重新读取内核正文，以 Lute 规范化后比较期望状态，忽略 `<wbr>` 与更新时间，保留正文和格式差异。结构操作还检查父块与前邻位置。校验通过后才向 `/api/transactions` 提交正向或逆向事务。

确认成功才移动栈。失败、冲突与不支持的步骤保留；提交结果不明时暂停重试，防止重复执行。这里的“先比较再提交”没有内核事务级 compare-and-swap 保证，因此外部绕锁写入仍可能竞争；资料中不能写成“绝无冲突”。

## 修改约定

- 新增 RPC 必须校验类型、ID、长度、范围与代次；不信任客户端上报的名字或锚点。
- 名字用 `textContent`，或转义后再插入 HTML。覆盖层 `pointer-events: none`，协作显示不修改正文 DOM。
- 选区使用 CSS Custom Highlight，不向正文插入 span，不替换本地 Selection。
- 使用思源主题变量，尊重减少动态效果偏好。插件主体不为品牌资料强改用户主题。
- 卸载清理事件、观察器、定时器、RPC 绑定、覆盖层与方法替换。异步回包需要核对当前代次和停止状态。
- 清单、npm 元数据版本同步；正式更改包名需要迁移说明。中英文键及 `${name}` 等占位符一致。
- 不把笔记、真实截图、令牌、`conf.json`、IDE 缓存或原型备份提交到仓库。

## 怎么确认修改有效

基础测试覆盖多前端状态、输入校验、租约冲突、刷新去重、个人历史和保存后放锁。浏览器回归负责 DOM/Range、定位、换行、滚动、选区、遮挡及实际 Lute 规范化。

涉及编辑时，还应在两个真实前端里核对：不同块可同时编辑，同块不能同时申请，单击复制不申请锁，空块退格只执行一次；A 撤销保留 B 修改，冲突不消耗记录，段落拆分及空块删除可撤销重做。只使用自己创建的测试文档，并在完成后清理。

测试数量会变化，提交说明应记录实际执行结果，不把一个长期固定的数字当作质量承诺。
