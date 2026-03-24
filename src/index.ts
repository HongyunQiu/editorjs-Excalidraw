import './index.css';
import { IconQuote } from '@codexteam/icons';
import { make } from '@editorjs/dom';
import type { API, BlockAPI, BlockTool, SanitizerConfig, ToolConfig } from '@editorjs/editorjs';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';

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

interface ExcalidrawCSS {
  baseClass: string;
  wrapper: string;
  canvasWrapper: string;
}

type ExcalidrawInitialData =
  | {
      elements?: readonly unknown[];
      appState?: unknown;
      files?: Record<string, unknown>;
    }
  | undefined;

interface ExcalidrawWrapperProps {
  initialScene: string | ExcalidrawInitialData | null | undefined;
  assetUrl?: string;
  height: number;
  onSceneChange: (scene: string) => void;
  readOnly: boolean;
}

const EXCALIDRAW_PIPELINE_NAME = 'excalidraw-assetize';
const EXCALIDRAW_TOOL_VERSION = '20260324-234800';

function buildSafeAppState(rawAppState: any): any | undefined {
  if (!rawAppState || typeof rawAppState !== 'object') {
    return undefined;
  }

  const safeAppState: any = {};

  if (rawAppState.theme === 'dark' || rawAppState.theme === 'light') {
    safeAppState.theme = rawAppState.theme;
  }
  if (typeof rawAppState.scrollX === 'number' && Number.isFinite(rawAppState.scrollX)) {
    safeAppState.scrollX = rawAppState.scrollX;
  }
  if (typeof rawAppState.scrollY === 'number' && Number.isFinite(rawAppState.scrollY)) {
    safeAppState.scrollY = rawAppState.scrollY;
  }
  if (rawAppState.zoom && typeof rawAppState.zoom.value === 'number' && Number.isFinite(rawAppState.zoom.value)) {
    safeAppState.zoom = { value: rawAppState.zoom.value };
  }
  if (
    typeof rawAppState.gridSize === 'number' &&
    Number.isFinite(rawAppState.gridSize) &&
    rawAppState.gridSize > 0
  ) {
    safeAppState.gridSize = rawAppState.gridSize;
  } else if (rawAppState.gridSize === null) {
    safeAppState.gridSize = null;
  }

  return Object.keys(safeAppState).length > 0 ? safeAppState : undefined;
}

function blankInitialData(): ExcalidrawInitialData {
  return {
    elements: [],
    appState: {
      gridSize: 20,
    },
    files: {},
  };
}

function normalizeSceneForInitialData(initialScene: string | ExcalidrawInitialData | null | undefined): ExcalidrawInitialData {
  if (!initialScene) {
    return blankInitialData();
  }

  if (typeof initialScene === 'object') {
    return {
      elements: Array.isArray(initialScene.elements) ? initialScene.elements : [],
      appState: buildSafeAppState((initialScene as any).appState),
      files: initialScene.files ?? {},
    };
  }

  try {
    const parsed = JSON.parse(initialScene);
    return {
      elements: Array.isArray(parsed?.elements) ? parsed.elements : [],
      appState: buildSafeAppState(parsed?.appState),
      files: parsed?.files ?? {},
    };
  } catch (error) {
    console.warn('[ExcalidrawBlock] failed to parse scene JSON, fallback to blank scene:', error);
    return blankInitialData();
  }
}

const ExcalidrawWrapper = (props: ExcalidrawWrapperProps) => {
  const { initialScene, assetUrl, height, onSceneChange, readOnly } = props;
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [resolvedInitialScene, setResolvedInitialScene] = React.useState<string | ExcalidrawInitialData | null | undefined>(initialScene);
  const [isAssetLoading, setIsAssetLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if (typeof initialScene === 'string' && initialScene.trim()) {
      setResolvedInitialScene(initialScene);
      setIsAssetLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (initialScene && typeof initialScene === 'object') {
      setResolvedInitialScene(initialScene);
      setIsAssetLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!assetUrl) {
      setResolvedInitialScene(initialScene);
      setIsAssetLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsAssetLoading(true);
    void fetch(assetUrl, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`failed to fetch excalidraw asset: ${response.status}`);
        }

        return await response.text();
      })
      .then((sceneText) => {
        if (!cancelled) {
          setResolvedInitialScene(sceneText);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('[ExcalidrawBlock] failed to load scene asset, fallback to blank scene:', error);
          setResolvedInitialScene(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAssetLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetUrl, initialScene]);

  const initialData: ExcalidrawInitialData = React.useMemo(
    () => normalizeSceneForInitialData(resolvedInitialScene),
    [resolvedInitialScene],
  );

  const latestSceneRef = React.useRef<ExcalidrawInitialData>(initialData);
  React.useEffect(() => {
    latestSceneRef.current = initialData;
  }, [initialData]);

  const handleChange = React.useCallback(
    (elements: readonly unknown[], appState: unknown, files: Record<string, unknown>) => {
      latestSceneRef.current = {
        elements,
        appState,
        files,
      };

      onSceneChange(
        JSON.stringify(
          {
            elements,
            appState,
            files,
          },
          null,
          2,
        ),
      );
    },
    [onSceneChange],
  );

  const toggleFullscreen = React.useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const inlineWrapperStyle = {
    height,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative' as const,
  };

  const fullscreenWrapperStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2147483647,
    backgroundColor: '#f9fafb',
  };

  const fullscreenButtonStyleBase = {
    zIndex: 2147483647,
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
  };

  const fullscreenButtonInlineStyle = {
    ...fullscreenButtonStyleBase,
    position: 'absolute' as const,
    top: 8,
    right: 8,
  };

  const fullscreenButtonFixedStyle = {
    ...fullscreenButtonStyleBase,
    position: 'fixed' as const,
    top: 16,
    right: 16,
  };

  const excalidrawElement = React.createElement(Excalidraw as unknown as any, {
    key: 'excalidraw',
    initialData: latestSceneRef.current ?? initialData,
    onChange: handleChange,
    viewModeEnabled: readOnly,
  } as Record<string, unknown>);

  const fullscreenToggleButton = React.createElement(
    'button',
    {
      key: 'fullscreen-toggle',
      type: 'button',
      onClick: toggleFullscreen,
      style: isFullscreen ? fullscreenButtonFixedStyle : fullscreenButtonInlineStyle,
    },
    isFullscreen ? '退出全屏' : '全屏',
  );

  const loadingOverlay = isAssetLoading
    ? React.createElement(
        'div',
        {
          key: 'loading-overlay',
          style: {
            position: 'absolute' as const,
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(249, 250, 251, 0.85)',
            color: '#475569',
            fontSize: 14,
            zIndex: 2,
          },
        },
        'Loading drawing...',
      )
    : null;

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      React.createElement(
        'div',
        { style: fullscreenWrapperStyle },
        [fullscreenToggleButton, loadingOverlay, excalidrawElement],
      ),
      document.body,
    );
  }

  return React.createElement(
    'div',
    { style: inlineWrapperStyle },
    [fullscreenToggleButton, loadingOverlay, excalidrawElement],
  );
};

function getQNotesApp(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.QNotesApp && typeof w.QNotesApp === 'object' ? w.QNotesApp : null;
}

function stableStringify(value: any): string {
  if (value == null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number' || t === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

function normalizeSceneObject(sceneObj: any): Record<string, unknown> {
  const src = sceneObj && typeof sceneObj === 'object' ? sceneObj : {};
  return {
    type: src.type != null ? src.type : 'excalidraw',
    version: src.version != null ? src.version : 2,
    source: src.source != null ? src.source : 'qnotes',
    elements: Array.isArray(src.elements) ? src.elements : [],
    appState: src.appState && typeof src.appState === 'object' ? src.appState : {},
    files: src.files && typeof src.files === 'object' ? src.files : {},
  };
}

function buildContentSignatureScene(sceneObj: any): Record<string, unknown> {
  const normalized = normalizeSceneObject(sceneObj);
  return {
    type: normalized.type,
    version: normalized.version,
    source: normalized.source,
    elements: normalized.elements,
    files: normalized.files,
  };
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function findPreviousBlockByIdOrIndex(app: any, currentBlock: any, index: number): any | null {
  const prevBlocks = app && app.state && app.state.lastRenderedEditorData && Array.isArray(app.state.lastRenderedEditorData.blocks)
    ? app.state.lastRenderedEditorData.blocks
    : [];
  const currentId = currentBlock && currentBlock.id ? String(currentBlock.id) : '';

  if (currentId) {
    const matched = prevBlocks.find((block: any) => block && String(block.id || '') === currentId);
    if (matched) return matched;
  }

  return prevBlocks[index] || null;
}

async function assetizeExcalidrawBlock(app: any, block: any, index: number): Promise<any> {
  if (!block || block.type !== 'excalidraw') {
    return block;
  }

  const fn = app && app.fn ? app.fn : null;
  if (!fn || typeof fn.uploadAttachmentBlobAsQNotes !== 'function') {
    return block;
  }

  const data = block.data && typeof block.data === 'object' ? { ...block.data } : {};
  const previousBlock = findPreviousBlockByIdOrIndex(app, block, index);
  const previousData = previousBlock && previousBlock.data && typeof previousBlock.data === 'object'
    ? previousBlock.data
    : {};
  const sceneText = typeof data.scene === 'string' ? data.scene.trim() : '';
  const currentAsset = data.asset && typeof data.asset === 'object' ? data.asset : null;
  const previousAsset = previousData.asset && typeof previousData.asset === 'object' ? previousData.asset : null;
  const existingAsset = currentAsset || previousAsset;
  const existingSha = typeof data.sceneSha256 === 'string' && data.sceneSha256
    ? data.sceneSha256
    : (existingAsset && typeof existingAsset.sha256 === 'string' ? existingAsset.sha256 : '');

  if (!sceneText) {
    if (existingAsset && typeof existingAsset.url === 'string' && existingAsset.url) {
      return {
        ...block,
        data: {
          ...data,
          scene: '',
          sceneSha256: existingSha || '',
          asset: existingAsset,
        },
      };
    }
    return block;
  }

  let parsedScene: any;
  try {
    parsedScene = JSON.parse(sceneText);
  } catch (_) {
    return block;
  }

  const normalizedScene = normalizeSceneObject(parsedScene);
  const sceneFileText = `${stableStringify(normalizedScene)}\n`;
  const sceneContentSignature = stableStringify(buildContentSignatureScene(normalizedScene));
  const sha256 = await sha256Hex(sceneContentSignature);

  if (existingAsset && typeof existingAsset.url === 'string' && existingAsset.url && existingSha === sha256) {
    return {
      ...block,
      data: {
        ...data,
        scene: '',
        sceneSha256: sha256,
        asset: existingAsset,
      },
    };
  }

  const filename = `excalidraw-${sha256}.excalidraw.json`;
  const blob = new Blob([sceneFileText], { type: 'application/json' });
  const uploadResult = await fn.uploadAttachmentBlobAsQNotes(blob, filename);
  if (!uploadResult || !uploadResult.file || !uploadResult.file.url) {
    throw new Error('Failed to upload excalidraw scene asset');
  }

  return {
    ...block,
    data: {
      ...data,
      scene: '',
      sceneSha256: sha256,
      asset: {
        url: String(uploadResult.file.url),
        name: typeof uploadResult.file.name === 'string' ? uploadResult.file.name : filename,
        size: Number.isFinite(Number(uploadResult.file.size)) ? Number(uploadResult.file.size) : sceneFileText.length,
        mime: 'application/json',
        sha256,
      },
    },
  };
}

function ensureExcalidrawCommitPipelineRegistered(): void {
  const app = getQNotesApp();
  if (!app || !app.fn || typeof app.fn.registerBeforeCommitPipeline !== 'function') {
    return;
  }

  if (app.__excalidrawCommitPipelineRegistered) {
    return;
  }

  app.fn.registerBeforeCommitPipeline(
    EXCALIDRAW_PIPELINE_NAME,
    async (data: any) => {
      const editorData = data && typeof data === 'object' ? data : {};
      const blocks = Array.isArray(editorData.blocks) ? editorData.blocks : [];
      if (!blocks.length) {
        return editorData;
      }

      const nextBlocks = [];
      for (let index = 0; index < blocks.length; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        nextBlocks.push(await assetizeExcalidrawBlock(app, blocks[index], index));
      }

      return {
        ...editorData,
        blocks: nextBlocks,
      };
    },
  );

  app.__excalidrawCommitPipelineRegistered = true;
}

export default class ExcalidrawBlock implements BlockTool {
  private api: API;
  private readOnly: boolean;
  private block: BlockAPI;
  private data: ExcalidrawData;
  private css: ExcalidrawCSS;
  private height: number;
  private reactRoot: any;

  constructor({ data, config, api, readOnly, block }: ExcalidrawParams) {
    ensureExcalidrawCommitPipelineRegistered();

    this.api = api;
    this.readOnly = readOnly;
    this.block = block;

    const rawScene = data?.scene;
    let normalizedScene = '';

    if (typeof rawScene === 'string') {
      normalizedScene = rawScene;
    } else if (rawScene && typeof rawScene === 'object') {
      try {
        normalizedScene = JSON.stringify(rawScene);
      } catch (error) {
        console.warn('[ExcalidrawBlock] failed to serialize incoming scene object, fallback to blank scene:', error);
      }
    }

    this.data = {
      scene: normalizedScene,
      link: data?.link ?? '',
      asset: data?.asset,
      sceneSha256: data?.sceneSha256,
    };

    this.height = Number.isFinite(config?.height as number) ? (config!.height as number) : 960;
    this.css = {
      baseClass: this.api.styles.block,
      wrapper: 'cdx-excalidraw',
      canvasWrapper: 'cdx-excalidraw__canvas-wrapper',
    };
  }

  public static get isReadOnlySupported(): boolean {
    return true;
  }

  public static get toolbox(): { icon: string; title: 'Excalidraw' } {
    return {
      icon: IconQuote,
      title: 'Excalidraw',
    };
  }

  public static get contentless(): boolean {
    return true;
  }

  public static get enableLineBreaks(): boolean {
    return true;
  }

  public render(): HTMLElement {
    const container = make('div', [this.css.baseClass, this.css.wrapper]);
    const canvasHost = make('div', [this.css.canvasWrapper]);
    container.appendChild(canvasHost);

    const onSceneChange = (scene: string) => {
      this.data.scene = scene;
    };

    this.reactRoot = createRoot(canvasHost);
    this.reactRoot.render(
      React.createElement(ExcalidrawWrapper, {
        initialScene: this.data.scene,
        assetUrl: this.data.asset?.url,
        height: this.height,
        onSceneChange,
        readOnly: this.readOnly,
      }),
    );

    return container;
  }

  public save(): ExcalidrawData {
    return {
      scene: this.data.scene ?? '',
      link: this.data.link,
      asset: this.data.asset,
      sceneSha256: this.data.sceneSha256,
    };
  }

  public static get sanitize(): SanitizerConfig {
    return {
      scene: {
        br: true,
      },
      link: {
        br: true,
      },
      asset: false,
      sceneSha256: false,
    } as unknown as SanitizerConfig;
  }

  public validate(data: ExcalidrawData): boolean {
    if (!data) {
      return false;
    }

    if (typeof (data as any).scene === 'string') {
      return true;
    }

    if (typeof (data as any).scene === 'object' && (data as any).scene !== null) {
      return true;
    }

    if ((data as any).asset && typeof (data as any).asset.url === 'string') {
      return true;
    }

    return false;
  }

  public destroy(): void {
    if (this.reactRoot && typeof this.reactRoot.unmount === 'function') {
      this.reactRoot.unmount();
    }

    this.reactRoot = null;
  }
}

if (typeof window !== 'undefined') {
  try {
    console.info('[QNotes][ExcalidrawTool] loaded version', EXCALIDRAW_TOOL_VERSION);
  } catch (_) {}
}
