import type { ReactNode } from "react";
import { Button, cn, type ButtonProps } from "@repo/ui";

interface SidebarSectionFooterProps {
  children: ReactNode;
}

/** 侧栏区块底部 CTA 行：双等宽按钮横向排列，无顶部分隔线 */
export function SidebarSectionFooter({ children }: SidebarSectionFooterProps) {
  return <div className="flex gap-2 px-4 py-3">{children}</div>;
}

type SidebarFooterButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  /** primary=主操作（淡主色底）；ghost=次操作（透明描边） */
  tone: "primary" | "ghost";
};

const TONE_CLASSES: Record<SidebarFooterButtonProps["tone"], string> = {
  primary:
    "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
  ghost: "border border-border text-(--fg2) hover:bg-accent hover:text-foreground",
};

/** 底部 CTA 按钮：扁平描边、等宽（flex-1），按 tone 切换主/次样式 */
export function SidebarFooterButton({
  tone,
  className,
  children,
  ...props
}: SidebarFooterButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("flex-1 gap-1 font-medium", TONE_CLASSES[tone], className)}
      {...(props as ButtonProps)}
    >
      {children}
    </Button>
  );
}
