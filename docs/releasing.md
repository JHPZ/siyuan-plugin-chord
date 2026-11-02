# 发布

同步 `plugin.json` 与 `package.json` 的版本，然后在项目根目录运行：

```sh
npm test
npm run check
npm run build
```

打包需要 Windows 自带的 `tar.exe`，输出 `dist/package.zip` 和对应的 SHA256 文件。归档内容由 `package.json` 的 `files` 指定，脚本会核对文件列表与内容。

涉及交互的修改还需运行 `npm run test:browser`，并用同一内核的两个前端验证。测试方法见[开发说明](development.md)。

公开仓库创建后，将真实地址填入 `plugin.json.url`，再运行：

```sh
npm run check:release
```

验收通过后，为最终提交创建版本标签与对应的 GitHub Release，附上 `package.zip` 和校验文件。发布前用生成的安装包做一次安装验证，方法见[使用说明](guide.md)。
