"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";

/** 友链申请模板，供展示与一键复制共用 */
export const FRIEND_LINK_TEMPLATE = `博客名字: YEVPT
博客地址: https://www.yevpt.com
博客简介: 浮墨几许，落在此刻。。
博客头像: https://www.yevpt.com/logo.jpg`;

export function FriendLinksRulesCard() {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(FRIEND_LINK_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-secondary px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SvgIcon name="plus" className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="text-sm font-bold text-foreground">交换友链</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          aria-controls="friend-links-rules-body"
        >
          {open ? "收起 ▲" : "展开 ▼"}
        </button>
      </div>

      <div
        id="friend-links-rules-body"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="mt-3.5">
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              如果要和本站交换友链，请按照以下格式发送到{" "}
              <a href="mailto:vpt940417@gmail.com" className="text-primary hover:underline">
                vpt940417@gmail.com
              </a>
            </p>

            <div className="relative mb-3 rounded-md border-l-[3px] border-primary bg-background px-3.5 py-3 font-mono text-xs leading-loose text-foreground">
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
                    <span className="text-muted-foreground">{label}</span> {value}
                  </div>
                );
              })}
            </div>

            <ul className="mb-2.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>注① ：希望你的网站非采集以及纯技术站点，且每三个月至少有一次更新。</li>
              <li>注② ：为了更快的效率，请提前加上我的友链，我会在一天内尽快给出答复，谢谢！</li>
            </ul>

            <p className="text-[11px] text-muted-foreground/50">2020-01-19</p>
          </div>
        </div>
      </div>
    </div>
  );
}
