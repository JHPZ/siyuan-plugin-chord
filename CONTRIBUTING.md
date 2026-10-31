# 一起维护和弦

谢谢你愿意花时间看这个项目。一份清楚的复现，往往比一份很长的功能清单更有帮助。

## 报告问题

请说明思源版本、和弦版本、前端类型，以及几个窗口如何连接到同一内核。然后写出最短的操作顺序：谁先编辑、谁退出、谁又做了什么，预期与实际分别如何。

涉及撤销时，请注明刷新或禁用插件是否发生过。涉及指针时，请说明是否有滚动、缩放、换行或折叠。可以使用“客户端 A / B”和临时文字，不必提供真实笔记。

请去除令牌、服务地址中的凭据、真实正文和工作区路径等私人信息。不要把整个工作区、`conf.json` 或个人历史快照上传到公开 Issue。怀疑涉及未公开漏洞时，先保留无敏感信息的最小复现，待项目确定私密反馈渠道后再提交敏感细节；目前没有公布安全邮箱。

## 提出改动

先说一个具体场景，再说希望改变的行为。修改已有代码前，读一遍它的调用处；尽量在共同的入口解决问题。

- 保持无运行时第三方依赖。能复用现有方法，就不要再包一层。
- 内核负责共享状态；前端负责交互、投影和本窗口个人历史。
- RPC 输入必须校验。名字按纯文本显示，私有会话键不进入广播。
- 不给正文注入协作展示标记；卸载时清理监听、定时器、覆盖层和编辑器方法替换。
- 中英文文案键与插值占位符保持一致。提示说明发生了什么，以及下一步怎么做。
- 修改非平凡逻辑时，补一个能说明问题的回归检查；不要只把实现重写成测试。

开发环境和现有约束见[开发说明](docs/development.md)。提交前执行：

```sh
npm test
npm run check
```

涉及 DOM、Range、滚动、编辑拦截或历史重放时，还要运行浏览器回归，并在两个真实前端中用测试文档核对。模拟内核通过，不等于真实编辑器一定正确。

## 描述一份修改

一份好的说明通常只需回答三件事：什么操作会触发问题，修改后的行为是什么，如何确认它真的发生了。结果有限制，就一并写清楚。

把无关整理留到另一份修改里。未经核对，不要把“能在我的测试文档里工作”写成“所有平台都支持”。

## English

Describe the versions, frontend types, and shortest sequence involving clients A and B. Use disposable text instead of private notes. Never post workspace archives, tokens, full configuration files, or personal-history snapshots. No private security contact has been published yet.

Keep changes focused. Validate RPC inputs, render names as text, clean up frontend hooks, and keep Chinese and English messages aligned. Run `npm test` and `npm run check`. DOM, selection, locking and history changes also need the browser suite and a real two-frontend check. Explain the trigger, resulting behavior, validation and remaining limits in the pull request.
