import type { SliderProps as AriaSliderProps } from "react-aria-components";

export interface SliderProps extends Omit<AriaSliderProps<number>, "children"> {
  label: string;
  showOutput?: boolean;
}
