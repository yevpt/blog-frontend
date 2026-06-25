"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createBrowserTracker } from "./browser";
import type { Tracker } from "./tracker";
import type { TrackerOptions } from "./types";

// 在 web 前台根布局挂载一次，把 App Router 导航绑定到 tracker。返回 null，无 DOM 输出。
export function AnalyticsTracker({ options }: { options?: TrackerOptions }): null {
  const pathname = usePathname();
  const trackerRef = useRef<Tracker | null>(null);

  useEffect(() => {
    const tracker = createBrowserTracker(options);
    trackerRef.current = tracker;
    tracker.start();
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
    // 仅挂载/卸载时建立与销毁，options 变化不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pathname) trackerRef.current?.trackPageView(pathname);
  }, [pathname]);

  return null;
}
