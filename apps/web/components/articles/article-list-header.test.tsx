import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  SearchField: ({
    placeholder,
    value,
    onChange,
  }: {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    size?: string;
    className?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
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
  it("渲染分类 Tab 和搜索框", () => {
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
    expect(screen.getByPlaceholderText("搜索文章...")).toBeTruthy();
  });

  it("搜索框输入后防抖 300ms 触发 onSearchChange", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();

    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("搜索文章..."), {
      target: { value: "React" },
    });
    expect(onSearchChange).not.toHaveBeenCalledWith("React");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearchChange).toHaveBeenCalledWith("React");
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

  it("渲染移动端搜索图标按钮", () => {
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "搜索" })).toBeTruthy();
  });

  it("点击搜索图标后显示关闭按钮", async () => {
    const user = userEvent.setup();
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "搜索" }));
    expect(screen.getByRole("button", { name: "关闭搜索" })).toBeTruthy();
  });

  it("点击关闭搜索后立即调用 onSearchChange('')", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "搜索" }));
    await user.click(screen.getByRole("button", { name: "关闭搜索" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("点击关闭搜索后 onSearchChange 只被调用一次", () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    render(
      <ArticleListHeader
        categories={mockCategories}
        currentCategoryId={0}
        onCategoryChange={vi.fn()}
        searchQuery=""
        onSearchChange={onSearchChange}
      />,
    );
    // 展开搜索
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    });
    // 关闭搜索
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "关闭搜索" }));
    });
    // 推进时间：防抖不应再次触发
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith("");
    vi.useRealTimers();
  });
});
