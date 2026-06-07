/**
 * ToolbarButton — 工具栏单个按钮
 *
 * 支持两种内容：
 * - icon：传 SvgIcon name，渲染图标按钮
 * - label：传文字（如 "B" / "I" / "U"），渲染文字按钮
 *
 * active 态：bg-primary/10 底色 + text-primary，跟随网站主题色
 * disabled 态：编辑器不可用或命令不可执行
 * 暗黑模式：通过 Tailwind 语义色令牌自动适配
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
  active,
  disabled = false,
  title,
  icon,
  label,
  labelClassName,
}: ToolbarButtonProps) {
  const isActive = active === true;

  return (
    <button
      type="button"
      aria-pressed={active === undefined ? undefined : isActive}
      onMouseDown={(e) => {
        // 阻止编辑器失焦：工具栏按钮点击不应触发 blur
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon ? (
        <SvgIcon name={icon} size={16} />
      ) : (
        <span className={clsx("select-none text-[15px] font-medium leading-none", labelClassName)}>
          {label}
        </span>
      )}
    </button>
  );
}
