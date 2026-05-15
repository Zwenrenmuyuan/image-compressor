# 图片压缩工具

纯前端本地图片压缩工具，支持 JPG、PNG 和 WebP 导出。图片只在浏览器本地处理，不会上传到服务器。

## 在线体验

```text
https://zwenrenmuyuanzyj.me/image-compressor/
```

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages 自动部署

项目已包含 `.github/workflows/deploy.yml`。推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages。

首次使用需要在 GitHub 仓库设置中启用 Pages：

1. 打开仓库的 `Settings`。
2. 进入 `Pages`。
3. `Build and deployment` 的 `Source` 选择 `GitHub Actions`。
4. 推送代码到 `main` 分支，等待 Actions 完成。

如果仓库名是 `image-compressor`，部署地址通常是：

```text
https://你的用户名.github.io/image-compressor/
```

如果你的用户主页 `你的用户名.github.io` 已经绑定了 GitHub Pages 自定义域名，项目页通常会自动映射到自定义域名下。例如：

```text
https://你的用户名.github.io/image-compressor/
```

会变成：

```text
https://你的自定义域名/image-compressor/
```

这是 GitHub Pages 的正常行为，不需要额外修改项目代码。当前项目的体验地址就是这种情况：

```text
https://zwenrenmuyuanzyj.me/image-compressor/
```
