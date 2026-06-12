"use client";

import { useState, useEffect, useRef } from "react";
import { SvgIcon, type IconName } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import type { OAuthMessage } from "@/lib/oauth";
import { addToast } from "@/lib/toast";

interface OAuthProvider {
  id: string;
  label: string;
  icon: IconName;
  color: string | null;
  textClass?: string;
}

const PRIMARY_PROVIDERS: OAuthProvider[] = [
  { id: "wechat", label: "微信", icon: "wechat", color: "#07C160" },
  { id: "qq", label: "QQ", icon: "qq", color: "#1299EF" },
  { id: "github", label: "GitHub", icon: "github", color: null, textClass: "text-foreground" },
  { id: "google", label: "Google", icon: "google", color: null },
];

const EXTRA_PROVIDERS: OAuthProvider[] = [
  { id: "weibo", label: "微博", icon: "weibo", color: "#DF2029" },
  { id: "gitee", label: "Gitee", icon: "gitee", color: "#C71D23" },
  { id: "baidu", label: "百度", icon: "baidu", color: "#2932E1" },
];

/** 当前后端已启用的 OAuth 平台，其他平台按钮暂不可用 */
const ENABLED_PROVIDERS = new Set(["github"]);

interface OAuthGridProps {
  className?: string;
  /**
   * OAuth 登录成功的回调，传入已认证的用户信息。
   * 由父组件（LoginView）传入，成功后关闭弹窗并显示欢迎 toast。
   */
  onSuccess?: (user: UserResp) => void;
}

export function OAuthGrid({ className, onSuccess }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

  // 保存当前活跃的 postMessage 监听器引用，以便组件卸载时清理
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // 组件卸载时移除尚未触发的监听器，防止内存泄漏
  useEffect(() => {
    return () => {
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }
    };
  }, []);

  /**
   * 处理 GitHub OAuth 登录。
   *
   * 详细流程：
   *   1. 调用 /api/oauth/github/authorize 获取 GitHub 授权地址
   *   2. window.open 弹出 popup 窗口跳转至授权地址
   *   3. 用户在 GitHub 完成授权后，GitHub 重定向至我们的回调页
   *   4. 回调页调用 /api/oauth/github/callback 换取 token 并写入 Cookie
   *   5. 回调页通过 postMessage 把结果传回此父窗口
   *   6. 收到 oauth_success → 调用 onSuccess；oauth_error → 显示错误 toast
   */
  async function handleGitHubLogin() {
    try {
      // redirect_uri：GitHub 授权完成后重定向至此前端路径（popup 内）
      const redirectUri = `${window.location.origin}/oauth/github/callback`;

      const res = await fetch(
        `/api/oauth/github/authorize?action=login&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const data = await res.json();

      if (data.code !== 0 || !data.data?.authorize_url) {
        addToast(data.message ?? "获取授权地址失败，请稍后重试", "error");
        return;
      }

      // 弹出固定尺寸的 popup 窗口（部分浏览器会在非用户手势时拦截）
      const popup = window.open(
        data.data.authorize_url,
        "oauth_popup",
        "width=600,height=700,left=200,top=100",
      );

      if (!popup) {
        // 浏览器拦截了 popup（通常是用户未手动触发点击）
        addToast("浏览器阻止了弹出窗口，请允许后重试", "error");
        return;
      }

      // 清理上一个未完成的监听器（理论上不会有，但做好防御）
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }

      // 监听 popup 回调页发来的结果消息
      function handleMessage(event: MessageEvent<OAuthMessage>) {
        // 严格校验 origin，防止其他来源的 postMessage 注入
        if (event.origin !== window.location.origin) return;

        const msg = event.data;

        if (msg.type === "oauth_success") {
          onSuccess?.(msg.user);
        } else if (msg.type === "oauth_error") {
          addToast(msg.message ?? "登录失败，请稍后重试", "error");
        }

        // 消息处理完毕，移除监听器
        window.removeEventListener("message", handleMessage);
        messageHandlerRef.current = null;
      }

      messageHandlerRef.current = handleMessage;
      window.addEventListener("message", handleMessage);
    } catch {
      addToast("网络异常，请稍后重试", "error");
    }
  }

  const providers = expanded ? [...PRIMARY_PROVIDERS, ...EXTRA_PROVIDERS] : PRIMARY_PROVIDERS;

  return (
    <div className={cn("flex justify-center gap-3 flex-wrap", className)}>
      {providers.map(({ id, label, icon, color, textClass }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          aria-label={label}
          style={color ? { color } : undefined}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center p-0 transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer",
            // 未启用的平台降低不透明度，视觉上表示不可用（但仍可点击以显示 toast 提示）
            ENABLED_PROVIDERS.has(id) ? "" : "opacity-40",
            textClass ?? "text-muted-foreground",
          )}
          onPress={() => {
            if (id === "github") {
              handleGitHubLogin();
            } else {
              addToast(`${label} 登录暂未开放`, "info");
            }
          }}
        >
          <span title={label} className="inline-flex">
            <SvgIcon name={icon} size={22} />
          </span>
        </Button>
      ))}
      {expanded ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="收起登录方式"
          onPress={() => setExpanded(false)}
          className="w-9 h-9 rounded-lg flex items-center justify-center p-0 text-muted-foreground/40 transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer"
        >
          <SvgIcon name="chevron-down" size={14} className="rotate-180" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          aria-label="展开更多登录方式"
          onPress={() => setExpanded(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center p-0 text-muted-foreground/40 text-[11px] font-semibold transition-colors hover:bg-foreground/[0.08] active:bg-foreground/[0.14] cursor-pointer"
        >
          +{EXTRA_PROVIDERS.length}
        </Button>
      )}
    </div>
  );
}
