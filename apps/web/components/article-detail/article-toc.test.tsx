import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleToc } from "./article-toc";
import type { TocItem } from "@/lib/markdown";

// jsdom 中 IntersectionObserver 不可用，mock 整个 hook
vi.mock("@/hooks/use-active-heading", () => ({
  useActiveHeading: () => null,
}));

const items: TocItem[] = [
  { id: "intro", text: "介绍", level: 2 },
  { id: "detail", text: "详细说明", level: 2 },
  { id: "sub", text: "子章节", level: 3 },
];

describe("ArticleToc", () => {
  it("渲染所有章节标题", () => {
    render(<ArticleToc items={items} variant="mobile" />);
    expect(screen.getByText("介绍")).toBeInTheDocument();
    expect(screen.getByText("详细说明")).toBeInTheDocument();
    expect(screen.getByText("子章节")).toBeInTheDocument();
  });

  it("少于 2 个标题时返回 null", () => {
    const { container } = render(<ArticleToc items={[items[0]]} variant="mobile" />);
    expect(container.firstChild).toBeNull();
  });

  it("点击章节触发 scrollIntoView", async () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2>`;
    const scrollIntoView = vi.fn();
    document.getElementById("intro")!.scrollIntoView = scrollIntoView;

    render(<ArticleToc items={items} variant="mobile" />);
    await userEvent.click(screen.getByText("介绍"));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("variant=desktop 渲染 nav 元素", () => {
    render(<ArticleToc items={items} variant="desktop" />);
    expect(screen.getByRole("navigation", { name: "文章目录" })).toBeInTheDocument();
  });

  it("desktop 点击收起按钮可折叠目录", async () => {
    render(<ArticleToc items={items} variant="desktop" />);
    expect(screen.getByText("介绍")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "收起目录" }));
    expect(screen.queryByText("介绍")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "展开目录" }));
    expect(screen.getByText("介绍")).toBeInTheDocument();
  });

  it("variant=mobile 渲染 details 折叠元素", () => {
    const { container } = render(<ArticleToc items={items} variant="mobile" />);
    expect(container.querySelector("details")).toBeInTheDocument();
  });
});
