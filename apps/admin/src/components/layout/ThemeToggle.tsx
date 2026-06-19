import { SvgIcon } from "@repo/icons";
import { Button, cn } from "@repo/ui";
import { useTheme } from "../../providers/theme-provider";

interface ThemeToggleProps {
  className?: string;
  /** 显示文字标签，用于侧栏的行式布局；不传则只渲染图标（如登录页） */
  showLabel?: boolean;
  /** 折叠态下隐藏文字标签（保留无障碍文案） */
  collapsed?: boolean;
}

export function ThemeToggle({ className, showLabel = false, collapsed = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
      onPress={() => setTheme(nextTheme)}
      className={className}
    >
      <SvgIcon name={isDark ? "moon" : "sun"} size={20} />
      {showLabel ? (
        <span className={cn("truncate text-sm", collapsed && "sr-only")}>
          {isDark ? "深色模式" : "浅色模式"}
        </span>
      ) : null}
    </Button>
  );
}
