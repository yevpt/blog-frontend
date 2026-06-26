"use client";

import { useId, useState } from "react";
import type { FriendLinkItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { FriendLinksList } from "./friend-links-list";

interface FriendLinksPausedSectionProps {
  links: FriendLinkItemResp[];
}

export function FriendLinksPausedSection({ links }: FriendLinksPausedSectionProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (links.length === 0) return null;

  return (
    <section className="mt-7 border-t border-dashed border-border pt-4">
      <Button
        type="button"
        variant="ghost"
        className="group flex h-auto w-full justify-between rounded-lg px-3 py-2 text-left text-muted-foreground hover:text-foreground data-[pressed]:scale-100"
        aria-label={`${open ? "收起" : "展开"}暂别友邻 · ${links.length}`}
        aria-expanded={open}
        aria-controls={panelId}
        onPress={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <span className="text-sm font-semibold">暂别友邻 · {links.length}</span>
          <span className="text-xs font-normal text-muted-foreground">
            这些站点暂时无法访问，先收在这里。
          </span>
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-out group-hover:bg-muted">
          <SvgIcon
            name="chevron-down"
            size={16}
            className={cn(
              "transition-transform duration-200 ease-out",
              open ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </span>
      </Button>

      {open && (
        <div id={panelId} className="mt-3">
          <FriendLinksList links={links} />
        </div>
      )}
    </section>
  );
}
