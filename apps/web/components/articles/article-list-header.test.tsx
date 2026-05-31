import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { ArticleListHeader } from "./article-list-header";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        "article.searchPlaceholder": "搜索文章...",
      };
      return messages[key] ?? key;
    },
  }),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ArticleListHeader", () => {
  it("渲染分类和 SearchField 搜索框", () => {
    render(
      <ArticleListHeader
        categories={["全部", "编程"]}
        currentCategory="全部"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "全部" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "搜索文章..." })).toBeTruthy();
  });

  it("输入搜索词后防抖 300ms 触发 onSearchChange", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();

    render(
      <ArticleListHeader
        categories={["全部", "编程"]}
        currentCategory="全部"
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "React" } });
    expect(onSearchChange).not.toHaveBeenCalledWith("React");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith("React");
  });

  it("点击清除按钮后防抖提交空搜索词", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();

    render(
      <ArticleListHeader
        categories={["全部", "编程"]}
        currentCategory="全部"
        onCategoryChange={vi.fn()}
        searchQuery="React"
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清除搜索" }));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});
