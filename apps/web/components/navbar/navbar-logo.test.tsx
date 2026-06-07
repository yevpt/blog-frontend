import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NavbarLogo } from "./navbar-logo";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NavbarLogo", () => {
  it("渲染可返回首页的 YEVPT 标识", () => {
    render(<NavbarLogo />);

    const logo = screen.getByRole("link", { name: "YEVPT" });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("默认状态使用更精致的文字标识样式", () => {
    render(<NavbarLogo />);

    const logo = screen.getByRole("link", { name: "YEVPT" });
    const wordmark = screen.getByText("YEVPT");
    expect(logo.className).toContain("min-w-[82px]");
    expect(wordmark.className).toContain("font-serif");
    expect(wordmark.className).toContain("text-[15px]");
    expect(wordmark.className).toContain("tracking-[0.08em]");
    expect(wordmark.className).toContain("text-foreground");
  });

  it("玻璃态下标识颜色更克制", () => {
    render(<NavbarLogo isGlass />);

    expect(screen.getByText("YEVPT").className).toContain("text-(--fg2)");
  });
});
