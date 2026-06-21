import type { ReactNode } from "react";
import { Button, cn, type ButtonProps } from "@repo/ui";

type SidebarSectionActionProps = Omit<
  Extract<ButtonProps, { href?: never }>,
  "variant" | "size"
> & {
  children: ReactNode;
};

/** 侧栏 header 右侧 ghost 文字动作：颜色 + 透明度过渡，禁用 Button 默认按压缩放 */
export function SidebarSectionAction({ className, children, ...props }: SidebarSectionActionProps) {
  return (
    <Button
      variant="text"
      className={cn(
        "gap-1 text-[11px] font-normal text-(--fg3)",
        "transition-[color,opacity] duration-150 ease-out",
        "hover:text-primary data-[hovered]:text-primary",
        "data-[pressed]:scale-100 data-[pressed]:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
