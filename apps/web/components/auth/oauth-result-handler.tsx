"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { consumeOAuthResult, getOAuthUserDisplayName } from "@/lib/oauth";
import { addToast } from "@/lib/toast";

/**
 * 处理 OAuth 全页跳转回跳后写入 sessionStorage 的结果。
 * Popup 场景由发起页 postMessage 监听器处理，此处仅兜底无 opener 路径。
 */
export function OAuthResultHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const result = consumeOAuthResult();
    if (!result) return;
    handled.current = true;

    if (result.type === "oauth_success") {
      addToast(`登录成功，欢迎回来 ${getOAuthUserDisplayName(result.user)}！`, "success");
      router.refresh();
      return;
    }
    if (result.type === "oauth_bind_success") {
      addToast("绑定成功", "success");
      router.refresh();
      return;
    }
    if (result.type === "oauth_error") {
      addToast(result.message ?? "登录失败，请稍后重试", "error");
    }
  }, [router]);

  return null;
}
