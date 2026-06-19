import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { useTheme } from "../../providers/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={`当前生效主题：${resolvedTheme}，点击切换到 ${nextTheme}`}
      onPress={() => setTheme(nextTheme)}
      className={className}
    >
      <SvgIcon name={resolvedTheme === "dark" ? "moon" : "sun"} size={20} />
    </Button>
  );
}
