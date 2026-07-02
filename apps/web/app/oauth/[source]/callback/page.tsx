"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { UserResp } from "@repo/api";
import {
  OAUTH_BROADCAST_CHANNEL,
  OAUTH_RESULT_KEY,
  consumeOAuthReturnUrl,
  type OAuthMessage,
} from "@/lib/oauth";

interface OAuthCallbackResult {
  code?: number;
  message?: string;
  data?: {
    action?: "login" | "bind";
    user?: UserResp;
  };
}

/**
 * OAuth 回调接收页（popup 窗口内运行，或移动端整页跳转时在当前标签页运行）
 *
 * 流程：
 *   第三方授权完成 → 重定向至此页面 → 调用 /api/oauth/:source/callback 换取 token
 *   → BroadcastChannel 广播结果给发起页 → 尝试 window.close()
 *   → 若确实是 popup：成功关闭，发起页收到广播即可
 *   → 若不是 popup（如移动端整页跳转）：close() 被浏览器忽略，300ms 后走 sessionStorage
 *     + 硬跳转兜底，回到发起页
 *
 * Next.js 15 中 useSearchParams() 必须在 Suspense 边界内使用，
 * 因此将实际逻辑拆到 OAuthCallbackContent，用 Suspense 包裹。
 */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground text-sm">正在处理登录，请稍候…</p>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}

function OAuthCallbackContent() {
  const params = useParams<{ source: string }>();
  const searchParams = useSearchParams();

  // 防止 React StrictMode 下 useEffect 双执行导致重复处理
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      notify({ type: "oauth_error", message: "缺少 OAuth 回调参数" });
      return;
    }

    const source = params.source;

    fetch(
      `/api/oauth/${source}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    )
      .then((r) => r.json())
      .then((data: OAuthCallbackResult) => {
        if (data.code !== 0) {
          notify({ type: "oauth_error", message: data.message ?? "登录失败，请稍后重试" });
        } else if (data.data?.action === "bind") {
          // 绑定与登录共用 popup 机制：通知发起页（个人详情页）绑定成功后自行刷新
          notify({ type: "oauth_bind_success", source });
        } else {
          const user = data.data?.user;
          if (!user) {
            notify({ type: "oauth_error", message: "登录数据异常，请稍后重试" });
            return;
          }
          notify({ type: "oauth_success", user });
        }
      })
      .catch(() => {
        notify({ type: "oauth_error", message: "网络异常，请稍后重试" });
      });

    /**
     * 统一通知发起页（或跳转回发起页）。
     *
     * - BroadcastChannel 广播结果作为主通道——同源即可送达，不依赖 window.opener。
     * - opener 若恰好存活，postMessage 作为加速路径（双通道，谁先到都行；
     *   接收方必须校验消息本身的结构，不能只信 origin——见 openOAuthPopup 里
     *   isOAuthMessage 的说明，同源的浏览器扩展 content script 也会 postMessage）。
     * - window.close() 的成功与否本身就是"我是不是 popup"的判据：只有真正由
     *   window.open() 打开的窗口才会被浏览器允许关闭；直接导航打开的标签页（如移动端
     *   整页跳转）调用 close() 会被静默忽略，页面仍然存活。若 300ms 后页面还活着，
     *   说明刚才不是 popup，走整页跳转兜底。
     */
    function notify(msg: OAuthMessage) {
      const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
      channel.postMessage(msg);
      channel.close();

      // opener 若恰好存活，postMessage 作为加速路径；失败也无妨，BroadcastChannel 兜底
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(msg, window.location.origin);
        } catch {
          // opener 已跨域隔离或不可用，忽略
        }
      }

      window.close();

      setTimeout(() => {
        // 走到这说明 window.close() 没有真正关闭当前窗口（不是 popup），
        // 移动端跨域授权后硬跳转确保 layout 重新读取 Cookie 登录态
        sessionStorage.setItem(OAUTH_RESULT_KEY, JSON.stringify(msg));
        window.location.replace(consumeOAuthReturnUrl());
      }, 300);
    }
  }, [params.source, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">正在处理登录，请稍候…</p>
    </div>
  );
}
