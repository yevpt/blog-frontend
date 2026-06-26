// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatDockProvider, SiteFloatDock } from "@/components/float-dock";
import { MomentsFloatDockSetup } from "./moments-float-dock-setup";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: () => <span data-testid="icon-pen" />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <button type="button" className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MomentsFloatDockSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 768px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as typeof window.matchMedia;
  });

  it("注册写碎语浮动钮", () => {
    render(
      <FloatDockProvider>
        <MomentsFloatDockSetup />
        <SiteFloatDock />
      </FloatDockProvider>,
    );

    expect(screen.getByRole("button", { name: "写碎语" })).toHaveClass(
      "size-10",
      "backdrop-blur-xl",
      "bg-primary/12",
      "text-primary",
    );
  });
});
