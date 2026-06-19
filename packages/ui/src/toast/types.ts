import type { UNSTABLE_ToastQueue } from "react-aria-components/Toast";

/** Toast 语义类型。 */
export type ToastType = "success" | "error" | "info";

/** 单条 toast 的内容。 */
export interface ToastContent {
  message: string;
  type?: ToastType;
}

/** `ToastRegion` 的 props。 */
export interface ToastRegionProps {
  queue: UNSTABLE_ToastQueue<ToastContent>;
  className?: string;
}
