"use client";

import { useState } from "react";
import { SvgIcon, type IconName } from "@repo/icons";
import { Button, cn } from "@repo/ui";

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

interface OAuthGridProps {
  className?: string;
}

export function OAuthGrid({ className }: OAuthGridProps) {
  const [expanded, setExpanded] = useState(false);

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
            textClass ?? "text-muted-foreground",
          )}
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
