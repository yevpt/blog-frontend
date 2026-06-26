"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";

/** 友链申请模板，供展示与一键复制共用 */
export const FRIEND_LINK_TEMPLATE = `博客名字: YEVPT
博客地址: https://www.yevpt.com
博客简介: 浮墨几许，落于此刻
博客头像: https://www.yevpt.com/logo.jpg`;

export function FriendLinksRulesCard() {
  const [copied, setCopied] = useState(false);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(FRIEND_LINK_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/45 px-5 py-4">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        如果要和本站交换友链，请按照以下格式发送到{" "}
        <a
          href="mailto:vpt940417@gmail.com"
          className="text-primary hover:underline decoration-border-primary underline-offset-4 hover:text-primary"
        >
          vpt940417@gmail.com
        </a>
      </p>

      <div className="relative mb-3 rounded-lg border border-border/70 bg-background/80 px-3.5 py-3 font-mono text-xs leading-loose text-foreground/90">
        <button
          type="button"
          onClick={handleCopyTemplate}
          className="md-copy-btn md-copy-btn-abs"
          aria-label={copied ? "已复制" : "复制模板"}
        >
          <SvgIcon
            name={copied ? "check" : "copy"}
            size={13}
            className={copied ? "text-green-600" : undefined}
          />
        </button>
        {FRIEND_LINK_TEMPLATE.split("\n").map((line) => {
          const colonIndex = line.indexOf(":");
          const label = line.slice(0, colonIndex + 1);
          const value = line.slice(colonIndex + 1).trimStart();
          return (
            <div key={line}>
              <span className="text-muted-foreground/80">{label}</span> {value}
            </div>
          );
        })}
      </div>

      <ul className="mb-2.5 space-y-1 text-xs leading-relaxed text-muted-foreground/75">
        <li>注① ：希望你的网站非采集以及纯技术站点，且每三个月至少有一次更新。</li>
        <li>注② ：为了更快的效率，请提前加上我的友链，我会在一天内尽快给出答复，谢谢！</li>
      </ul>

      <p className="text-[11px] text-muted-foreground/40">2020-01-19</p>
    </div>
  );
}
