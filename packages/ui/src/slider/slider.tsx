"use client";

import {
  Label,
  Slider as AriaSlider,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { cn } from "../lib/utils";
import type { SliderProps } from "./types";

export function Slider({ label, showOutput = false, className, ...props }: SliderProps) {
  return (
    <AriaSlider
      {...props}
      className={(state) =>
        cn(
          "grid min-w-0 gap-1",
          state.isDisabled && "opacity-50",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      <Label className="sr-only">{label}</Label>
      {showOutput ? <SliderOutput className="text-xs text-muted-foreground" /> : null}
      <SliderTrack className="group relative flex h-5 w-full cursor-pointer items-center">
        <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <SliderFill className="rounded-full bg-primary" />
        </span>
        <SliderThumb
          className={cn(
            "size-3 rounded-full border-2 border-primary bg-background outline-none",
            "data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[dragging]:scale-110",
          )}
        />
      </SliderTrack>
    </AriaSlider>
  );
}
