import { API, BlockAPI, BlockTool, SanitizerConfig, ToolConfig } from '@editorjs/editorjs';
export interface ExcalidrawConfig extends ToolConfig {
    height?: number;
}
export interface ExcalidrawAssetRef {
    url: string;
    name?: string;
    size?: number;
    mime?: string;
    sha256?: string;
}
export interface ExcalidrawSceneMeta {
    type?: string;
    version?: number;
    source?: string;
}
export interface ExcalidrawEditorDefaultStyle {
    strokeColor?: string;
    backgroundColor?: string;
    fillStyle?: string;
    strokeWidth?: number;
    strokeStyle?: string;
    roughness?: number;
    opacity?: number;
    fontFamily?: number;
    fontSize?: number;
    textAlign?: string;
    startArrowhead?: string | null;
    endArrowhead?: string | null;
    roundness?: unknown;
}
export interface ExcalidrawEditorPrefs {
    gridSize?: number | null;
    viewBackgroundColor?: string;
    objectsSnapModeEnabled?: boolean;
    defaultStyle?: ExcalidrawEditorDefaultStyle;
}
export interface ExcalidrawData {
    scene?: string;
    link?: string;
    asset?: ExcalidrawAssetRef;
    sceneSha256?: string;
    sceneMeta?: ExcalidrawSceneMeta;
    editorPrefs?: ExcalidrawEditorPrefs;
}
interface ExcalidrawParams {
    data: ExcalidrawData;
    config?: ExcalidrawConfig;
    api: API;
    readOnly: boolean;
    block: BlockAPI;
}
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
    destroy(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map