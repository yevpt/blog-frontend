"use client";

import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { floatDockIconSize, floatDockOrbClass, floatDockOrbHiddenClass } from "./float-dock-styles";

interface FloatDockScrollTopOrbProps {
  visible: boolean;
  className?: string;
  iconSize?: number;
}

export function FloatDockScrollTopOrb({
  visible,
  className,
  iconSize = floatDockIconSize,
}: FloatDockScrollTopOrbProps) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <Button
      variant="ghost"
      aria-label="回到顶部"
      onPress={scrollToTop}
      className={cn(floatDockOrbClass, className, !visible && floatDockOrbHiddenClass)}
    >
      <SvgIcon name="arrow-up" size={iconSize} aria-hidden />
    </Button>
  );
}
