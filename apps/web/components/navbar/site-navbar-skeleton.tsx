import { cn } from "@repo/ui";
import type { NavbarMobileVariant } from "./navbar-route-config";

interface SiteNavbarSkeletonProps {
  mobileVariant?: NavbarMobileVariant;
}

function NavbarMobileSkeleton({ mobileVariant }: { mobileVariant: NavbarMobileVariant }) {
  if (mobileVariant === "home") {
    return (
      <div className="flex min-h-[52px] items-center justify-between px-4 md:hidden">
        <div className="h-8 w-[82px] rounded-full bg-muted" />
        <div className="size-[34px] rounded-[9px] bg-muted" />
      </div>
    );
  }

  if (mobileVariant === "article") {
    return (
      <div className="flex min-h-[52px] items-center px-3 md:hidden">
        <div className="size-8 shrink-0 rounded-full bg-muted" />
        <div className="min-w-0 flex-1" />
        <div className="flex items-center gap-1">
          <div className="size-8 rounded-full bg-muted" />
          <div className="size-8 rounded-full bg-muted" />
          <div className="size-[34px] rounded-[9px] bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[52px] items-center px-3 md:hidden">
      <div className="size-8 shrink-0 rounded-full bg-muted" />
      <div className="flex min-w-0 flex-1 justify-center px-3">
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="size-[34px] shrink-0 rounded-[9px] bg-muted" />
    </div>
  );
}

export function SiteNavbarSkeleton({ mobileVariant = "home" }: SiteNavbarSkeletonProps) {
  return (
    <div
      id="navbar-skeleton"
      aria-hidden="true"
      aria-label="导航加载中"
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-3 py-3"
    >
      <div
        className={cn(
          "flex w-full max-w-[1120px] animate-pulse flex-col overflow-hidden rounded-[24px] border border-transparent md:rounded-full",
          "[transform:translateZ(0)]",
        )}
      >
        <NavbarMobileSkeleton mobileVariant={mobileVariant} />

        <div className="relative hidden min-h-0 items-center justify-between px-4 py-[9px] md:flex">
          <div className="h-8 w-[82px] rounded-full bg-muted" />
          <div className="absolute left-1/2 flex -translate-x-1/2 gap-6">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-4 w-10 rounded bg-muted" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted" />
            <div className="h-8 w-14 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
