"use client";

import { useRef } from "react";
import {
  DatePicker as AriaDatePicker,
  DateInput,
  DateSegment,
  Button as AriaButton,
  Popover,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarGridHeader,
  CalendarGridBody,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  type DatePickerProps as AriaDatePickerProps,
  type DateValue,
} from "react-aria-components";
import { cn } from "../lib/utils";

export interface DatePickerProps extends Omit<AriaDatePickerProps<DateValue>, "className"> {
  className?: string;
  triggerClassName?: string;
}

export function DatePicker({ className, triggerClassName, ...props }: DatePickerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <AriaDatePicker {...props} className={cn(className)}>
      <div
        ref={triggerRef}
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
                "focus:bg-primary focus:text-white",
              )}
            />
          )}
        </DateInput>
        <AriaButton className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[5px] text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </AriaButton>
      </div>

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
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </AriaButton>
              <Heading className="text-sm font-semibold text-foreground" />
              <AriaButton
                slot="next"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
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
                      "data-[selected]:bg-primary data-[selected]:text-white data-[selected]:hover:bg-primary",
                      "data-[outside-month]:opacity-30",
                      "data-[today]:font-bold data-[today]:text-primary data-[today]:data-[selected]:text-white",
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
    </AriaDatePicker>
  );
}
