"use client";

import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon, type IconName } from "@repo/icons";
import { cn } from "../lib/utils";
import type { ToastRegionProps, ToastType } from "./types";

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

const typeStyles: Record<ToastType, { icon: IconName; chipClass: string }> = {
  success: { icon: "check", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error: { icon: "alert-circle", chipClass: "bg-destructive/12 text-destructive" },
  info: { icon: "info-circle", chipClass: "bg-primary/12 text-primary" },
};

export function ToastRegion({ queue, className }: ToastRegionProps) {
  return (
    <AriaToastRegion
      queue={queue}
      className={cn(
        "fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 outline-none",
        className,
      )}
    >
      {({ toast }) => {
        const { icon, chipClass } = typeStyles[toast.content.type ?? "info"];

        return (
          <AriaToast
            toast={toast}
            className={cn(
              // [will-change:transform]：给每条 toast 独立 GPU 合成层，
              // 防止 hover 触发的 opacity 过渡污染 nav backdrop-filter 的合成上下文
              "flex w-fit min-w-[15rem] max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                chipClass,
              )}
            >
              <SvgIcon name={icon} size={15} />
            </span>
            <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed text-foreground">
              {toast.content.message}
            </AriaToastContent>
            <Button
              slot="close"
              aria-label="关闭通知"
              className="self-start flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SvgIcon name="close" size={12} />
            </Button>
          </AriaToast>
        );
      }}
    </AriaToastRegion>
  );
}
