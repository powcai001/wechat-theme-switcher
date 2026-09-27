# GitHub 发布与持续更新

## 1. 创建仓库

推荐仓库名：

```text
wechat-theme-switcher
```

仓库地址将使用：

```text
https://github.com/powcai001/wechat-theme-switcher
```

如果最终仓库名不同，请同步替换：

- `README.md`
- `docs/launch-article.md`
- 商店_listing 文案

## 2. 初始化本地仓库

在本目录执行：

```bash
git init
git add .
git commit -m "Initial developer preview"
git branch -M main
git remote add origin git@github.com:powcai001/wechat-theme-switcher.git
git push -u origin main
```

如果使用 GitHub CLI：

```bash
gh repo create powcai001/wechat-theme-switcher --public --source=. --remote=origin --push
```

## 3. 打 Tag

```bash
git tag v0.8.2
git push origin v0.8.2
```

## 4. 构建扩展包

在上级目录执行：

```bash
zip -qr wechat-theme-switcher-v0.8.2.zip wechat-format-spike
```

商店上传时使用这个 zip。

## 5. 后续更新流程

1. 新建分支；
2. 修改代码；
3. 跑语法检查；
4. 用 `tests/fixtures/comprehensive.md` 回归；
5. 更新 `CHANGELOG.md`；
6. 提升 `manifest.json` 版本；
7. PR 合并；
8. 打 tag；
9. 生成 zip；
10. 提交商店审核。

## 6. 商店上架准备

Chrome Web Store 与 Edge Add-ons 都需要：

- 128x128 图标；
- 隐私政策；
- 权限原因说明；
- 商店截图；
- 测试账号或演示说明（如审核方无法直接访问公众号后台，需要提供演示视频）。

建议截图：

1. 右侧主题工作台；
2. Markdown 导入和标题同步；
3. 技术风格代码块；
4. 多主题对比。
