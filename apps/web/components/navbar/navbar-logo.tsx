import Link from "next/link";
import { cn } from "@repo/ui";

interface NavbarLogoProps {
  isGlass?: boolean;
}

export function NavbarLogo({ isGlass = false }: NavbarLogoProps) {
  return (
    <Link
      href="/"
      className="inline-flex h-8 min-w-[82px] shrink-0 -translate-y-px items-center justify-start rounded-full px-1 transition-colors"
    >
      <span
        className={cn(
          "font-serif text-[15px] font-medium leading-none tracking-[0.08em] antialiased transition-colors",
          isGlass ? "text-[var(--fg2)]" : "text-foreground",
        )}
      >
        YEVPT
      </span>
    </Link>
  );
}
