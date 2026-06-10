"use client";

import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
  type UNSTABLE_ToastQueue,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { cn } from "../lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastContent {
  message: string;
  type?: ToastType;
}

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

const typeStyles: Record<ToastType, string> = {
  success: "bg-emerald-500 border-emerald-600 text-white",
  error: "bg-destructive/10 border-destructive/25 text-destructive",
  info: "bg-primary/10 border-primary/25 text-primary",
};

interface ToastRegionProps {
  queue: UNSTABLE_ToastQueue<ToastContent>;
  className?: string;
}

export function ToastRegion({ queue, className }: ToastRegionProps) {
  return (
    <AriaToastRegion
      queue={queue}
      className={cn("fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 outline-none", className)}
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={cn(
            // [will-change:transform]：给每条 toast 独立 GPU 合成层，
            // 防止 hover 触发的 opacity 过渡污染 nav backdrop-filter 的合成上下文
            "flex w-[320px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg [will-change:transform]",
            typeStyles[toast.content.type ?? "info"],
          )}
        >
          <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed">
            {toast.content.message}
          </AriaToastContent>
          <Button
            slot="close"
            aria-label="关闭通知"
            className="flex-shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none"
          >
            <SvgIcon name="close" size={12} />
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
