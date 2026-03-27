# 2026-03-27 Excalidraw 内容 / 配置 / 误触 / 忽略划分

本文记录 `editorjs-Excalidraw` 在 QNotes 中的持久化划分建议，目标是：

- 降低因 Excalidraw 纯交互导致的 `dirty` 误判
- 降低无意义的资产版本数量
- 明确哪些字段属于真正内容，哪些字段只属于编辑体验
- 为后续代码改造提供字段白名单与忽略规则

## 一、推荐的总体结构

建议将 Excalidraw 相关数据拆成四类：

1. 真正内容类
   说明：图本身的一部分，必须落资产文件，参与内容版本与哈希。
2. 配置类
   说明：不是图本身，但可能影响再次打开后的编辑体验。可考虑存入笔记 block 信息中，不参与资产哈希。
3. 低价值且高误触类
   说明：在编辑过程中频繁变化，极易因点击、拖拽、缩放等操作波动。既不应参与版本，也不建议记录。
4. 运行时 / 宿主类忽略项
   说明：属于 UI、设备、宿主布局或临时流程状态，不应做任何持久化。

建议的最终落点如下：

- 资产文件：只保留真正内容类
- Block data：只保留少量配置类
- 误触类：忽略，不记录
- 运行时 / 宿主类：忽略，不记录

---

## 二、真正内容类

这类字段一旦变化，代表图的真实内容发生了变化，应当落资产文件并参与版本与哈希。

### 1. `elements`

- 释义：画布上的元素本体，例如矩形、箭头、文字、图片元素等。
- 结论：必须落资产文件。
- 原因：这是 Excalidraw 场景最核心的业务内容。

### 2. `files`

- 释义：被 `elements` 引用的资源信息，主要是图片等二进制资源元数据。
- 结论：必须落资产文件。
- 原因：元素中的图片等内容依赖这些资源信息。

### 3. `type`

- 释义：场景类型标识，通常是 `excalidraw`。
- 结论：可保留在资产文件中。
- 原因：属于轻量元信息，便于文件自描述。

### 4. `version`

- 释义：场景数据格式版本。
- 结论：可保留在资产文件中。
- 原因：属于序列化格式元信息。

### 5. `source`

- 释义：来源标识，例如 `qnotes`。
- 结论：可保留在资产文件中。
- 原因：属于来源元信息，不是业务内容，但对调试和兼容性有帮助。

### 推荐资产文件结构

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "qnotes",
  "elements": [],
  "files": {}
}
```

---

## 三、配置类

这类字段不属于图本身，但可能影响“再次打开时的体验连续性”。建议视价值选择性保留到 block data 中，不参与内容版本，不参与资产哈希。

### A. 建议优先考虑保留的配置类

### 1. `gridSize`

- 释义：网格大小。
- 建议落点：`block.data.editorPrefs.gridSize`
- 价值判断：中等。
- 说明：它更像编辑辅助设置，不属于图内容本身；如果用户经常依赖网格，可以单独保存。

### 2. `viewBackgroundColor`

- 释义：画布背景颜色。
- 建议落点：`block.data.editorPrefs.viewBackgroundColor`
- 价值判断：视产品定义而定。
- 说明：如果将其视为展示偏好，可作为配置类保存；如果未来产品定义认为背景色属于作品内容，则应升级为真正内容类。

### B. 可选保留的“默认绘制偏好”

这组字段影响“接下来新建元素时的默认样式”，不会改变当前已有元素。

### 3. `currentItemStrokeColor`

- 释义：新建元素的默认描边颜色。
- 建议落点：`block.data.editorPrefs.defaultStyle.strokeColor`

### 4. `currentItemBackgroundColor`

- 释义：新建元素的默认填充颜色。
- 建议落点：`block.data.editorPrefs.defaultStyle.backgroundColor`

### 5. `currentItemFillStyle`

- 释义：新建元素的默认填充风格。
- 建议落点：`block.data.editorPrefs.defaultStyle.fillStyle`

### 6. `currentItemStrokeWidth`

- 释义：新建元素的默认描边宽度。
- 建议落点：`block.data.editorPrefs.defaultStyle.strokeWidth`

### 7. `currentItemStrokeStyle`

- 释义：新建元素的默认描边样式。
- 建议落点：`block.data.editorPrefs.defaultStyle.strokeStyle`

### 8. `currentItemRoughness`

- 释义：新建元素的默认粗糙度。
- 建议落点：`block.data.editorPrefs.defaultStyle.roughness`

### 9. `currentItemOpacity`

- 释义：新建元素的默认透明度。
- 建议落点：`block.data.editorPrefs.defaultStyle.opacity`

### 10. `currentItemFontFamily`

- 释义：文字元素默认字体。
- 建议落点：`block.data.editorPrefs.defaultStyle.fontFamily`

### 11. `currentItemFontSize`

- 释义：文字元素默认字号。
- 建议落点：`block.data.editorPrefs.defaultStyle.fontSize`

### 12. `currentItemTextAlign`

- 释义：文字元素默认对齐方式。
- 建议落点：`block.data.editorPrefs.defaultStyle.textAlign`

### 13. `currentItemStartArrowhead`

- 释义：线段起点箭头默认样式。
- 建议落点：`block.data.editorPrefs.defaultStyle.startArrowhead`

### 14. `currentItemEndArrowhead`

- 释义：线段终点箭头默认样式。
- 建议落点：`block.data.editorPrefs.defaultStyle.endArrowhead`

### 15. `currentItemRoundness`

- 释义：新建元素默认圆角或圆滑程度。
- 建议落点：`block.data.editorPrefs.defaultStyle.roundness`

### 16. `objectsSnapModeEnabled`

- 释义：对象吸附是否开启。
- 建议落点：`block.data.editorPrefs.objectsSnapModeEnabled`
- 价值判断：中低。
- 说明：更像编辑偏好，不属于内容。

### C. 当前不建议保留到 block 的配置字段

这些字段虽然有“偏好”属性，但更像全局 UI 状态，不适合做文档级持久化。

### 17. `theme`

- 释义：Excalidraw 组件当前明暗主题。
- 结论：不落库。
- 说明：已明确不做持久化。

### 18. `zenModeEnabled`

- 释义：是否开启极简界面模式。
- 结论：不建议文档级持久化。

### 19. `defaultSidebarDockedPreference`

- 释义：默认侧栏是否停靠的偏好。
- 结论：不建议文档级持久化。

### 20. `showStats`

- 释义：是否显示统计面板。
- 结论：不建议文档级持久化。

### 21. `exportBackground`

- 释义：导出时是否包含背景。
- 结论：不建议文档级持久化。

### 22. `exportEmbedScene`

- 释义：导出时是否嵌入 scene 信息。
- 结论：不建议文档级持久化。

### 23. `exportWithDarkMode`

- 释义：导出时是否使用深色模式。
- 结论：不建议文档级持久化。

### 24. `exportScale`

- 释义：导出倍率。
- 结论：不建议文档级持久化。

---

## 四、低价值且高误触类

这类字段在编辑中非常容易波动，往往由点击、移动画布、缩放、框选、进入某个编辑状态等操作触发。它们最容易引发：

- `dirty` 误判
- 本地草稿误更新
- 资产文件反复生成新版本

这类字段建议统一处理为：

- 不落资产文件
- 不落 block data
- 不参与 dirty 比较
- 不参与内容哈希

### 1. `scrollX`

- 释义：画布当前横向平移位置。
- 误触来源：拖动画布。

### 2. `scrollY`

- 释义：画布当前纵向平移位置。
- 误触来源：拖动画布。

### 3. `zoom`

- 释义：当前缩放比例。
- 误触来源：滚轮缩放、快捷键缩放、触控板缩放。

### 4. `selectedElementIds`

- 释义：当前选中的元素集合。
- 误触来源：单击、框选、取消选中。

### 5. `previousSelectedElementIds`

- 释义：上一次选中的元素集合。
- 误触来源：选择变化。

### 6. `selectedGroupIds`

- 释义：当前选中的组集合。
- 误触来源：选中组、取消选组。

### 7. `selectionElement`

- 释义：框选操作中的临时选区元素。
- 误触来源：鼠标拖拽框选。

### 8. `editingGroupId`

- 释义：当前钻取编辑中的组 ID。
- 误触来源：进入或退出组内编辑。

### 9. `editingElement`

- 释义：当前处于编辑态的元素。
- 误触来源：开始或结束编辑。

### 10. `editingLinearElement`

- 释义：当前正在编辑的线性元素及点位状态。
- 误触来源：编辑线段控制点。

### 11. `selectedLinearElement`

- 释义：当前选中的线性元素编辑器状态。
- 误触来源：选中线段。

### 12. `draggingElement`

- 释义：当前正在拖拽的元素。
- 误触来源：拖拽元素。

### 13. `resizingElement`

- 释义：当前正在缩放的元素。
- 误触来源：缩放元素。

### 14. `multiElement`

- 释义：当前连续绘制过程中的线性元素状态。
- 误触来源：连续画线、连续箭头。

### 15. `isResizing`

- 释义：当前是否处于缩放过程。
- 误触来源：缩放操作。

### 16. `isRotating`

- 释义：当前是否处于旋转过程。
- 误触来源：旋转操作。

### 17. `selectedElementsAreBeingDragged`

- 释义：当前选中的元素是否正在拖拽。
- 误触来源：拖拽已选中元素。

### 18. `cursorButton`

- 释义：当前鼠标按钮状态，例如按下或抬起。
- 误触来源：鼠标按压。

### 19. `scrolledOutside`

- 释义：当前滚动是否超出画布区域。
- 误触来源：滚动与视口变化。

### 20. `openMenu`

- 释义：当前打开的菜单。
- 误触来源：打开或关闭菜单。

### 21. `openPopup`

- 释义：当前打开的弹出面板。
- 误触来源：打开颜色面板等 UI。

### 22. `openDialog`

- 释义：当前打开的对话框。
- 误触来源：打开帮助、导出等弹窗。

### 23. `openSidebar`

- 释义：当前打开的侧栏及其 tab。
- 误触来源：打开图库、面板等侧边栏。

### 24. `showHyperlinkPopup`

- 释义：当前是否显示超链接提示或编辑面板。
- 误触来源：点击带链接元素。

### 25. `elementsToHighlight`

- 释义：当前需要高亮的元素集合。
- 误触来源：悬停、提示、编辑辅助。

### 26. `frameToHighlight`

- 释义：当前高亮中的 frame。
- 误触来源：聚焦或悬停 frame。

---

## 五、运行时 / 宿主类忽略项

这类字段并非“误触”导致的问题，而是语义上本来就不适合写入文档持久化。

### 1. `width`

- 释义：画布容器宽度。
- 原因：宿主布局信息。

### 2. `height`

- 释义：画布容器高度。
- 原因：宿主布局信息。

### 3. `offsetTop`

- 释义：画布相对页面顶部的偏移。
- 原因：宿主布局信息。

### 4. `offsetLeft`

- 释义：画布相对页面左侧的偏移。
- 原因：宿主布局信息。

### 5. `contextMenu`

- 释义：右键菜单内容与位置。
- 原因：运行时 UI 状态。

### 6. `toast`

- 释义：提示消息。
- 原因：运行时 UI 状态。

### 7. `errorMessage`

- 释义：错误提示。
- 原因：运行时 UI 状态。

### 8. `isLoading`

- 释义：加载状态。
- 原因：运行时 UI 状态。

### 9. `fileHandle`

- 释义：本地文件系统句柄。
- 原因：宿主环境对象，不应写入文档。

### 10. `collaborators`

- 释义：协作者状态信息。
- 原因：协同运行时数据，不属于单人文档内容。

### 11. `pasteDialog`

- 释义：粘贴相关对话框状态。
- 原因：临时交互流程状态。

### 12. `pendingImageElementId`

- 释义：等待放置到画布上的图片元素 ID。
- 原因：临时编辑流程状态。

### 13. `snapLines`

- 释义：吸附参考线。
- 原因：临时编辑辅助状态。

### 14. `originSnapOffset`

- 释义：吸附过程中使用的偏移量。
- 原因：临时编辑辅助状态。

### 15. `penDetected`

- 释义：是否检测到触控笔输入。
- 原因：设备状态。

### 16. `lastPointerDownWith`

- 释义：上次按下时使用的输入设备类型。
- 原因：输入设备状态。

---

## 六、推荐的 Block data 结构

建议后续将 block 数据收敛为类似结构：

```json
{
  "asset": {
    "url": "/attachments/excalidraw-xxx.excalidraw.json",
    "sha256": "..."
  },
  "sceneMeta": {
    "type": "excalidraw",
    "version": 2,
    "source": "qnotes"
  },
  "editorPrefs": {
    "gridSize": 20,
    "viewBackgroundColor": "#ffffff",
    "defaultStyle": {
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "strokeWidth": 2
    }
  }
}
```

其中：

- `asset`：指向真正内容文件
- `sceneMeta`：轻量元信息
- `editorPrefs`：可选配置类，不参与内容哈希

---

## 七、后续实现建议

### 1. 资产文件只保留内容白名单

资产文件中建议只保留：

- `type`
- `version`
- `source`
- `elements`
- `files`

### 2. block data 中新增可选配置容器

建议引入：

- `editorPrefs`
- 如有必要，也可以引入 `viewState`

但目前从减少误触与版本数量出发，优先建议只保留极少数字段。

### 3. dirty 比较使用与资产化相同的内容白名单

为避免脏状态判定与资产化逻辑不一致，`dirty` 比较建议复用与资产文件相同的内容归一化规则。

### 4. 明确禁止将完整 `appState` 直接回写到 `scene`

当前若直接保存完整 `appState`，会导致：

- 视图移动触发内容变化假象
- 点击 / 选中 / 打开面板触发 `dirty`
- 资产内容频繁变化，产生大量无意义版本

因此应改为：

- 内容类字段进入 scene asset
- 配置类字段进入 block data
- 误触类与运行时类直接忽略

---

## 八、当前结论

基于本次讨论，当前明确结论如下：

- `elements` / `files` 属于真正内容，必须落资产文件
- `theme` 不需要落库
- `scrollX` / `scrollY` / `zoom` / 选中态 / 打开弹窗等误触类不应被记录
- 配置类字段应与真正内容拆开，避免干扰内容版本与资产哈希
- 运行时 / 宿主类状态不做任何记录

这份划分可作为后续 `editorjs-Excalidraw` 改造的字段依据。
