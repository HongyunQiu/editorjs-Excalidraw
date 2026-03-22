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
export interface ExcalidrawData {
    scene?: string;
    link?: string;
    asset?: ExcalidrawAssetRef;
    sceneSha256?: string;
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