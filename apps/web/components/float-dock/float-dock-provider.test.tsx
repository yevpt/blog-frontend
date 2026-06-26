// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FloatDockPageAnchor,
  FloatDockProvider,
  SiteFloatDock,
  useFloatDockConfig,
  useFloatDockContext,
} from "./index";
import { pageContainerFloatDockLayout } from "@/lib/float-dock-layouts";

vi.mock("@repo/icons", () => ({
  SvgIcon: () => <span />,
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
}));

function ExtraItemSetup() {
  useFloatDockConfig({
    items: [{ id: "extra", order: 1, render: () => <span data-testid="extra-item" /> }],
  });
  return null;
}

function OutsideProviderProbe() {
  useFloatDockContext();
  return <span data-testid="outside-provider-probe" />;
}

describe("FloatDockProvider merge", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(min-width: 768px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as typeof window.matchMedia;
  });

  it("定位锚点与仅 items 注册合并，保留 page-column 定位", () => {
    render(
      <FloatDockProvider>
        <FloatDockPageAnchor layout={pageContainerFloatDockLayout("default")} />
        <ExtraItemSetup />
        <SiteFloatDock />
      </FloatDockProvider>,
    );

    const root = screen.getByTestId("float-actions-dock").parentElement;
    expect(root).toHaveStyle({ left: "1245px" });
    expect(screen.getByTestId("extra-item")).toBeInTheDocument();
  });

  it("测试环境无 Provider 时不抛错", () => {
    expect(() => render(<OutsideProviderProbe />)).not.toThrow();
    expect(screen.getByTestId("outside-provider-probe")).toBeInTheDocument();
  });
});
