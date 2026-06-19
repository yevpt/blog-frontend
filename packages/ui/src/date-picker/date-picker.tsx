"use client";

import { useRef } from "react";
import { DatePicker as AriaDatePicker } from "react-aria-components";
import { cn } from "../lib/utils";
import { CalendarPopover } from "./internal/calendar-popover";
import { DateField } from "./internal/date-field";
import type { DatePickerProps } from "./types";

export function DatePicker({ className, triggerClassName, ...props }: DatePickerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <AriaDatePicker {...props} className={cn(className)}>
      <DateField ref={triggerRef} triggerClassName={triggerClassName} />
      <CalendarPopover triggerRef={triggerRef} />
    </AriaDatePicker>
  );
}
