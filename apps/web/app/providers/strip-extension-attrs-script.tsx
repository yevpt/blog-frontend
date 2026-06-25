"use client";

import { useSyncExternalStore } from "react";
import { STRIP_EXTENSION_ATTRS_SCRIPT } from "@/lib/strip-extension-attrs";

const noopSubscribe = () => () => undefined;

/**
 * 仅在 SSR 与 hydration 阶段输出内联 script，避免 React 19 在客户端重渲染时报
 * "Encountered a script tag while rendering React component"。
 * 脚本在首屏解析时执行一次，后续客户端提交返回 null 不影响已注册的 MutationObserver。
 */
function useEmitInlineScript() {
  return useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
}

export function StripExtensionAttrsScript() {
  if (!useEmitInlineScript()) return null;

  return (
    <script
      id="strip-extension-attrs"
      dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_SCRIPT }}
    />
  );
}
