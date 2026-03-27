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
  editorPrefs?: ExcalidrawEditorPrefs;
  sceneMeta?: ExcalidrawSceneMeta;
  height: number;
  onSceneChange: (scene: string) => void;
  onSceneResolved?: (scene: string) => void;
  readOnly: boolean;
}

const EXCALIDRAW_PIPELINE_NAME = 'excalidraw-assetize';
const EXCALIDRAW_TOOL_VERSION = '20260327-172800';
type PreferredTheme = 'light' | 'dark';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function extractSceneMeta(rawScene: any, fallback?: ExcalidrawSceneMeta): ExcalidrawSceneMeta {
  const scene = rawScene && typeof rawScene === 'object' ? rawScene : {};
  const meta: ExcalidrawSceneMeta = {
    type: isNonEmptyString(scene.type) ? scene.type : (isNonEmptyString(fallback?.type) ? fallback?.type : 'excalidraw'),
    version: isFiniteNumber(scene.version) ? scene.version : (isFiniteNumber(fallback?.version) ? fallback?.version : 2),
    source: isNonEmptyString(scene.source) ? scene.source : (isNonEmptyString(fallback?.source) ? fallback?.source : 'qnotes'),
  };
  return meta;
}

function extractEditorPrefs(rawAppState: any, fallback?: ExcalidrawEditorPrefs): ExcalidrawEditorPrefs | undefined {
  if ((!rawAppState || typeof rawAppState !== 'object') && (!fallback || typeof fallback !== 'object')) {
    return undefined;
  }

  const appState = rawAppState && typeof rawAppState === 'object' ? rawAppState : {};
  const defaultStyle: ExcalidrawEditorDefaultStyle = {};
  const fallbackDefaultStyle = fallback?.defaultStyle && typeof fallback.defaultStyle === 'object'
    ? fallback.defaultStyle
    : undefined;

  const copyString = (sourceValue: unknown, fallbackValue?: string): string | undefined => {
    if (isNonEmptyString(sourceValue)) return sourceValue;
    if (isNonEmptyString(fallbackValue)) return fallbackValue;
    return undefined;
  };
  const copyNumber = (sourceValue: unknown, fallbackValue?: number): number | undefined => {
    if (isFiniteNumber(sourceValue)) return sourceValue;
    if (isFiniteNumber(fallbackValue)) return fallbackValue;
    return undefined;
  };

  const strokeColor = copyString(appState.currentItemStrokeColor, fallbackDefaultStyle?.strokeColor);
  if (strokeColor) {
    defaultStyle.strokeColor = strokeColor;
  }
  const backgroundColor = copyString(appState.currentItemBackgroundColor, fallbackDefaultStyle?.backgroundColor);
  if (backgroundColor) {
    defaultStyle.backgroundColor = backgroundColor;
  }
  const fillStyle = copyString(appState.currentItemFillStyle, fallbackDefaultStyle?.fillStyle);
  if (fillStyle) {
    defaultStyle.fillStyle = fillStyle;
  }
  const strokeWidth = copyNumber(appState.currentItemStrokeWidth, fallbackDefaultStyle?.strokeWidth);
  if (strokeWidth !== undefined) {
    defaultStyle.strokeWidth = strokeWidth;
  }
  const strokeStyle = copyString(appState.currentItemStrokeStyle, fallbackDefaultStyle?.strokeStyle);
  if (strokeStyle) {
    defaultStyle.strokeStyle = strokeStyle;
  }
  const roughness = copyNumber(appState.currentItemRoughness, fallbackDefaultStyle?.roughness);
  if (roughness !== undefined) {
    defaultStyle.roughness = roughness;
  }
  const opacity = copyNumber(appState.currentItemOpacity, fallbackDefaultStyle?.opacity);
  if (opacity !== undefined) {
    defaultStyle.opacity = opacity;
  }
  const fontFamily = copyNumber(appState.currentItemFontFamily, fallbackDefaultStyle?.fontFamily);
  if (fontFamily !== undefined) {
    defaultStyle.fontFamily = fontFamily;
  }
  const fontSize = copyNumber(appState.currentItemFontSize, fallbackDefaultStyle?.fontSize);
  if (fontSize !== undefined) {
    defaultStyle.fontSize = fontSize;
  }
  const textAlign = copyString(appState.currentItemTextAlign, fallbackDefaultStyle?.textAlign);
  if (textAlign) {
    defaultStyle.textAlign = textAlign;
  }
  if (appState.currentItemStartArrowhead === null || fallbackDefaultStyle?.startArrowhead === null) {
    defaultStyle.startArrowhead = appState.currentItemStartArrowhead === null ? null : fallbackDefaultStyle?.startArrowhead ?? null;
  } else {
    const startArrowhead = copyString(appState.currentItemStartArrowhead, fallbackDefaultStyle?.startArrowhead ?? undefined);
    if (startArrowhead) {
      defaultStyle.startArrowhead = startArrowhead;
    }
  }
  if (appState.currentItemEndArrowhead === null || fallbackDefaultStyle?.endArrowhead === null) {
    defaultStyle.endArrowhead = appState.currentItemEndArrowhead === null ? null : fallbackDefaultStyle?.endArrowhead ?? null;
  } else {
    const endArrowhead = copyString(appState.currentItemEndArrowhead, fallbackDefaultStyle?.endArrowhead ?? undefined);
    if (endArrowhead) {
      defaultStyle.endArrowhead = endArrowhead;
    }
  }
  if (appState.currentItemRoundness != null) {
    defaultStyle.roundness = appState.currentItemRoundness;
  } else if (fallbackDefaultStyle?.roundness != null) {
    defaultStyle.roundness = fallbackDefaultStyle.roundness;
  }

  const prefs: ExcalidrawEditorPrefs = {};

  if (isFiniteNumber(appState.gridSize) && appState.gridSize > 0) {
    prefs.gridSize = appState.gridSize;
  } else if (appState.gridSize === null) {
    prefs.gridSize = null;
  } else if (fallback && 'gridSize' in fallback) {
    prefs.gridSize = fallback.gridSize;
  }

  const viewBackgroundColor = copyString(appState.viewBackgroundColor, fallback?.viewBackgroundColor);
  if (viewBackgroundColor) {
    prefs.viewBackgroundColor = viewBackgroundColor;
  }

  if (typeof appState.objectsSnapModeEnabled === 'boolean') {
    prefs.objectsSnapModeEnabled = appState.objectsSnapModeEnabled;
  } else if (typeof fallback?.objectsSnapModeEnabled === 'boolean') {
    prefs.objectsSnapModeEnabled = fallback.objectsSnapModeEnabled;
  }

  if (Object.keys(defaultStyle).length > 0) {
    prefs.defaultStyle = defaultStyle;
  }

  return Object.keys(prefs).length > 0 ? prefs : undefined;
}

function buildInitialAppState(
  editorPrefs?: ExcalidrawEditorPrefs,
  preferredTheme?: PreferredTheme,
  legacyAppState?: any,
): Record<string, unknown> | undefined {
  const safePrefs = extractEditorPrefs(legacyAppState, editorPrefs);
  const appState: Record<string, unknown> = {};

  if (preferredTheme === 'light' || preferredTheme === 'dark') {
    appState.theme = preferredTheme;
  }

  if (safePrefs && 'gridSize' in safePrefs) {
    appState.gridSize = safePrefs.gridSize ?? null;
  }
  if (safePrefs?.viewBackgroundColor) {
    appState.viewBackgroundColor = safePrefs.viewBackgroundColor;
  }
  if (typeof safePrefs?.objectsSnapModeEnabled === 'boolean') {
    appState.objectsSnapModeEnabled = safePrefs.objectsSnapModeEnabled;
  }

  const defaultStyle = safePrefs?.defaultStyle;
  if (defaultStyle) {
    if (defaultStyle.strokeColor) appState.currentItemStrokeColor = defaultStyle.strokeColor;
    if (defaultStyle.backgroundColor) appState.currentItemBackgroundColor = defaultStyle.backgroundColor;
    if (defaultStyle.fillStyle) appState.currentItemFillStyle = defaultStyle.fillStyle;
    if (defaultStyle.strokeWidth !== undefined) appState.currentItemStrokeWidth = defaultStyle.strokeWidth;
    if (defaultStyle.strokeStyle) appState.currentItemStrokeStyle = defaultStyle.strokeStyle;
    if (defaultStyle.roughness !== undefined) appState.currentItemRoughness = defaultStyle.roughness;
    if (defaultStyle.opacity !== undefined) appState.currentItemOpacity = defaultStyle.opacity;
    if (defaultStyle.fontFamily !== undefined) appState.currentItemFontFamily = defaultStyle.fontFamily;
    if (defaultStyle.fontSize !== undefined) appState.currentItemFontSize = defaultStyle.fontSize;
    if (defaultStyle.textAlign) appState.currentItemTextAlign = defaultStyle.textAlign;
    if ('startArrowhead' in defaultStyle) appState.currentItemStartArrowhead = defaultStyle.startArrowhead ?? null;
    if ('endArrowhead' in defaultStyle) appState.currentItemEndArrowhead = defaultStyle.endArrowhead ?? null;
    if ('roundness' in defaultStyle) appState.currentItemRoundness = defaultStyle.roundness;
  }

  return Object.keys(appState).length > 0 ? appState : undefined;
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

function createBlankInitialData(): NonNullable<ExcalidrawInitialData> {
  return blankInitialData() ?? { elements: [], appState: { gridSize: 20 }, files: {} };
}

function normalizeSceneForInitialData(
  initialScene: string | ExcalidrawInitialData | null | undefined,
  editorPrefs?: ExcalidrawEditorPrefs,
): ExcalidrawInitialData {
  if (!initialScene) {
    const blank = createBlankInitialData();
    return {
      ...blank,
      appState: buildInitialAppState(editorPrefs, undefined, blank.appState),
    };
  }

  if (typeof initialScene === 'object') {
    return {
      elements: Array.isArray(initialScene.elements) ? initialScene.elements : [],
      appState: buildInitialAppState(editorPrefs, undefined, (initialScene as any).appState),
      files: initialScene.files ?? {},
    };
  }

  try {
    const parsed = JSON.parse(initialScene);
    return {
      elements: Array.isArray(parsed?.elements) ? parsed.elements : [],
      appState: buildInitialAppState(editorPrefs, undefined, parsed?.appState),
      files: parsed?.files ?? {},
    };
  } catch (error) {
    console.warn('[ExcalidrawBlock] failed to parse scene JSON, fallback to blank scene:', error);
    const blank = createBlankInitialData();
    return {
      ...blank,
      appState: buildInitialAppState(editorPrefs, undefined, blank.appState),
    };
  }
}

function getPreferredTheme(): PreferredTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function withPreferredTheme(
  initialData: ExcalidrawInitialData,
  preferredTheme: PreferredTheme,
  editorPrefs?: ExcalidrawEditorPrefs,
): ExcalidrawInitialData {
  const appState = buildInitialAppState(editorPrefs, preferredTheme, initialData?.appState) ?? {};

  return {
    elements: Array.isArray(initialData?.elements) ? initialData.elements : [],
    appState,
    files: initialData?.files ?? {},
  };
}

const ExcalidrawWrapper = (props: ExcalidrawWrapperProps) => {
  const { initialScene, assetUrl, editorPrefs, sceneMeta, height, onSceneChange, onSceneResolved, readOnly } = props;
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [resolvedInitialScene, setResolvedInitialScene] = React.useState<string | ExcalidrawInitialData | null | undefined>(initialScene);
  const [isAssetLoading, setIsAssetLoading] = React.useState(false);
  const [preferredTheme, setPreferredTheme] = React.useState<PreferredTheme>(() => getPreferredTheme());

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPreferredTheme(event.matches ? 'dark' : 'light');
    };

    onThemeChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onThemeChange);
      return () => mediaQuery.removeEventListener('change', onThemeChange);
    }

    mediaQuery.addListener(onThemeChange);
    return () => mediaQuery.removeListener(onThemeChange);
  }, []);

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
          if (typeof onSceneResolved === 'function') {
            onSceneResolved(sceneText);
          }
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
  }, [assetUrl, initialScene, onSceneResolved]);

  const initialData: ExcalidrawInitialData = React.useMemo(
    () => normalizeSceneForInitialData(resolvedInitialScene, editorPrefs),
    [editorPrefs, resolvedInitialScene],
  );
  const themedInitialData: ExcalidrawInitialData = React.useMemo(
    () => withPreferredTheme(initialData, preferredTheme, editorPrefs),
    [editorPrefs, initialData, preferredTheme],
  );
  const [sceneMountVersion, setSceneMountVersion] = React.useState(0);
  const previousResolvedSceneRef = React.useRef<string | ExcalidrawInitialData | null | undefined>(resolvedInitialScene);

  const latestSceneRef = React.useRef<ExcalidrawInitialData>(themedInitialData);
  const lastPersistedContentSignatureRef = React.useRef<string>(computeSceneContentSignature(themedInitialData, sceneMeta));
  React.useEffect(() => {
    latestSceneRef.current = themedInitialData;
  }, [themedInitialData]);

  React.useEffect(() => {
    const rawScene = typeof resolvedInitialScene === 'string' && resolvedInitialScene.trim()
      ? parseSceneText(resolvedInitialScene)
      : resolvedInitialScene;
    lastPersistedContentSignatureRef.current = computeSceneContentSignature(rawScene, sceneMeta);
  }, [resolvedInitialScene, sceneMeta]);

  React.useEffect(() => {
    if (previousResolvedSceneRef.current === resolvedInitialScene) {
      return;
    }

    previousResolvedSceneRef.current = resolvedInitialScene;
    setSceneMountVersion(prev => prev + 1);
  }, [resolvedInitialScene]);

  const handleChange = React.useCallback(
    (elements: readonly unknown[], appState: unknown, files: Record<string, unknown>) => {
      latestSceneRef.current = {
        elements,
        appState,
        files,
      };

      const nextSceneObject = {
        elements,
        appState,
        files,
      };
      const nextContentSignature = computeSceneContentSignature(nextSceneObject, sceneMeta);
      if (nextContentSignature === lastPersistedContentSignatureRef.current) {
        return;
      }
      lastPersistedContentSignatureRef.current = nextContentSignature;

      onSceneChange(
        JSON.stringify(
          nextSceneObject,
          null,
          2,
        ),
      );
    },
    [onSceneChange, sceneMeta],
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

  const isDarkTheme = preferredTheme === 'dark';
  const chromePalette = isDarkTheme
    ? {
        fullscreenBg: '#0f141c',
        overlayBg: 'rgba(8, 12, 18, 0.72)',
        overlayText: '#d7dee9',
        buttonBg: 'rgba(17, 24, 39, 0.86)',
        buttonText: '#f3f6fb',
        buttonBorder: '1px solid rgba(148, 163, 184, 0.34)',
        buttonShadow: '0 10px 28px rgba(0, 0, 0, 0.28)',
      }
    : {
        fullscreenBg: '#f3f6fb',
        overlayBg: 'rgba(249, 250, 251, 0.84)',
        overlayText: '#475569',
        buttonBg: 'rgba(15, 23, 42, 0.9)',
        buttonText: '#ffffff',
        buttonBorder: '1px solid rgba(255, 255, 255, 0.14)',
        buttonShadow: '0 10px 28px rgba(15, 23, 42, 0.18)',
      };

  const fullscreenWrapperStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2147483647,
    backgroundColor: chromePalette.fullscreenBg,
  };

  const fullscreenButtonStyleBase = {
    zIndex: 2147483647,
    background: chromePalette.buttonBg,
    color: chromePalette.buttonText,
    border: chromePalette.buttonBorder,
    borderRadius: 999,
    padding: '7px 14px',
    cursor: 'pointer',
    fontSize: 12,
    boxShadow: chromePalette.buttonShadow,
    backdropFilter: 'blur(8px)',
    fontWeight: 600,
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
    key: `excalidraw-${sceneMountVersion}`,
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
            background: chromePalette.overlayBg,
            color: chromePalette.overlayText,
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

function stripNoisySceneValue(value: any): any {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(item => stripNoisySceneValue(item));
  }

  const out: Record<string, unknown> = {};
  Object.keys(value).forEach((key) => {
    if (key === 'updated' || key === 'versionNonce' || key === 'status' || key === 'lastRetrieved' || key === 'baseline') {
      return;
    }
    out[key] = stripNoisySceneValue(value[key]);
  });
  return out;
}

function normalizeSceneObject(sceneObj: any, fallbackMeta?: ExcalidrawSceneMeta): Record<string, unknown> {
  const src = sceneObj && typeof sceneObj === 'object' ? sceneObj : {};
  const sceneMeta = extractSceneMeta(src, fallbackMeta);
  return {
    type: sceneMeta.type ?? 'excalidraw',
    version: sceneMeta.version ?? 2,
    source: sceneMeta.source ?? 'qnotes',
    elements: stripNoisySceneValue(Array.isArray(src.elements) ? src.elements : []),
    files: stripNoisySceneValue(src.files && typeof src.files === 'object' ? src.files : {}),
  };
}

function parseSceneText(sceneText: string): any | null {
  try {
    return JSON.parse(sceneText);
  } catch (_) {
    return null;
  }
}

function deriveScenePersistence(rawScene: any, fallbackMeta?: ExcalidrawSceneMeta, fallbackPrefs?: ExcalidrawEditorPrefs): {
  assetScene: Record<string, unknown>;
  sceneMeta: ExcalidrawSceneMeta;
  editorPrefs?: ExcalidrawEditorPrefs;
} {
  const assetScene = normalizeSceneObject(rawScene, fallbackMeta);
  return {
    assetScene,
    sceneMeta: extractSceneMeta(assetScene, fallbackMeta),
    editorPrefs: extractEditorPrefs(rawScene?.appState, fallbackPrefs),
  };
}

function computeSceneContentSignature(rawScene: any, fallbackMeta?: ExcalidrawSceneMeta): string {
  return stableStringify(normalizeSceneObject(rawScene, fallbackMeta));
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256HexFallback(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;

  const view = new DataView(data.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(data.length - 8, high, false);
  view.setUint32(data.length - 4, low, false);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const W = new Uint32Array(64);

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      W[i] = view.getUint32(offset + (i * 4), false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (((W[i - 16] + s0) | 0) + ((W[i - 7] + s1) | 0)) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) | 0) + ch) | 0) + ((K[i] + W[i]) | 0)) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map(value => value.toString(16).padStart(8, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const cryptoApi = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoApi && cryptoApi.subtle && typeof cryptoApi.subtle.digest === 'function') {
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  try {
    console.warn('[QNotes][ExcalidrawTool] crypto.subtle unavailable, using JS SHA-256 fallback');
  } catch (_) {}
  return sha256HexFallback(text);
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

function syncLoadedSceneIntoQNotesBaseline(
  blockId: string,
  sceneText: string,
  fallbackSceneMeta?: ExcalidrawSceneMeta,
  fallbackEditorPrefs?: ExcalidrawEditorPrefs,
  fallbackSceneSha256?: string,
  fallbackAssetUrl?: string,
): void {
  const app = getQNotesApp();
  if (!app || !app.state || !app.state.lastRenderedEditorData || !Array.isArray(app.state.lastRenderedEditorData.blocks)) {
    return;
  }
  if (typeof sceneText !== 'string' || !sceneText.trim()) {
    return;
  }

  const blocks = app.state.lastRenderedEditorData.blocks;
  let targetIndex = -1;

  if (blockId) {
    targetIndex = blocks.findIndex((item: any) => item && String(item.id || '') === blockId);
  }

  if (targetIndex < 0 && (fallbackSceneSha256 || fallbackAssetUrl)) {
    targetIndex = blocks.findIndex((item: any) => {
      if (!item || item.type !== 'excalidraw') return false;
      const data = item.data && typeof item.data === 'object' ? item.data : {};
      const asset = data.asset && typeof data.asset === 'object' ? data.asset : {};
      const itemSceneSha256 = typeof data.sceneSha256 === 'string' ? data.sceneSha256 : '';
      const itemAssetSha256 = typeof asset.sha256 === 'string' ? asset.sha256 : '';
      const itemAssetUrl = typeof asset.url === 'string' ? asset.url : '';

      if (fallbackSceneSha256 && (itemSceneSha256 === fallbackSceneSha256 || itemAssetSha256 === fallbackSceneSha256)) {
        return true;
      }

      if (fallbackAssetUrl && itemAssetUrl === fallbackAssetUrl) {
        return true;
      }

      return false;
    });
  }

  if (targetIndex < 0) {
    const excalidrawIndexes = blocks
      .map((item: any, index: number) => ({ item, index }))
      .filter((entry: { item: any; index: number }) => entry.item && entry.item.type === 'excalidraw');
    if (excalidrawIndexes.length === 1) {
      targetIndex = excalidrawIndexes[0].index;
    }
  }

  if (targetIndex < 0) {
    return;
  }

  const block = blocks[targetIndex];
  if (!block || block.type !== 'excalidraw') {
    return;
  }

  const parsedScene = parseSceneText(sceneText);
  const persistence = parsedScene
    ? deriveScenePersistence(parsedScene, fallbackSceneMeta, fallbackEditorPrefs)
    : {
        assetScene: undefined,
        sceneMeta: extractSceneMeta(null, fallbackSceneMeta),
        editorPrefs: fallbackEditorPrefs,
      };

  block.data = {
    ...(block.data && typeof block.data === 'object' ? block.data : {}),
    scene: sceneText,
    sceneMeta: persistence.sceneMeta,
    editorPrefs: persistence.editorPrefs,
  };

  try {
    if (app.fn && typeof app.fn.computeEditorDataSignatureForDirty === 'function') {
      app.state.lastRenderedEditorSignatureForDirty = app.fn.computeEditorDataSignatureForDirty(app.state.lastRenderedEditorData);
    }
  } catch (_) {}
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
  const fallbackSceneMeta = data.sceneMeta && typeof data.sceneMeta === 'object'
    ? data.sceneMeta
    : (previousData.sceneMeta && typeof previousData.sceneMeta === 'object' ? previousData.sceneMeta : undefined);
  const fallbackEditorPrefs = data.editorPrefs && typeof data.editorPrefs === 'object'
    ? data.editorPrefs
    : (previousData.editorPrefs && typeof previousData.editorPrefs === 'object' ? previousData.editorPrefs : undefined);
  const existingSha = typeof data.sceneSha256 === 'string' && data.sceneSha256
    ? data.sceneSha256
    : (existingAsset && typeof existingAsset.sha256 === 'string' ? existingAsset.sha256 : '');

  if (!sceneText) {
    const persistedSceneMeta = extractSceneMeta(null, fallbackSceneMeta);
    if (existingAsset && typeof existingAsset.url === 'string' && existingAsset.url) {
      return {
        ...block,
        data: {
          ...data,
          scene: '',
          sceneSha256: existingSha || '',
          asset: existingAsset,
          sceneMeta: persistedSceneMeta,
          editorPrefs: fallbackEditorPrefs,
        },
      };
    }
    return block;
  }

  const parsedScene = parseSceneText(sceneText);
  if (!parsedScene) {
    return block;
  }

  const persistence = deriveScenePersistence(parsedScene, fallbackSceneMeta, fallbackEditorPrefs);
  const sceneFileText = `${stableStringify(persistence.assetScene)}\n`;
  const sceneContentSignature = stableStringify(persistence.assetScene);
  const sha256 = await sha256Hex(sceneContentSignature);

  if (existingAsset && typeof existingAsset.url === 'string' && existingAsset.url && existingSha === sha256) {
    return {
      ...block,
      data: {
        ...data,
        scene: '',
        sceneSha256: sha256,
        asset: existingAsset,
        sceneMeta: persistence.sceneMeta,
        editorPrefs: persistence.editorPrefs,
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
      sceneMeta: persistence.sceneMeta,
      editorPrefs: persistence.editorPrefs,
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
      sceneMeta: data?.sceneMeta,
      editorPrefs: data?.editorPrefs,
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
    const onSceneResolved = (scene: string) => {
      this.data.scene = scene;
      const blockId = this.block && (this.block as any).id ? String((this.block as any).id) : '';
      syncLoadedSceneIntoQNotesBaseline(
        blockId,
        scene,
        this.data.sceneMeta,
        this.data.editorPrefs,
        this.data.sceneSha256,
        this.data.asset?.url,
      );
    };

    this.reactRoot = createRoot(canvasHost);
    this.reactRoot.render(
      React.createElement(ExcalidrawWrapper, {
        initialScene: this.data.scene,
        assetUrl: this.data.asset?.url,
        editorPrefs: this.data.editorPrefs,
        sceneMeta: this.data.sceneMeta,
        height: this.height,
        onSceneChange,
        onSceneResolved,
        readOnly: this.readOnly,
      }),
    );

    return container;
  }

  public save(): ExcalidrawData {
    const parsedScene = typeof this.data.scene === 'string' && this.data.scene.trim()
      ? parseSceneText(this.data.scene)
      : null;
    const persistence = parsedScene
      ? deriveScenePersistence(parsedScene, this.data.sceneMeta, this.data.editorPrefs)
      : {
          assetScene: undefined,
          sceneMeta: extractSceneMeta(null, this.data.sceneMeta),
          editorPrefs: this.data.editorPrefs,
        };

    return {
      scene: this.data.scene ?? '',
      link: this.data.link,
      asset: this.data.asset,
      sceneSha256: this.data.sceneSha256,
      sceneMeta: persistence.sceneMeta,
      editorPrefs: persistence.editorPrefs,
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
      sceneMeta: false,
      editorPrefs: false,
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

    if ((data as any).sceneMeta && typeof (data as any).sceneMeta === 'object') {
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
