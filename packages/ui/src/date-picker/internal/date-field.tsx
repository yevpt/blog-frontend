"use client";

import type { Ref } from "react";
import { Button as AriaButton, DateInput, DateSegment } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";

interface DateFieldProps {
  ref?: Ref<HTMLDivElement>;
  triggerClassName?: string;
}

/** 日期输入触发区：分段输入 + 打开日历的按钮。 */
export const DateField = ({ ref, triggerClassName }: DateFieldProps) => (
  <div
    ref={ref}
    className={cn(
      "flex h-8 items-center rounded-lg bg-background pl-2.5 pr-1 shadow-[0_0_0_2px] shadow-primary",
      triggerClassName,
    )}
  >
    <DateInput className="flex items-center">
      {(segment) => (
        <DateSegment
          segment={segment}
          className={cn(
            "rounded px-0.5 py-0.5 text-sm tabular-nums outline-none",
            "text-foreground",
            "data-[type=literal]:text-muted-foreground/40 data-[type=literal]:select-none",
            "data-[placeholder]:text-muted-foreground/40",
            "focus:bg-primary focus:text-primary-foreground",
          )}
        />
      )}
    </DateInput>
    <AriaButton className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground">
      <SvgIcon name="calendar" size={13} />
    </AriaButton>
  </div>
);
