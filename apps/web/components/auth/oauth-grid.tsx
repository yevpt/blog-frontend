"use client";

import { useState, useEffect, useRef } from "react";
import { SvgIcon, type IconName } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import type { UserResp } from "@repo/api";
import { openOAuthPopup } from "@/lib/oauth";
import { addToast } from "@/lib/toast";

// 模块级缓存：整个页面生命周期内只发一次请求，React StrictMode 双执行不重复请求
let _providersPromise: Promise<Set<string>> | null = null;

function getEnabledProviders(): Promise<Set<string>> {
  if (!_providersPromise) {
    _providersPromise = fetch("/api/oauth/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 0 && Array.isArray(data.data)) {
          return new Set<string>(data.data);
        }
        return new Set<string>();
      })
      .catch(() => {
        _providersPromise = null; // 失败时重置，允许下次重试
        return new Set<string>();
      });
  }
  return _providersPromise;
}

/** 仅供测试使用：重置 providers 缓存 */
export function _resetProvidersCache() {
  _providersPromise = null;
}

interface OAuthProvider {
  id: string;
  label: string;
  icon: IconName;
  color: string | null;
  textClass?: string;
}

const ALL_PROVIDERS: OAuthProvider[] = [
  { id: "qq", label: "QQ", icon: "qq", color: "#1299EF" },
  { id: "github", label: "GitHub", icon: "github", color: null, textClass: "text-foreground" },
  { id: "weibo", label: "微博", icon: "weibo", color: "#DF2029" },
  { id: "gitee", label: "Gitee", icon: "gitee", color: "#C71D23" },
  { id: "baidu", label: "百度", icon: "baidu", color: "#2932E1" },
];

const FOLD_THRESHOLD = 5;

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
  const [enabledProviders, setEnabledProviders] = useState<Set<string>>(new Set());

  // 保存当前 popup 监听器的清理函数，以便组件卸载时移除，防止内存泄漏
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    getEnabledProviders().then(setEnabledProviders);
  }, []);

  // 组件卸载时移除尚未触发的监听器
  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  async function handleOAuthLogin(id: string) {
    try {
      const redirectUri = `${window.location.origin}/oauth/${id}/callback`;
      const res = await fetch(
        `/api/oauth/${id}/authorize?action=login&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const data = await res.json();

      if (data.code !== 0 || !data.data?.authorize_url) {
        addToast(data.message ?? "获取授权地址失败，请稍后重试", "error");
        return;
      }

      // 复位上一次未触发的监听器，再开新的 popup
      cleanupRef.current?.();
      const cleanup = openOAuthPopup(data.data.authorize_url, (msg) => {
        if (msg.type === "oauth_success") {
          onSuccess?.(msg.user);
        } else if (msg.type === "oauth_error") {
          addToast(msg.message ?? "登录失败，请稍后重试", "error");
        }
        cleanupRef.current = null;
      });

      if (!cleanup) {
        addToast("浏览器阻止了弹出窗口，请允许后重试", "error");
        return;
      }
      cleanupRef.current = cleanup;
    } catch {
      addToast("网络异常，请稍后重试", "error");
    }
  }

  const needsFold = ALL_PROVIDERS.length > FOLD_THRESHOLD;
  const providers = !needsFold || expanded ? ALL_PROVIDERS : ALL_PROVIDERS.slice(0, FOLD_THRESHOLD);

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
            enabledProviders.has(id) ? "" : "opacity-40",
            textClass ?? "text-muted-foreground",
          )}
          onPress={() => {
            if (enabledProviders.has(id)) {
              handleOAuthLogin(id);
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
      {needsFold &&
        (expanded ? (
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
            +{ALL_PROVIDERS.length - FOLD_THRESHOLD}
          </Button>
        ))}
    </div>
  );
}
