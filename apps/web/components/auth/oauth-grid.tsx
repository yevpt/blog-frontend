"use client";

import { useState } from "react";
import { SvgIcon, type IconName } from "@repo/icons";
import { cn } from "@repo/ui";

interface OAuthProvider {
  id: string;
  label: string;
  icon: IconName;
  color: string | null;
}

const PRIMARY_PROVIDERS: OAuthProvider[] = [
  { id: "wechat", label: "微信", icon: "wechat", color: "#07C160" },
  { id: "qq", label: "QQ", icon: "qq", color: "#1299EF" },
  { id: "github", label: "GitHub", icon: "github", color: null },
  { id: "google", label: "Google", icon: "google", color: "#4285F4" },
];

const EXTRA_PROVIDERS: OAuthProvider[] = [
  { id: "weibo", label: "微博", icon: "weibo", color: "#DF2029" },
  { id: "gitee", label: "Gitee", icon: "gitee", color: "#C71D23" },
  { id: "baidu", label: "百度", icon: "baidu", color: "#2932E1" },
];

interface OAuthGridProps {
  className?: string;
}

export function OAuthGrid({ className }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

  const providers = expanded ? [...PRIMARY_PROVIDERS, ...EXTRA_PROVIDERS] : PRIMARY_PROVIDERS;

  return (
    <div className={cn("flex justify-center gap-3 flex-wrap", className)}>
      {providers.map(({ id, label, icon, color }) => (
        <button
          key={id}
          type="button"
          title={label}
          style={color ? { color } : undefined}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground transition-all hover:scale-110 hover:opacity-75"
        >
          <SvgIcon name={icon} size={22} />
        </button>
      ))}
      {expanded ? (
        <button
          type="button"
          aria-label="收起登录方式"
          onClick={() => setExpanded(false)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground/40 transition-all hover:scale-110 hover:opacity-75"
        >
          <SvgIcon name="chevron-down" size={14} className="rotate-180" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="展开更多登录方式"
          onClick={() => setExpanded(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground/40 text-[11px] font-semibold transition-all hover:scale-110 hover:opacity-75"
        >
          +{EXTRA_PROVIDERS.length}
        </button>
      )}
    </div>
  );
}
