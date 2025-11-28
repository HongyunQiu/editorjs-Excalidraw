![](https://badgen.net/badge/Editor.js/v2.0/blue)

## Excalidraw Editor.js Block Tool (`@editorjs/excalidraw`)

基于 [`@excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw) 实现的 **Editor.js 块级工具（BlockTool）**，在编辑器内部直接嵌入 Excalidraw 画布，用于保存和加载白板草图数据。

- **内嵌画布**：不再弹出额外窗口或依赖 `excalidraw.com`，编辑体验与原生 Excalidraw 一致  
- **标准数据结构**：直接使用 Excalidraw 官方推荐的 `elements + appState + files` 结构  
- **可配置高度**：支持通过配置项调整画布高度  
- **支持只读模式**：在 Editor.js 只读模式下以只读视图展示草图  

---

### 编译与本地开发

在 `PlugIns/editorjs-Excalidraw` 目录下：

```bash
npm install
npx --yes vite build
```

常用脚本（见 `package.json`）：

- `npm run dev`：本地开发（Vite 开发服务器）
- `npm run build`：打包生成 `dist/excalidraw.umd.js` 与 `dist/excalidraw.mjs`
- `npm run preview`：预览打包结果

---

### 在项目中安装使用

- 当前项目 **尚未发布到 npm**，推荐的集成方式是：  
  1）在本仓库中执行 `npm install && npx --yes vite build`，生成 `dist/excalidraw.umd.js` / `dist/excalidraw.mjs`；  
  2）在你的主工程中以 **本地文件形式** 引入构建产物（例如复制到主工程的静态资源目录或通过构建工具配置别名）；  
  3）在浏览器端通过 `<script src=".../excalidraw.umd.js"></script>` 的方式挂载为 `window.Excalidraw` 并注册到 Editor.js 中。

项目需要：

- `Editor.js` v2+
- 浏览器端可用的打包环境（Vite / Webpack 等）

#### 通过 ESModule 使用

```javascript
import EditorJS from '@editorjs/editorjs';
import Excalidraw from '@editorjs/excalidraw';

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    excalidraw: {
      class: Excalidraw,
      inlineToolbar: true,
      config: {
        // 可选：调整画布高度（默认 960）
        height: 960,
      },
    },
  },
});
```

#### 通过构建产物（UMD）加载

构建完成后，可在浏览器中直接通过 `<script>` 标签引入 UMD 文件：

```html
<!-- 为打包后的 Excalidraw UMD 提供 process 环境（避免浏览器中 process 未定义） -->
<script>
  window.process = window.process || { env: { NODE_ENV: 'production' } };
</script>

<!-- 本仓库构建产物 -->
<script src="dist/excalidraw.umd.js"></script>

<script>
  const editor = new EditorJS({
    holder: 'editorjs',
    tools: {
      excalidraw: {
        class: window.Excalidraw,
        inlineToolbar: true,
        config: {
          height: 960,
        },
      },
    },
  });
  // ...
</script>
```

---

### 工具配置

当前支持的配置项定义在 `ExcalidrawConfig` 接口中：

- `height?: number`：  
  - 画布高度（单位：像素）  
  - 默认值：`960`  
  - 示例：`config: { height: 600 }`

（旧版本中的 `scenePlaceholder` / `linkPlaceholder` / `openButtonText` 等文本输入相关配置已废弃，当前实现中不再使用文本区域，而是直接渲染 Excalidraw 画布。）

---

### 数据结构与保存格式

BlockTool 内部数据结构定义如下：

```ts
export interface ExcalidrawData {
  scene: string; // Excalidraw 场景 JSON 字符串，或可序列化为该结构的对象
  link?: string; // 预留字段，可用于记录自托管服务地址或共享链接
}
```

当调用 `editor.save()` 时，包含 `excalidraw` 块的数据示例：

```json
{
  "time": 1710000000000,
  "blocks": [
    {
      "type": "excalidraw",
      "data": {
        "scene": "{\n  \"elements\": [ ... ],\n  \"appState\": { ... },\n  \"files\": { ... }\n}",
        "link": ""
      }
    }
  ],
  "version": "2.30.7"
}
```

- `scene` 字段内部推荐存放 **完整的 Excalidraw 场景 JSON 字符串**，包含 `elements`、`appState`、`files` 等字段；  
- 如需在服务端进行解析或校验，请在服务端对该字段进行 `JSON.parse` 并做相应的格式检查；  
- 当再次渲染时，工具会从 `scene` 中恢复画布内容，并在安全范围内还原视图相关的 `appState`（缩放、滚动位置、主题等）。

---

### 本地测试页面

本仓库内置了一个简化版的 Editor.js 测试页面，位于 `test/` 目录：

- `test/editor-test-simple.html`：使用 CDN 加载 Editor.js，与本地构建的 `dist/excalidraw.umd.js` 进行集成测试  
- `test/editor-test.js`：初始化 Editor.js、注册 Excalidraw 工具，并支持保存 / 加载内容  
- `test/editor-test.css`：测试页面样式

使用方式（简要）：

1. 在本目录执行依赖安装与构建：

   ```bash
   npm install
   npx --yes vite build
   ```

2. 直接用浏览器打开 `test/editor-test-simple.html`（本地文件即可）；  
3. 点击页面上的“初始化编辑器”“保存内容”“加载内容”等按钮，观察控制台和右侧输出的 JSON，确认 Excalidraw 块可以正常插入、编辑与保存。

更详细说明可参考 `test/README.md`。

---

### 参考

- Excalidraw 官方仓库：<https://github.com/excalidraw/excalidraw>
