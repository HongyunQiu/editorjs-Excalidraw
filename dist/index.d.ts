import { API, BlockAPI, BlockTool, ToolConfig, SanitizerConfig } from '@editorjs/editorjs';
/**
 * Excalidraw 工具的配置
 */
export interface ExcalidrawConfig extends ToolConfig {
    /**
     * 画布高度（像素），默认 480
     */
    height?: number;
}
/**
 * Excalidraw 工具的数据结构
 *
 * scene 存放 Excalidraw 导出的 JSON 场景字符串。
 * link 预留字段，可用于记录自托管服务地址或共享链接。
 */
export interface ExcalidrawData {
    scene: string;
    link?: string;
}
/**
 * 构造参数
 */
interface ExcalidrawParams {
    data: ExcalidrawData;
    config?: ExcalidrawConfig;
    api: API;
    readOnly: boolean;
    block: BlockAPI;
}
/**
 * Editor.js Excalidraw BlockTool
 *
 * 直接在工具内部内嵌 Excalidraw 画布，不再跳转到 Excalidraw.com。
 * 如需自托管服务，只需在外部按官方文档部署 Excalidraw，并在解析 scene 时走自己的后端流程。
 */
export default class ExcalidrawBlock implements BlockTool {
    private api;
    private readOnly;
    private block;
    private data;
    private css;
    private height;
    private reactRoot;
    constructor({ data, config, api, readOnly, block }: ExcalidrawParams);
    static get isReadOnlySupported(): boolean;
    static get toolbox(): {
        icon: string;
        title: 'Excalidraw';
    };
    static get contentless(): boolean;
    static get enableLineBreaks(): boolean;
    render(): HTMLElement;
    save(): ExcalidrawData;
    static get sanitize(): SanitizerConfig;
    validate(data: ExcalidrawData): boolean;
    /**
     * Editor.js 在销毁 Block 或重新渲染数据时会调用 destroy，
     * 这里负责卸载 React Root，避免重复挂载或内存泄漏。
     */
    destroy(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map