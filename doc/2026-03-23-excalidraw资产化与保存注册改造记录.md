# 2026-03-23 Excalidraw 资产化与保存注册改造记录

本文记录 `editorjs-Excalidraw` 在 2026-03-23 完成的一次较大调整，核心目标是把绘图场景从 block 内联存储迁移为资产文件存储，并把工具专属的保存前处理逻辑收回到插件自身。

## 一、背景

此前 Excalidraw 的场景内容直接放在 block 的 `data.scene` 中。这个方案在只包含少量矢量元素时还能接受，但一旦画板内包含图片、二进制文件或较大的 `files` 数据，就会出现几个问题：

- block 体积迅速膨胀
- 笔记正文 JSON 中混入大量二进制噪声
- AI 检索、全文提取、diff 判断时容易被无关数据干扰
- 前端保存链路需要频繁处理超大 block

因此本次改造将 Excalidraw 场景切换为“资产化存储”。

## 二、改造目标

- 保存时将 Excalidraw 场景导出为 `.excalidraw.json` 文件并上传
- block 中只保留轻量引用信息，而不是完整场景正文
- 重新打开笔记时，优先从资产 URL 加载场景
- 兼容旧笔记中仍然存放在 `data.scene` 的历史数据
- 如果内容没有变化，则不重复上传资产
- 工具专属逻辑不再常驻在 QNotes 主应用脚本中

## 三、当前数据结构

Excalidraw block 当前支持以下字段：

```json
{
  "type": "excalidraw",
  "data": {
    "scene": "",
    "link": "",
    "sceneSha256": "sha256-hex",
    "asset": {
      "url": "/uploads/...",
      "name": "excalidraw-xxxx.excalidraw.json",
      "size": 12345,
      "mime": "application/json",
      "sha256": "sha256-hex"
    }
  }
}
```

说明：

- `scene`：编辑态临时字段。保存前如果存在，会被资产化逻辑处理
- `asset`：已上传场景文件的引用
- `sceneSha256`：用于内容变更判断与资产复用

## 四、保存策略

### 1. 内容规范化

插件保存前会将场景整理为稳定结构，主要包含：

- `type`
- `version`
- `source`
- `elements`
- `appState`
- `files`

其中用于 SHA 判断的“内容签名”目前只纳入：

- `type`
- `version`
- `source`
- `elements`
- `files`

这意味着视图级状态如滚动位置、缩放值不参与是否重新上传的判定，避免仅因为视图变化就生成新资产。

### 2. SHA 去重

插件会对规范化后的内容签名做稳定序列化，再计算 `SHA-256`。

行为如下：

- 如果当前 block 已有 `asset`，且 `sceneSha256` 与新计算值一致，则直接复用已有资产
- 如果旧笔记还保留内嵌 `scene`，下次保存时会自动导出资产并写回 `asset + sceneSha256`
- 如果内容变化，则生成新的文件名并重新上传

文件名格式当前为：

```text
excalidraw-{sha256}.excalidraw.json
```

这个命名方式可以天然表达“同内容同文件名”，也便于排查。

### 3. 旧数据兼容

兼容策略是“读旧写新”：

- 读取旧笔记时，如果 `scene` 仍然存在，插件仍可正常解析并打开
- 下次执行保存时，会把旧的内嵌场景迁移为资产引用
- 迁移后 block 中的 `scene` 会被清空，只保留 `asset` 和 `sceneSha256`

## 五、加载策略

插件现在支持两种加载来源：

### 1. 内嵌场景优先

如果 `data.scene` 是非空字符串，说明当前仍是旧数据或尚未资产化的编辑态内容，优先直接解析它。

### 2. 资产回读

如果 `scene` 为空，但 `asset.url` 存在，则插件会：

- 使用 `fetch(asset.url, { credentials: 'same-origin' })`
- 拉取场景 JSON 文本
- 解析为 Excalidraw 初始数据

加载过程中会显示一个简单的 `Loading drawing...` 覆盖层。

## 六、保存前处理逻辑的归属调整

本次改造初版曾在 QNotes 主应用中增加一个专门的 `excalidrawAssets.js`，由主应用统一处理 Excalidraw 的资产化。该实现功能可用，但存在明显耦合：

- QNotes 会无条件加载一个 Excalidraw 专属脚本
- 主应用层知道了某个具体工具的业务细节
- 后续其他工具如果也要做资产化，容易继续堆积专用脚本

因此后续又做了一次结构调整：

- QNotes 只提供通用的保存前注册器
- Excalidraw 插件在自身初始化时注册 `excalidraw-assetize`
- 工具专属逻辑回到插件源码内部

这样只有在真正加载和使用 Excalidraw 工具时，相关逻辑才会参与保存链路。

## 七、与 QNotes 的协作依赖

插件侧资产化当前依赖 QNotes 提供两个基础能力：

- `window.QNotesApp.fn.registerBeforeCommitPipeline(name, handler)`
- `window.QNotesApp.fn.uploadAttachmentBlobAsQNotes(blob, filename)`

插件不直接操心 QNotes 的保存实现，只在“提交前”把自己的 block 数据整理成最终结构。

## 八、相关影响

为了适配资产化，本次同步还调整了 QNotes 侧的若干行为：

- dirty signature 计算不再把 Excalidraw 资产引用本身当作正文噪声
- 全文提取对 `excalidraw` block 输出固定占位文本 `[excalidraw]`
- vendor 产物已同步更新到 QNotes

## 九、后续建议

- 如果后续有更多重型工具需要做资产化，可以复用同样的保存前注册方式
- 如果未来需要更严格的版本治理，可以考虑把 `sceneSha256` 作为资产索引的一部分在服务端做进一步复用
- 如果未来要支持离线编辑恢复，可以在插件层继续补充更细粒度的本地缓存策略

