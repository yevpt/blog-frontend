"use client";

import { memo } from "react";
import { cn } from "@repo/ui";
import { FloatDockScrollTopOrb } from "./float-dock-scroll-top";
import { floatDockStackClass } from "./float-dock-styles";
import { useFloatDockContext } from "./float-dock-provider";
import { useFloatDockPosition } from "./use-float-dock-position";
import { useFloatScrollTopVisible } from "./use-float-scroll-top-visible";
import type { FloatDockItem } from "./types";

/** 与回顶钮可见性解耦，避免滚动阈值切换时连带重渲染已注册 orb */
const FloatDockRegisteredItems = memo(function FloatDockRegisteredItems({
  items,
}: {
  items: FloatDockItem[];
}) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id}>{item.render()}</div>
      ))}
    </>
  );
});

/** 全局右下角浮动 Dock：回顶 + 页面注册的自定义 orb。
 *  空态外层 opacity-0 消除 CLS；内容就绪后按页面列计算 left 对齐。 */
export function SiteFloatDock() {
  const { config } = useFloatDockContext();
  const floatPosition = useFloatDockPosition(config.position);
  const showScrollTop = useFloatScrollTopVisible();

  if (!config.enabled) return null;

  const isEmpty = config.items.length === 0 && !showScrollTop;

  return (
    <div
      className={cn("fixed z-50 bottom-5 right-4 md:bottom-6 md:right-5", isEmpty && "opacity-0")}
      style={
        floatPosition.left !== null
          ? { left: floatPosition.left, bottom: floatPosition.bottom, right: "auto" }
          : undefined
      }
    >
      <div
        className={cn(floatDockStackClass, isEmpty && "pointer-events-none")}
        data-testid="float-actions-dock"
      >
        <FloatDockRegisteredItems items={config.items} />
        <FloatDockScrollTopOrb visible={showScrollTop} />
      </div>
    </div>
  );
}
