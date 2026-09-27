# 离线安装与使用指南

这个插件当前没有上架 Chrome Web Store 或 Edge Add-ons。你可以通过浏览器的「开发者模式 + 加载已解压的扩展程序」离线安装。

## 1. 下载插件

### 方式 A：下载 Release 包

1. 打开 [Releases](https://github.com/powcai001/wechat-theme-switcher/releases)。
2. 下载最新版 `wechat-theme-switcher-v*.zip`。
3. 解压 Zip。
4. 记住解压出来的 `wechat-theme-switcher` 目录，里面应有 `manifest.json`。

### 方式 B：克隆源码

```bash
git clone https://github.com/powcai001/wechat-theme-switcher.git
cd wechat-theme-switcher
```

仓库根目录同样包含 `manifest.json`。

## 2. Chrome 安装

1. 打开新标签页，输入：

```text
chrome://extensions
```

2. 打开右上角「开发者模式」。
3. 点击左上角「加载已解压的扩展程序」。
4. 选择包含 `manifest.json` 的插件目录。
5. 打开微信公众号文章编辑页并刷新。
6. 页面右侧中间应出现「主题排版」按钮。

## 3. Edge 安装

1. 打开新标签页，输入：

```text
edge://extensions
```

2. 打开「开发人员模式」。
3. 点击「加载解压缩的扩展」。
4. 选择包含 `manifest.json` 的插件目录。
5. 打开微信公众号文章编辑页并刷新。
6. 页面右侧中间应出现「主题排版」按钮。

## 4. 日常使用

1. 点击右侧「主题排版」。
2. 点击「导入 .md」选择 Markdown 文件，或直接拖拽 `.md` 文件到输入框。
3. 插件会自动同步正文。
4. Markdown 中第一个一级标题会写入公众号标题输入框，并从正文中移除。
5. 点选主题卡片切换排版。
6. 使用公众号自己的「保存草稿」按钮保存。

插件不会自动保存、自动群发或代替用户发布文章。

## 5. 更新

### Release 安装

1. 下载新版 Zip；
2. 解压并替换旧目录；
3. 打开扩展管理页；
4. 点击本插件的「重新加载」；
5. 刷新公众号编辑页。

### Git 安装

```bash
git pull
```

然后同样在扩展管理页点击「重新加载」，并刷新公众号编辑页。

## 6. 卸载

在扩展管理页找到「Markdown 排版主题助手」或「公众号一键换主题 Spike」，点击「移除」即可。

卸载后，浏览器中本扩展保存的本地 Markdown 源文、最近使用主题和收藏也会被删除。建议先在插件里复制或导出重要 Markdown。

## 7. 常见问题

### 浏览器提示“停用开发者模式扩展程序”

这是离线安装扩展的正常提示，不代表插件出错。确认你信任当前代码来源后可以继续使用。

### 安装后没有「主题排版」按钮

1. 确认已刷新公众号文章编辑页。
2. 确认页面地址属于：

```text
https://mp.weixin.qq.com/cgi-bin/appmsg*
```

3. 在扩展管理页确认插件已启用。
4. 如果微信页面刚改版，可能是编辑器 DOM 变化，请提 GitHub Issue。

### 代码块换行异常

请确认使用 fenced code block：

````markdown
```python
print("hello")
```
````

### 图片没有渲染

使用 Markdown 标准图片语法：

```markdown
![图片说明](图片地址)
```

`[IMAGE:...]` 不是 Markdown 标准语法，会作为文本保留并提示修改。
