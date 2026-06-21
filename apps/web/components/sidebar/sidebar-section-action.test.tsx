import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SidebarSectionAction } from "./sidebar-section-action";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    className,
    variant,
    ...props
  }: {
    children: ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" data-variant={variant} className={className} {...props}>
      {children}
    </button>
  ),
}));

describe("SidebarSectionAction", () => {
  it("渲染为 text variant 按钮", () => {
    render(<SidebarSectionAction>查看更多</SidebarSectionAction>);
    const button = screen.getByRole("button", { name: "查看更多" });
    expect(button.dataset.variant).toBe("text");
  });

  it("禁用默认按压缩放，改用透明度反馈", () => {
    render(<SidebarSectionAction>换一批</SidebarSectionAction>);
    const cls = screen.getByRole("button", { name: "换一批" }).className;
    expect(cls).toContain("data-[pressed]:scale-100");
    expect(cls).toContain("data-[pressed]:opacity-60");
    expect(cls).toContain("transition-[color,opacity]");
  });
});
