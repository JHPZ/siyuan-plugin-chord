# 发布

## 当前准备状态

首发版本为 `1.0.0`。中英文介绍、[发布文案](release-notes-1.0.0.md)、[使用说明](guide.md)、[图标与宣传素材](assets/README.md)已在仓库中。

`plugin.json.url` 仍为空；现有远端是自建 Git，尚未配置用于集市收录的 GitHub 仓库。准备完成后填写真实 GitHub 地址，再构建最终安装包。本地安装包可以先分发测试，不能据此视为已上架。

## 检查与打包

保持 `plugin.json` 与 `package.json` 的版本一致，在项目根目录运行：

```sh
npm test
npm run check
npm run build
```

打包需要 Windows 自带的 `tar.exe`，输出 `dist/package.zip` 和 `dist/package.zip.sha256`。归档内容由 `package.json` 的 `files` 指定，脚本会核对文件列表与内容。上传附件保留文件名 `package.zip`；不要在包内再套一层目录。

涉及交互的修改还需运行 `npm run test:browser`，并用同一内核的两个前端验证。测试方法见[开发说明](development.md)。发布前应使用最终安装包验证首次启用、双端在线、指针与选区、设置保存以及卸载清理；未完成的组件和平台验证应保留在发布说明中。

## 正式发布

1. 准备名为 `siyuan-plugin-chord` 的公开 GitHub 仓库，将真实地址写入 `plugin.json.url`。
2. 运行 `npm run check:release`，通过后重新运行 `npm run build`，确保包内包含最终清单和文档。
3. 验证最终包并提交。为该提交创建 `1.0.0` 标签及对应 GitHub Release，正文使用[发布文案](release-notes-1.0.0.md)并去掉草稿提示。
4. 将 `package.zip` 和 `package.zip.sha256` 附到 Release。正式上架使用普通 Release，不能仅保留草稿或预发布。
5. 首次上架时，按思源集市规则向 `siyuan-note/bazaar` 的 `plugins.txt` 添加实际的 `owner/siyuan-plugin-chord` 并提交 PR；后续更新提升版本并发布 Release。

发布规则以思源官方插件示例及集市文档为准：

- https://github.com/siyuan-note/plugin-sample/blob/main/README.zh-CN.md
- https://github.com/siyuan-note/bazaar/blob/main/README.zh-CN.md

`disabledInPublish: true` 表示插件不在思源的网页发布服务中运行，与集市上架无关，无需为上架改成 false。
