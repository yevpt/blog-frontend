"use client";

import type { ReactElement } from "react";
import {
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components/Toast";
import { Button } from "react-aria-components";
import { SvgIcon, type IconName } from "@repo/icons";
import { cn } from "../lib/utils";
import type { ToastContent, ToastPosition, ToastRegionProps, ToastType } from "./types";

// 导出 ToastQueue 类，供 apps/* 无需直接依赖 react-aria-components
export { UNSTABLE_ToastQueue as ToastQueue } from "react-aria-components/Toast";

const typeStyles: Record<ToastType, { icon: IconName; chipClass: string }> = {
  success: { icon: "check", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  error: { icon: "alert-circle", chipClass: "bg-destructive/12 text-destructive" },
  info: { icon: "info-circle", chipClass: "bg-primary/12 text-primary" },
};

// 各位置对应的锚点 + 堆叠对齐方向（左侧贴左对齐，右侧贴右对齐，居中两侧都收紧）
const positionStyles: Record<ToastPosition, string> = {
  "top-left": "left-4 top-4 items-start",
  "top-center": "left-1/2 top-4 -translate-x-1/2 items-center",
  "top-right": "right-4 top-4 items-end",
  "bottom-left": "left-4 bottom-4 items-start",
  "bottom-center": "left-1/2 bottom-4 -translate-x-1/2 items-center",
  "bottom-right": "right-4 bottom-4 items-end",
};

/** 共享的毛玻璃外观：圆角/边框/底色/阴影/blur/入场动画；不含宽度与对齐，由调用方决定。 */
export const toastChromeClassName =
  "rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl [will-change:transform] animate-notification-enter";

// 简单消息 toast 的默认宽度/对齐策略（2026-06-26 改版的值，原样保留）
const DEFAULT_ITEM_CLASS = "w-fit min-w-[15rem] max-w-[min(22rem,calc(100vw-2rem))] items-center";

function defaultRenderToastContent(content: ToastContent) {
  const { icon, chipClass } = typeStyles[content.type ?? "info"];
  return (
    <>
      <span
        className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", chipClass)}
      >
        <SvgIcon name={icon} size={15} />
      </span>
      <AriaToastContent className="flex-1 text-[13.5px] font-medium leading-relaxed text-foreground">
        {content.message}
      </AriaToastContent>
      <Button
        slot="close"
        aria-label="关闭通知"
        className="flex size-7 shrink-0 items-center justify-center self-start rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SvgIcon name="close" size={12} />
      </Button>
    </>
  );
}

interface ToastRegionComponent {
  (props: ToastRegionProps<ToastContent>): ReactElement;
  <T>(
    props: ToastRegionProps<T> & Required<Pick<ToastRegionProps<T>, "renderToast">>,
  ): ReactElement;
}

function ToastRegionImpl<T>({
  queue,
  className,
  position = "bottom-right",
  itemClassName,
  renderToast,
}: ToastRegionProps<T>): ReactElement {
  return (
    <AriaToastRegion
      queue={queue}
      className={cn(
        "fixed z-[9999] flex flex-col gap-2 outline-none",
        positionStyles[position],
        className,
      )}
    >
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={cn(toastChromeClassName, "flex gap-3", itemClassName ?? DEFAULT_ITEM_CLASS)}
        >
          {renderToast
            ? renderToast(toast, { close: () => queue.close(toast.key) })
            : defaultRenderToastContent(toast.content as ToastContent)}
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}

export const ToastRegion = ToastRegionImpl as ToastRegionComponent;
