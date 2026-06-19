"use client";

import type { RefObject } from "react";
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Dialog,
  Heading,
  Popover,
} from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { cn } from "../../lib/utils";

interface CalendarPopoverProps {
  triggerRef: RefObject<HTMLDivElement | null>;
}

/** 日历浮层：月份导航 + 日期网格。 */
export const CalendarPopover = ({ triggerRef }: CalendarPopoverProps) => (
  <Popover
    triggerRef={triggerRef}
    offset={6}
    className="z-50 rounded-xl border border-border bg-card p-3 shadow-xl outline-none"
  >
    <Dialog className="outline-none">
      <Calendar>
        <header className="mb-2 flex items-center justify-between">
          <AriaButton
            slot="previous"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SvgIcon name="chevron-left" size={12} />
          </AriaButton>
          <Heading className="text-sm font-semibold text-foreground" />
          <AriaButton
            slot="next"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SvgIcon name="chevron-right" size={12} />
          </AriaButton>
        </header>

        <CalendarGrid>
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className="w-8 pb-1 text-center text-[11px] font-medium text-muted-foreground/60">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell
                date={date}
                className={cn(
                  "flex h-8 w-8 cursor-default items-center justify-center rounded-lg text-[13px] text-foreground outline-none transition-colors",
                  "hover:bg-muted",
                  "data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary",
                  "data-[outside-month]:opacity-30",
                  "data-[today]:font-bold data-[today]:text-primary data-[today]:data-[selected]:text-primary-foreground",
                  "data-[focused]:ring-2 data-[focused]:ring-primary/40",
                  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-30",
                )}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>
    </Dialog>
  </Popover>
);
