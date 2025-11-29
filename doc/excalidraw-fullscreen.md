## Excalidraw 插件 - 页面内全屏模式说明

### 功能概述

- **目标**：在 QNotes 中使用 Excalidraw 时，提供一个「页面内全屏」模式，方便在浏览器窗口内专注绘图。
- **行为**：
  - 不使用浏览器的原生全屏（F11），浏览器地址栏、标签栏等仍然可见。
  - 全屏时，Excalidraw 画布和工具栏会覆盖整个浏览器可视区域（包括 QNotes 顶部栏）。
  - 右上角始终有一个按钮，可在「全屏」和「退出全屏」之间切换。

### 关键实现位置

- 入口文件：`src/index.ts`
- 主要改动集中在 `ExcalidrawWrapper` 组件内：
  - 使用 `React.useState(false)` 维护 `isFullscreen` 状态。
  - 通过 `toggleFullscreen` 回调在普通模式和全屏模式之间切换。
  - 使用 `createPortal` 将全屏时的内容挂载到 `document.body` 下。

### 渲染逻辑简述

- **普通模式（内联渲染）**
  - 渲染结构：
    - 外层容器高度为配置的 `height`（默认 960），位于 Editor.js Block 区域内。
    - 右上角有「全屏」按钮（相对该容器 `position: absolute`）。
  - 样式关键点：
    - `position: 'relative'`
    - `borderRadius: 8`
    - `overflow: 'hidden'`

- **全屏模式（Portal + Fixed 覆盖层）**
  - 通过 `createPortal` 把内容渲染到 `document.body` 下：
    - 外层容器使用：`position: 'fixed'` + `top/left/right/bottom = 0`。
    - `zIndex` 设为一个非常大的值（`2147483647`），确保覆盖 QNotes 顶部栏等 UI。
    - 背景色保持与普通模式一致（`#f9fafb`）。
  - 全屏按钮：
    - 始终在视口右上角，使用 `position: 'fixed'`。
    - 文案会在「全屏」和「退出全屏」之间切换。

### 使用说明（对最终用户）

1. 在 QNotes 中插入一个 Excalidraw 区块。
2. 鼠标移动到画布区域右上角，点击 **「全屏」** 按钮：
   - 画布将覆盖整个页面可视区域，QNotes 顶部栏会被遮住。
3. 在全屏状态下，右上角会显示 **「退出全屏」** 按钮：
   - 点击即可恢复到原来的嵌入视图。
4. 该功能在 **只读模式** 和 **可编辑模式** 下都可使用；只读模式下仅限制编辑行为，不影响全屏能力。

### 对集成方的注意事项

- 不需要对 QNotes 主工程做额外改动，只要使用最新构建的 `dist/excalidraw.umd.js` 即可。
- 若页面中还有其他高层级浮层（如全局对话框），请避免使用比 `2147483647` 更高的 `z-index`，以免遮挡全屏画布。
- 若需要自定义按钮样式或文案，可在 `ExcalidrawWrapper` 中调整：「全屏」/「退出全屏」按钮的 `style` 或文本。

### 关于 Excalidraw 内部 Help / 快捷键弹窗

- Excalidraw 内部的 Help、快捷键说明等模态弹窗使用 `.excalidraw.excalidraw-modal-container` 作为容器，并通过 `z-index: var(--zIndex-modal)` 控制层级。
- 在页面内全屏实现中，我们的全屏容器同样挂在 `document.body` 下，并使用了一个极大的 `z-index` 值覆盖 QNotes 顶部栏，这会导致默认的 Help 弹窗在全屏模式下被全屏容器挡住。
- 为了确保这些模态弹窗在全屏模式下依然可见，需在 `src/index.css` 中增加以下覆盖样式：

```css
.excalidraw.excalidraw-modal-container {
  z-index: 2147483647 !important;
}
```

- 这样，Excalidraw 的模态弹窗会与全屏容器处于同一最高层级，并优先显示在最前面，无论当前是否为只读模式。


