"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { UserResp } from "@repo/api";
import { OAUTH_RESULT_KEY, consumeOAuthReturnUrl, type OAuthMessage } from "@/lib/oauth";

interface OAuthCallbackResult {
  code?: number;
  message?: string;
  data?: {
    action?: "login" | "bind";
    user?: UserResp;
  };
}

/**
 * OAuth 回调接收页（Popup 窗口内运行）
 *
 * 流程：
 *   GitHub 授权完成 → 重定向至此页面 → 调用 /api/oauth/:source/callback 换取 token
 *   → 若在 popup 中：postMessage 给父窗口后关闭自身
 *   → 若直接打开：存 sessionStorage 后跳转首页
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
     * 统一通知父窗口（或跳转首页）。
     * - Popup 场景：postMessage 后关闭自身
     * - 直接打开场景：存 sessionStorage 后跳转 /（供首页读取并展示 toast）
     */
    function notify(msg: OAuthMessage) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(msg, window.location.origin);
        window.close();
        return;
      }
      // 移动端跨域授权后 opener 常失效；硬跳转确保 layout 重新读取 Cookie 登录态
      sessionStorage.setItem(OAUTH_RESULT_KEY, JSON.stringify(msg));
      window.location.replace(consumeOAuthReturnUrl());
    }
  }, [params.source, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">正在处理登录，请稍候…</p>
    </div>
  );
}
