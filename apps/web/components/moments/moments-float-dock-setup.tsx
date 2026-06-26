"use client";

import { useMemo } from "react";
import { useFloatDockConfig } from "@/components/float-dock";
import { WriteMomentButton } from "./write-moment-button";

/** 碎语页：注册写碎语浮动钮 */
export function MomentsFloatDockSetup() {
  const items = useMemo(
    () => [{ id: "write-moment", order: 10, render: () => <WriteMomentButton variant="float" /> }],
    [],
  );

  useFloatDockConfig({ items });
  return null;
}
