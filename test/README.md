# Excalidraw Editor.js Tool 测试页

本目录下的测试文件基于 `/QNotes/test` 中的 Editor.js 功能测试页面简化/移植，并增加了 **Excalidraw BlockTool** 的验证。

## 文件说明

- `editor-test-simple.html` - 使用 CDN 加载 Editor.js + 常用工具，并通过本地构建的 `excalidraw.umd.js` 测试 Excalidraw 工具
- `editor-test.js` - 简化版测试脚本，初始化 Editor.js、注册 Excalidraw 工具，并支持保存/加载内容
- `editor-test.css` - 测试页面样式（复用 QNotes 测试页的布局与样式）

## 使用方法

1. 在 `PlugIns/editorjs-Excalidraw` 目录下安装依赖并构建：

   ```bash
   npm install
   npx --yes vite build
   ```

2. 用浏览器直接打开 `test/editor-test-simple.html`（本地文件即可）。
3. 点击“初始化编辑器”，确认：
   - Editor.js 能正常初始化；
   - 工具栏中可以插入 `Excalidraw` 类型的块；
   - 点击 “打开 Excalidraw” 按钮会在新窗口打开 `https://excalidraw.com`；
   - 将从 Excalidraw 导出的 JSON 场景粘贴到对应区域后，点击“保存内容”可以在右侧看到包含 `excalidraw` 块的 JSON 输出。

## 注意事项

- `editor-test-simple.html` 通过 `<script src="../dist/excalidraw.umd.js"></script>` 引入本地构建产物，请先执行构建命令。
- 如果网络环境无法访问 jsDelivr/CDN，可将 Editor.js 及其工具的脚本改为本地路径再测试。


