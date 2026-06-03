import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { CategoryTabItem } from "@repo/api";
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

// Mock @repo/ui — mirrors the mock in article-section.test.tsx
vi.mock("@repo/ui", () => ({
  Tabs: ({
    children,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => {
    const handleSelect = (e: { target: EventTarget | null }) => {
      const btn = (e.target as HTMLElement).closest("button[data-tab-id]");
      if (btn && onSelectionChange) {
        onSelectionChange(btn.getAttribute("data-tab-id") ?? "");
      }
    };
    return (
      <div role="presentation" onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    <button data-tab-id={id}>{children}</button>
  ),
}));

const mockCategories: CategoryTabItem[] = [
  { id: 0, name: "全部", seq: -1, article_count: 0 },
  { id: 1, name: "编程", seq: 0, article_count: 5 },
];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ArticleListHeader", () => {
  it("渲染分类 Tab，不渲染搜索入口", () => {
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.queryByPlaceholderText("搜索文章...")).toBeNull();
    expect(screen.queryByRole("button", { name: "搜索" })).toBeNull();
  });

  it("点击分类 Tab 后调用 onCategoryChange 传入对应数字 id", () => {
    const onCategoryChange = vi.fn();
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={onCategoryChange}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );

    // TabsItem mock renders <button data-tab-id="1">编程</button>
    // Tabs onClick handler calls onSelectionChange("1")
    // ArticleListHeader converts: onCategoryChange(Number("1")) = onCategoryChange(1)
    fireEvent.click(screen.getByText("编程"));

    expect(onCategoryChange).toHaveBeenCalledWith(1);
  });
});
