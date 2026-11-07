# 和弦 · Chord 1.0.0

发布文案草稿，正式发布时可用于 Release 正文。

和弦让连接同一思源内核的多个窗口看见彼此：谁在线、正在看哪一页、鼠标指向哪里，以及选中了哪些文字。

## 这一版有什么

- 顶栏在线人数、文档树观看人数，以及显示当前页面的紧凑人员名单；支持一次性打开对方页面。
- 正文与思源界面中的共享指针，按各窗口实际可见内容定位；目标隐藏、缺失、被遮挡或无法唯一匹配时隐藏。
- 文字选区与多人编辑光晕，支持整块多选和跨块拖选文字。
- 文本 I 形光标、原生块拖拽手形、仅在其他窗口显示的点击射线，以及短暂的组合键提示。
- 名字与颜色实时预览，独立的同步频率设置，低 / 中 / 高三档更新频率。

## 安装

需要思源 **3.8.9 或以上**，支持桌面端、桌面独立窗口和桌面浏览器。参与窗口需连接同一内核并启用同版插件。

手动安装时，将 `package.zip` 解压到 `<工作空间>/data/plugins/siyuan-plugin-chord/`，确认 `plugin.json` 直接位于此目录，再在思源的已下载插件中启用。更新后在所有参与窗口重新启用。

## 已知范围

在线人数按窗口计算，显示名字不是经过验证的账号。和弦只负责协作展示，正文同步、编辑、拖拽与撤销由思源处理，不提供权限控制、个人撤销保证或备份。

尚未穷举全部原生组件、主题和数据库布局。跨域页面内部、系统窗口、未知自绘画布及三维或透视变换不在支持范围内；高负载下仍可能掉帧。本版主要在 Windows 与思源 3.8.9 上验证，未完成跨平台全量验收。

## English

Chord brings live presence to windows connected to the same SiYuan kernel: online participants, document viewers, shared pointers, text selections and editing halos. Customize your name and color, choose an update frequency, or open another participant's current page once. Native block drags use a hand pointer; click effects and shortcut notices appear for other participants without executing remote actions.

Requires SiYuan 3.8.9 or later on desktop, desktop tab windows or desktop browsers. Enable the same Chord version in every participating window. For manual installation, extract `package.zip` into `<workspace>/data/plugins/siyuan-plugin-chord/`, with `plugin.json` at that directory's root.

Pointers require a matching visible target. Cross-origin interiors, operating-system windows, unknown custom canvases and 3D or perspective transforms are unsupported. Coverage across native components, themes, database layouts and operating systems is incomplete. Heavy workloads may drop frames. SiYuan handles document synchronization, editing and undo; Chord does not provide permissions, personal undo guarantees or backups.
