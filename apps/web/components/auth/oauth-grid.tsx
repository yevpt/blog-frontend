"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

const PRIMARY_PROVIDERS = [
  { id: "wechat", label: "微信", icon: "wechat" },
  { id: "qq", label: "QQ", icon: "qq" },
  { id: "github", label: "GitHub", icon: "github" },
  { id: "google", label: "Google", icon: "google" },
] as const;

const EXTRA_PROVIDERS = [
  { id: "weibo", label: "微博", icon: "weibo" },
  { id: "gitee", label: "Gitee", icon: "gitee" },
  { id: "baidu", label: "百度", icon: "baidu" },
] as const;

interface OAuthGridProps {
  className?: string;
}

export function OAuthGrid({ className }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

  const providers = expanded ? [...PRIMARY_PROVIDERS, ...EXTRA_PROVIDERS] : PRIMARY_PROVIDERS;

  return (
    <div className={cn("flex justify-center gap-2 flex-wrap", className)}>
      {providers.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          className="w-11 h-11 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground transition-all hover:bg-foreground/[0.09] hover:border-foreground/[0.14] hover:-translate-y-px"
        >
          <SvgIcon name={icon} size={20} />
        </button>
      ))}
      {!expanded && (
        <button
          type="button"
          aria-label="展开更多登录方式"
          onClick={() => setExpanded(true)}
          className="w-11 h-11 rounded-xl bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground text-[11px] font-semibold transition-all hover:bg-foreground/[0.09] hover:border-foreground/[0.14] hover:-translate-y-px"
        >
          +{EXTRA_PROVIDERS.length}
        </button>
      )}
    </div>
  );
}
