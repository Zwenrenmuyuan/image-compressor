# 图片压缩工具

纯前端本地图片压缩工具，支持 JPG、PNG 和 WebP 导出。图片只在浏览器本地处理，不会上传到服务器。

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
