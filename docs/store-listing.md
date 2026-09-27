# Chrome Web Store / Edge Add-ons listing draft

## Name

Markdown 排版主题助手

## Short description

在公众号文章编辑页中导入 Markdown，一键切换整洁排版主题。

## Detailed description

Markdown 排版主题助手把公众号正文排版放进一个右侧工作台：

- 导入或拖拽 `.md` 文件
- 自动同步正文
- 第一个一级标题自动写入文章标题
- 内置多种排版主题
- 支持连续切换主题，不残留旧格式
- 优化代码块换行、表格、引用、任务列表和多图布局
- 文章内容不上传，Markdown 源文只保存在本设备浏览器中

插件不会自动保存、自动群发或代替用户发布文章。保存草稿和发布仍由你在公众号后台完成。

## Permission justification

### storage

用于在本地保存：

- Markdown 源文
- 自动同步偏好
- 最近使用主题
- 收藏主题

### Host permission: `https://mp.weixin.qq.com/cgi-bin/appmsg*`

用于识别文章编辑页、注入排版工作台，并把格式化后的 HTML 写入当前正文编辑器。插件不在公众号首页、草稿列表或其他网站运行。

## Screenshots

1. `docs/screenshots/side-panel.png`：右侧排版工作台
2. `docs/screenshots/title-sync.png`：Markdown H1 自动写入标题
3. `docs/screenshots/comprehensive-markdown.png`：综合语法渲染

## Category

Productivity / Developer Tools

## Language

Chinese (Simplified)
