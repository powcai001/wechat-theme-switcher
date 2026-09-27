# 写 Markdown，直接在公众号后台换排版

我以前排版公众号文章，通常要在两个页面之间来回跳：先把 Markdown 粘到排版工具里，选好主题，复制，再粘回公众号后台。格式一多，代码块、表格、多图就容易出问题。想换一个主题，又得重新复制一遍。

所以我做了一个浏览器插件：**WeChat Theme Switcher**。

它装在 Chrome 或 Edge 里，会出现在微信公众号文章编辑页右侧。你把 Markdown 交给它，它在公众号正文里直接完成排版和主题切换。

项目地址：  
[https://github.com/powcai001/wechat-theme-switcher](https://github.com/powcai001/wechat-theme-switcher)

## 它能做什么

一句话概括：

> Markdown 是源文稿，公众号正文是渲染结果。

你可以在插件里导入 Markdown，然后一键切换主题。它会在每次切换时从 Markdown 重新生成排版，而不是在旧 HTML 上继续叠样式，所以连续切换多个主题时，不容易出现旧格式残留。

目前主要支持这些能力：

- 导入 `.md` 文件，或直接拖拽到输入框
- 自动同步到公众号正文
- 第一个一级标题自动填入公众号标题
- 多套主题一键切换
- 支持搜索主题、最近使用和收藏
- 优化代码块换行、表格、引用、任务列表和多图布局
- 内容只保存在本地浏览器中，不上传文章

它不会自动保存，也不会自动群发。最后的“保存草稿”和发布动作，仍然由你在公众号后台自己完成。

## 怎么安装

当前版本先提供离线安装包，没有上架插件商店。

1. 打开项目 Release 页面：  
   [https://github.com/powcai001/wechat-theme-switcher/releases](https://github.com/powcai001/wechat-theme-switcher/releases)
2. 下载最新版 `wechat-theme-switcher-v*.zip`。
3. 解压压缩包，得到 `wechat-theme-switcher` 文件夹。
4. 打开浏览器扩展管理页：
   - Chrome 输入：`chrome://extensions`
   - Edge 输入：`edge://extensions`
5. 打开「开发者模式」。
6. 点击「加载已解压的扩展程序」。
7. 选择刚才解压出来的 `wechat-theme-switcher` 文件夹。
8. 打开微信公众号文章编辑页，刷新页面。

刷新后，页面右侧中间会出现一个「主题排版」按钮。

## 怎么使用

先准备一篇 Markdown 文章。比如：

```markdown
# 我的文章标题

这是正文。

## 第一节

- 第一条
- 第二条
```

接着按这个流程操作：

1. 打开公众号文章编辑页。
2. 点击右侧的「主题排版」。
3. 点击「导入 .md」，选择你的 Markdown 文件；也可以直接把文件拖进输入框。
4. 插件会把正文同步到公众号编辑器里。
5. `# 我的文章标题` 会自动填进公众号标题输入框，正文里不会重复显示这个标题。
6. 点一张主题卡片，正文立即换排版。
7. 不满意就继续换下一张。
8. 觉得没问题，用公众号自己的「保存草稿」。

代码块也做了专门处理。比如技术文章里的 Python、JavaScript、Shell 代码，切主题后会尽量保留缩进和换行，不会挤成一行。

## 适合谁用

如果你经常写 Markdown，又要发布公众号文章，这个小工具会比较省事。

尤其是这些情况：

- 文章里经常有代码块
- 需要比较多个排版主题
- 不想在排版工具和公众号后台之间来回复制
- 希望保存一份 Markdown 源稿，后续随时重新排版

当前还是开发者预览版。微信编辑器页面如果改版，插件可能需要跟着更新。遇到问题，可以去 GitHub 提 Issue。

如果你刚好也在写公众号，可以试试看。

项目地址：  
[https://github.com/powcai001/wechat-theme-switcher](https://github.com/powcai001/wechat-theme-switcher)
