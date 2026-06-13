"use client";

import { useState } from "react";
import { SvgIcon } from "@repo/icons";

export function FriendLinksRulesCard() {
  const [open, setOpen] = useState(true);

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
        >
          {open ? "收起 ▲" : "展开 ▼"}
        </button>
      </div>

      {open && (
        <div className="mt-3.5">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            如果要和本站交换友链，请按照以下格式发送到{" "}
            <a href="mailto:vpt940417@gmail.com" className="text-primary hover:underline">
              vpt940417@gmail.com
            </a>
          </p>

          <div className="mb-3 rounded-md border-l-[3px] border-primary bg-background px-3.5 py-3 font-mono text-xs leading-loose text-foreground">
            <div>
              <span className="text-muted-foreground">博客名字:</span> YEVPT
            </div>
            <div>
              <span className="text-muted-foreground">博客地址:</span> https://www.yevpt.com
            </div>
            <div>
              <span className="text-muted-foreground">博客简介:</span>{" "}
              我喜欢要么极度悲伤要么淡淡温暖。
            </div>
            <div>
              <span className="text-muted-foreground">博客头像:</span>{" "}
              https://www.yevpt.com/logo.jpg
            </div>
          </div>

          <ul className="mb-2.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>注① ：希望你的网站非采集以及纯技术站点，且每三个月至少有一次更新。</li>
            <li>注② ：为了更快的效率，请提前加上我的友链，我会在一天内尽快给出答复，谢谢！</li>
          </ul>

          <p className="text-[11px] text-muted-foreground/50">2020-01-19</p>
        </div>
      )}
    </div>
  );
}
