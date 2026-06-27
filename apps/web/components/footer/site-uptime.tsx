"use client";

import { useEffect, useState } from "react";
import { cn } from "@repo/ui";
import { formatSiteUptime, SITE_CREATED_AT } from "./format-site-uptime";

const UPTIME_REFRESH_MS = 60_000;

interface SiteUptimeProps {
  className?: string;
}

export function SiteUptime({ className }: SiteUptimeProps) {
  const [uptimeText, setUptimeText] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setUptimeText(formatSiteUptime(SITE_CREATED_AT, new Date()));

    refresh();
    const timerId = window.setInterval(refresh, UPTIME_REFRESH_MS);
    return () => window.clearInterval(timerId);
  }, []);

  if (!uptimeText) {
    return null;
  }

  return (
    <div className={cn("mt-3", className)}>
      {uptimeText ? (
        <p className="m-0 text-[11px] leading-[16px] text-muted-foreground/45 tabular-nums tracking-wide">
          {uptimeText}
        </p>
      ) : (
        <div className="h-[16px]" aria-hidden="true" />
      )}
    </div>
  );
}
