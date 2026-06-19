import { createContext } from "react";
import type { SelectSize } from "./types";

/** 向各子部件透传当前尺寸档位。 */
export const SelectContext = createContext<{ size: SelectSize }>({ size: "md" });
