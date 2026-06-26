import type { ReactNode } from "react";
import type { UNSTABLE_ToastQueue } from "react-aria-components/Toast";
import type { QueuedToast } from "react-stately/useToastState";

/** Toast 语义类型。 */
export type ToastType = "success" | "error" | "info";

/** Toast 弹出位置，默认 "bottom-right"。 */
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** 单条 toast 的内容。 */
export interface ToastContent {
  message: string;
  type?: ToastType;
}

/** 传给 `renderToast` 的操作辅助函数。 */
export interface ToastRenderHelpers {
  /** 直接调用 queue.close(key) 关闭这条 toast，不依赖 slot="close" 的隐式绑定。 */
  close: () => void;
}

/** `ToastRegion` 的 props。 */
export interface ToastRegionProps<T = ToastContent> {
  queue: UNSTABLE_ToastQueue<T>;
  className?: string;
  /** 弹出位置，默认 "bottom-right"（与改版前行为一致）。 */
  position?: ToastPosition;
  /** 单条 toast 容器的宽度/对齐策略覆盖；不传时用简单消息 toast 的默认值。 */
  itemClassName?: string;
  /** 自定义单条 toast 的内部内容；不传时按内置 ToastContent 渲染（图标芯片 + 文字 + 关闭按钮）。 */
  renderToast?: (toast: QueuedToast<T>, helpers: ToastRenderHelpers) => ReactNode;
}
