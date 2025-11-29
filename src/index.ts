import './index.css';
import { IconQuote } from '@codexteam/icons';
import { make } from '@editorjs/dom';
import type { API, BlockAPI, BlockTool, ToolConfig, SanitizerConfig } from '@editorjs/editorjs';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Excalidraw } from '@excalidraw/excalidraw';

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
 * CSS 类名集合
 */
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
  height: number;
  onSceneChange: (scene: string) => void;
  readOnly: boolean;
}

/**
 * 轻量包装一层 React 组件，用于在 Editor.js 工具中内嵌 Excalidraw。
 * 这里不直接依赖任何远端服务（不访问 Excalidraw.com），
 * 所有逻辑均基于本地引入的 @excalidraw/excalidraw 包。
 */
const ExcalidrawWrapper = (props: ExcalidrawWrapperProps) => {
  const { initialScene, height, onSceneChange, readOnly } = props;
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const initialData: ExcalidrawInitialData = React.useMemo(() => {
    // 调试日志：查看加载时拿到的原始 scene 类型与前几百个字符
    // 方便确认第二次「加载内容」时是否真的拿到了保存好的场景 JSON
    // eslint-disable-next-line no-console
    console.log('[ExcalidrawWrapper] compute initialData', {
      typeofInitialScene: typeof initialScene,
      hasInitialScene: !!initialScene,
      preview:
        typeof initialScene === 'string'
          ? (initialScene as string).slice(0, 200)
          : null,
    });

    if (!initialScene) {
      // 空场景：提供一个最小合法结构（只包含 elements/files）
      // 默认开启网格：通过在 appState 中设置一个正数的 gridSize，让 Excalidraw 从一开始就显示网格。
      // 其余 appState 字段交给 Excalidraw 自己初始化，避免复用上一次的 UI 状态引发内部异常。
      return {
        elements: [],
        appState: {
          // Excalidraw 内部只要 gridSize 不是 null，就会认为「网格开启」；
          // 数值代表网格间距，这里使用一个常见的 20 像素间距。
          gridSize: 20,
        },
        files: {},
      };
    }

    // 兼容两种形式：
    // 1) scene 为已经解析好的对象（elements/appState/files）
    // 2) scene 为 JSON 字符串
    //
    // 为了让「再次打开时」的体验更自然，这里会在安全范围内恢复一部分视图相关的 appState
    //（例如：缩放、滚动位置、主题），但仍然避免复用所有 UI 状态。
    const buildSafeAppState = (rawAppState: any): any | undefined => {
      if (!rawAppState || typeof rawAppState !== 'object') {
        return undefined;
      }

      const safeAppState: any = {};

      // 主题：仅允许 dark / light，避免传入无效值
      const rawTheme = rawAppState.theme;
      if (rawTheme === 'dark' || rawTheme === 'light') {
        safeAppState.theme = rawTheme;
      }

      // 视图位置：scrollX / scrollY
      if (typeof rawAppState.scrollX === 'number' && Number.isFinite(rawAppState.scrollX)) {
        safeAppState.scrollX = rawAppState.scrollX;
      }
      if (typeof rawAppState.scrollY === 'number' && Number.isFinite(rawAppState.scrollY)) {
        safeAppState.scrollY = rawAppState.scrollY;
      }

      // 缩放：Excalidraw 使用 { value: number } 结构
      const rawZoom = rawAppState.zoom;
      if (rawZoom && typeof rawZoom.value === 'number' && Number.isFinite(rawZoom.value)) {
        safeAppState.zoom = { value: rawZoom.value };
      }

      // 网格：只在数值合法时恢复，null 明确表示「关闭网格」
      if (
        typeof rawAppState.gridSize === 'number' &&
        Number.isFinite(rawAppState.gridSize) &&
        rawAppState.gridSize > 0
      ) {
        safeAppState.gridSize = rawAppState.gridSize;
      } else if (rawAppState.gridSize === null) {
        safeAppState.gridSize = null;
      }

      // 如需后续逐步恢复更多视图相关字段（例如 viewBackgroundColor），可在此按白名单追加。

      return Object.keys(safeAppState).length > 0 ? safeAppState : undefined;
    };

    if (typeof initialScene === 'object') {
      const obj = initialScene as ExcalidrawInitialData;
      const rawAppState = (obj as any)?.appState;
      const safeAppState = buildSafeAppState(rawAppState);

      return {
        // 仅保留元素数据 + 安全子集的 appState（缩放、位置、主题等），
        // 避免复用完整 appState 触发 Excalidraw 内部 bug，但又能尽量还原视图状态。
        elements: Array.isArray(obj?.elements) ? obj.elements : [],
        appState: safeAppState,
        files: obj?.files ?? {},
      };
    }

    if (typeof initialScene === 'string') {
      try {
        const parsed = JSON.parse(initialScene);
        // eslint-disable-next-line no-console
        console.log('[ExcalidrawWrapper] parsed scene OK');
        const rawAppState = (parsed as any)?.appState;
        const safeAppState = buildSafeAppState(rawAppState);

        return {
          // 同上：恢复元素 + 安全子集的 appState，让再次打开时视图保持在用户离开时的位置
          elements: Array.isArray(parsed?.elements) ? parsed.elements : [],
          appState: safeAppState,
          files: parsed?.files ?? {},
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[ExcalidrawBlock] 无法解析已保存的 scene JSON，将忽略：', e);
      }
    }

    return undefined;
  }, [initialScene]);

  /**
   * 由于在「页面内全屏」与普通模式之间切换时，我们会通过 Portal
   * 导致内部的 Excalidraw 组件发生卸载 / 重新挂载。
   *
   * 如果仅依赖最初的 initialData，那么重新挂载时会丢失当前会话中新绘制的内容。
   * 因此这里通过一个 ref 保存「最近一次 onChange 的完整场景」，在重新挂载时
   * 作为 initialData 传给 Excalidraw，保证切换全屏前后的内容一致。
   */
  const latestSceneRef = React.useRef<ExcalidrawInitialData>(initialData);

  // 调试：观察组件挂载 / 卸载时机，确认 Editor.js 在 render(data) 时
  // 是否重新创建并渲染了 ExcalidrawWrapper
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[ExcalidrawWrapper] mount', {
      typeofInitialScene: typeof initialScene,
      hasInitialScene: !!initialScene,
    });

    return () => {
      // eslint-disable-next-line no-console
      console.log('[ExcalidrawWrapper] unmount');
    };
  }, [initialScene]);



  const handleChange = React.useCallback(
    (elements: readonly unknown[], appState: unknown, files: Record<string, unknown>) => {
      // 先缓存当前场景到 ref，用于后续可能的重新挂载（例如全屏切换）
      latestSceneRef.current = {
        elements,
        appState,
        files,
      };

      // 直接复用 Excalidraw 官方推荐的数据结构
      const scene = JSON.stringify(
        {
          elements,
          appState,
          files,
        },
        null,
        2,
      );

      onSceneChange(scene);
    },
    [onSceneChange],
  );

  const toggleFullscreen = React.useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // 只读模式下，Excalidraw 本身不提供完全禁用编辑的官方属性，这里仍然渲染画布，
  // 但由上层在只读模式下避免调用 save/更改内容。
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
    zIndex: 2147483647, // 确保盖住几乎所有应用内元素（包括 QNotes 顶部栏）
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
    // initialData 只在组件生命周期的首次挂载时生效；
    // 但在我们通过 Portal 造成的卸载 / 重新挂载场景下，需要优先使用最近一次的场景快照，
    // 避免在全屏切换时回到「旧的 initialScene」而丢失未保存的绘制内容。
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

  // 全屏模式：使用 Portal 把画布挂到 document.body 之下，避免被 QNotes 的顶部栏遮挡
  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      React.createElement(
        'div',
        { style: fullscreenWrapperStyle },
        [fullscreenToggleButton, excalidrawElement],
      ),
      document.body,
    );
  }

  // 普通模式：内联在 Editor.js Block 中渲染
  return React.createElement(
    'div',
    { style: inlineWrapperStyle },
    [fullscreenToggleButton, excalidrawElement],
  );
};

/**
 * Editor.js Excalidraw BlockTool
 *
 * 直接在工具内部内嵌 Excalidraw 画布，不再跳转到 Excalidraw.com。
 * 如需自托管服务，只需在外部按官方文档部署 Excalidraw，并在解析 scene 时走自己的后端流程。
 */
export default class ExcalidrawBlock implements BlockTool {
  private api: API;
  private readOnly: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private block: BlockAPI;

  private data: ExcalidrawData;
  private css: ExcalidrawCSS;
  private height: number;

  private reactRoot: any;

  constructor({ data, config, api, readOnly, block }: ExcalidrawParams) {
    this.api = api;
    this.readOnly = readOnly;
    this.block = block;

    const rawScene = data?.scene;
    let normalizedScene = '';

    // 兼容外部在持久化逻辑中将 scene 解析为对象的情况
    if (typeof rawScene === 'string') {
      normalizedScene = rawScene;
    } else if (rawScene && typeof rawScene === 'object') {
      try {
        normalizedScene = JSON.stringify(rawScene);
      } catch (e) {
        console.warn('[ExcalidrawBlock] 无法序列化传入的 scene 对象，将使用空场景：', e);
      }
    }

    this.data = {
      scene: normalizedScene,
      link: data?.link ?? '',
    };

    // 默认高度由 480 提升到 960，如果外部未配置 height，则使用更高的画布视图
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
        height: this.height,
        onSceneChange,
        readOnly: this.readOnly,
      }),
    );

    return container;
  }

  public save(): ExcalidrawData {
    // 场景数据由 onSceneChange 持续更新，直接返回内部缓存即可
    return {
      scene: this.data.scene ?? '',
      link: this.data.link,
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
    } as unknown as SanitizerConfig;
  }

  public validate(data: ExcalidrawData): boolean {
    if (!data) {
      return false;
    }

    // 字符串和对象两种形式都认为是“有数据”，具体解析错误在渲染阶段兜底
    if (typeof (data as any).scene === 'string') {
      return true;
    }

    if (typeof (data as any).scene === 'object' && (data as any).scene !== null) {
      return true;
    }

    return false;
  }

  /**
   * Editor.js 在销毁 Block 或重新渲染数据时会调用 destroy，
   * 这里负责卸载 React Root，避免重复挂载或内存泄漏。
   */
  public destroy(): void {
    if (this.reactRoot && typeof this.reactRoot.unmount === 'function') {
      this.reactRoot.unmount();
    }

    this.reactRoot = null;
  }
}

