// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PageSectionHeader } from "./page-section-header";

vi.mock("@repo/ui", () => ({
  cn: (...args: (string | undefined)[]) => args.filter(Boolean).join(" "),
}));

describe("PageSectionHeader", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<PageSectionHeader label="标签" title="标题" />)).not.toThrow();
  });

  it("显示 label 和 title", () => {
    render(<PageSectionHeader label="最近碎语" title="最近在聊些什么" />);
    expect(screen.getByText("最近碎语")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "最近在聊些什么" })).toBeTruthy();
  });

  it("默认渲染 h1", () => {
    render(<PageSectionHeader label="x" title="标题" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it('as="h2" 时渲染 h2', () => {
    render(<PageSectionHeader label="x" title="标题" as="h2" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });
});
