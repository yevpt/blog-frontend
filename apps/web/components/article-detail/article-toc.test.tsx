import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleToc } from "./article-toc";
import type { TocItem } from "@/lib/markdown";

const mockActiveHeading = vi.hoisted(() => ({
  value: null as string | null,
}));

// jsdom 中 IntersectionObserver 不可用，mock 整个 hook
vi.mock("@/hooks/use-active-heading", () => ({
  useActiveHeading: () => mockActiveHeading.value,
}));

const items: TocItem[] = [
  { id: "intro", text: "介绍", level: 2 },
  { id: "detail", text: "详细说明", level: 2 },
  { id: "sub", text: "子章节", level: 3 },
];

const h3OnlyItems: TocItem[] = [
  { id: "install", text: "安装", level: 3 },
  { id: "mirror", text: "更换国内源", level: 3 },
];

describe("ArticleToc", () => {
  beforeEach(() => {
    mockActiveHeading.value = null;
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

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

  it("桌面端使用更明确且轻量的目录标题", () => {
    render(<ArticleToc items={items} variant="desktop" />);

    const title = screen.getByText("本文目录");

    expect(title.className).toContain("text-[11px]");
    expect(title.className).toContain("font-medium");
    expect(title.className).not.toContain("uppercase");
    expect(title.className).not.toContain("tracking-widest");
    expect(title.className).not.toContain("px-3");
  });

  it("desktop 渲染所有章节标题", () => {
    render(<ArticleToc items={items} variant="desktop" />);
    expect(screen.getByText("介绍")).toBeInTheDocument();
    expect(screen.getByText("详细说明")).toBeInTheDocument();
    expect(screen.getByText("子章节")).toBeInTheDocument();
  });

  it("标题都从 h3 开始时按一级目录对齐", () => {
    render(<ArticleToc items={h3OnlyItems} variant="desktop" />);
    expect(screen.getByText("安装").closest("li")).toHaveStyle({ paddingLeft: "0px" });
  });

  it("选中项只用文字和轨道标记高亮", () => {
    mockActiveHeading.value = "intro";
    render(<ArticleToc items={items} variant="desktop" />);

    const activeButton = screen.getByRole("button", { name: "介绍" });
    const buttons = screen.getAllByRole("button");

    expect(activeButton).toHaveAttribute("aria-current", "location");
    expect(activeButton.className).not.toContain("bg-primary/10");
    expect(activeButton.className).not.toContain("font-semibold");
    expect(activeButton.className).toContain("text-foreground");
    expect(activeButton.className).not.toContain("text-primary");
    buttons.forEach((button) => {
      expect(button.className).not.toContain("hover:bg");
    });
  });

  it("当前章节轨道标记使用位置过渡", () => {
    mockActiveHeading.value = "intro";
    render(<ArticleToc items={items} variant="desktop" />);

    const indicator = screen.getByTestId("toc-active-indicator");

    expect(indicator.className).toContain("transition-transform");
    expect(indicator.className).toContain("duration-200");
    expect(indicator.className).toContain("bg-foreground");
    expect(indicator.className).not.toContain("bg-foreground/80");
    expect(indicator.className).not.toContain("bg-primary");
  });

  it("正文滚动激活章节时不滚动目录列表", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    mockActiveHeading.value = "intro";

    render(<ArticleToc items={items} variant="desktop" />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("目录轨道在明暗主题下使用克制的中性槽色", () => {
    mockActiveHeading.value = "intro";
    render(<ArticleToc items={items} variant="desktop" />);

    const track = screen.getByRole("list");

    expect(track.className).toContain("border-foreground/8");
    expect(track.className).toContain("dark:border-foreground/12");
    expect(track.className).not.toContain("border-muted-foreground/35");
  });

  it("桌面端固定目录标题，仅索引区域滚动", () => {
    render(<ArticleToc items={items} variant="desktop" />);

    const nav = screen.getByRole("navigation", { name: "文章目录" });
    const scrollArea = screen.getByTestId("toc-scroll-area");

    expect(nav.className).not.toContain("overflow-y-auto");
    expect(scrollArea.className).toContain("overflow-y-auto");
  });

  it("激活项离开索引可视区时滚动索引区域", () => {
    const { rerender } = render(<ArticleToc items={items} variant="desktop" />);
    const scrollArea = screen.getByTestId("toc-scroll-area");
    const firstItem = screen.getByText("介绍").closest("li");
    const scrollTo = vi.fn();

    Object.defineProperty(scrollArea, "clientHeight", { configurable: true, value: 80 });
    Object.defineProperty(scrollArea, "scrollTop", { configurable: true, value: 240 });
    Object.defineProperty(scrollArea, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(firstItem, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(firstItem, "offsetHeight", { configurable: true, value: 32 });

    mockActiveHeading.value = "intro";
    rerender(<ArticleToc items={items} variant="desktop" />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("variant=mobile 渲染 details 折叠元素", () => {
    const { container } = render(<ArticleToc items={items} variant="mobile" />);
    expect(container.querySelector("details")).toBeInTheDocument();
    expect(screen.getByText("本文目录")).toBeInTheDocument();
  });
});
