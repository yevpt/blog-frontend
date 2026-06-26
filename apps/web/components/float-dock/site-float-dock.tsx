"use client";

import { cn } from "@repo/ui";
import { useMediaQuery } from "@/hooks/use-media-query";
import { FloatDockScrollTopOrb } from "./float-dock-scroll-top";
import { floatDockStackClass } from "./float-dock-styles";
import { useFloatDockContext } from "./float-dock-provider";
import { useFloatDockPosition } from "./use-float-dock-position";
import { useFloatScrollTopVisible } from "./use-float-scroll-top-visible";

const MD_MEDIA_QUERY = "(min-width: 768px)";

/** 全局右下角浮动 Dock：回顶 + 页面注册的自定义 orb */
export function SiteFloatDock() {
  const { config } = useFloatDockContext();
  const isMdViewport = useMediaQuery(MD_MEDIA_QUERY);
  const floatPosition = useFloatDockPosition(config.position);
  const showScrollTop = useFloatScrollTopVisible();

  if (!config.enabled) return null;

  const hasDesktopItems = config.items.length > 0 || showScrollTop;

  return (
    <div
      className={cn(
        "fixed z-50",
        !isMdViewport && "bottom-5 right-4",
        isMdViewport && floatPosition.left === null && "bottom-6 right-5 md:right-6",
      )}
      style={
        isMdViewport && floatPosition.left !== null
          ? { left: floatPosition.left, bottom: floatPosition.bottom }
          : undefined
      }
    >
      {isMdViewport && hasDesktopItems ? (
        <div className={floatDockStackClass} data-testid="float-actions-dock">
          {config.items.map((item) => (
            <div key={item.id}>{item.render()}</div>
          ))}
          <FloatDockScrollTopOrb visible={showScrollTop} />
        </div>
      ) : null}

      {!isMdViewport ? (
        <div
          className={cn(
            floatDockStackClass,
            config.items.length === 0 && !showScrollTop && "pointer-events-none opacity-0",
          )}
        >
          {config.items.map((item) => (
            <div key={item.id}>{item.render()}</div>
          ))}
          <FloatDockScrollTopOrb visible={showScrollTop} />
        </div>
      ) : null}
    </div>
  );
}
