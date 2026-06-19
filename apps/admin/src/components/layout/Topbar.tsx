import { SvgIcon } from "@repo/icons";
import { Button } from "@repo/ui";
import { ThemeToggle } from "./ThemeToggle";

interface TopbarProps {
  title: string;
  onOpenMobile: () => void;
}

export function Topbar({ title, onOpenMobile }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 text-card-foreground backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          aria-label="打开侧栏菜单"
          onPress={onOpenMobile}
          className="h-9 w-9 shrink-0 rounded-lg p-0 lg:hidden"
        >
          <SvgIcon name="menu" size={20} />
        </Button>
        <h1 className="truncate text-base font-semibold text-foreground md:text-lg">{title}</h1>
      </div>

      <ThemeToggle className="h-9 w-9 rounded-full p-0 text-foreground hover:bg-accent hover:text-primary" />
    </header>
  );
}
