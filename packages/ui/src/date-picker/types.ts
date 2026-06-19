import type { DatePickerProps as AriaDatePickerProps, DateValue } from "react-aria-components";

/** `DatePicker` 的 props。 */
export interface DatePickerProps extends Omit<AriaDatePickerProps<DateValue>, "className"> {
  className?: string;
  triggerClassName?: string;
}
