/**
 * ToolbarButton — 工具栏单个按钮
 *
 * 支持两种内容：
 * - icon：传 SvgIcon name，渲染图标按钮
 * - label：传文字（如 "B" / "I" / "U"），渲染文字按钮
 *
 * active 态：按钮对应的格式当前已应用（如选中文字已加粗）
 * disabled 态：编辑器不可用或命令不可执行
 */
import { SvgIcon, type IconName } from "@repo/icons";
import { clsx } from "clsx";

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  icon?: IconName;
  label?: string;
  labelClassName?: string;
}

export function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  icon,
  label,
  labelClassName,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // 阻止编辑器失焦：工具栏按钮点击不应触发 blur
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors",
        active ? "bg-primary/10 text-primary" : "text-(--fg2) hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon ? (
        <SvgIcon name={icon} size={15} />
      ) : (
        <span className={clsx("select-none text-[13px] font-medium leading-none", labelClassName)}>
          {label}
        </span>
      )}
    </button>
  );
}
