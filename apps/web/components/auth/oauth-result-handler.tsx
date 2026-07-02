"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { consumeOAuthResult, consumeOAuthReturnScroll, getOAuthUserDisplayName } from "@/lib/oauth";
import { addToast } from "@/lib/toast";

/**
 * 处理 OAuth 全页跳转回跳后写入 sessionStorage 的结果。
 * 登录统一走全页跳转（不再用 popup + window.opener，实测该机制在部分浏览器/
 * 已登录第三方账号的场景下会被 Cross-Origin-Opener-Policy 隔离导致彻底失联）。
 * 绑定流程（个人详情页）仍用 popup，由发起页自己的 postMessage 监听器处理，此处只管登录。
 */
export function OAuthResultHandler() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const result = consumeOAuthResult();
    if (!result) return;
    handled.current = true;

    // 整页跳转会把阅读位置弹回顶部，回跳后恢复成跳转前的滚动位置
    const scrollY = consumeOAuthReturnScroll();
    if (scrollY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }

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
