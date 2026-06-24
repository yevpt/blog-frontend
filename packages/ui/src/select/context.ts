"use client";

import { createContext } from "react";
import type { SelectSize, SelectVariant } from "./types";

/** 向各子部件透传尺寸与视觉风格。 */
export const SelectContext = createContext<{ size: SelectSize; variant: SelectVariant }>({
  size: "md",
  variant: "compact",
});
