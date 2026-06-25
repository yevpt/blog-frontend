import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleListToolbar } from "./ArticleListToolbar";

describe("ArticleListToolbar", () => {
  const categoryOptions = [
    { value: "all", label: "全部" },
    { value: "2", label: "前端" },
  ];

  it("渲染搜索框与分类筛选", () => {
    render(
      <ArticleListToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        categoryId="all"
        categoryOptions={categoryOptions}
        onCategoryChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "搜索文章" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /筛选分类/ })).toBeInTheDocument();
  });

  it("输入搜索词时触发 onSearchChange", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <ArticleListToolbar
        searchValue=""
        onSearchChange={onSearchChange}
        categoryId="all"
        categoryOptions={categoryOptions}
        onCategoryChange={vi.fn()}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "搜索文章" }), "Vite");

    expect(onSearchChange).toHaveBeenCalled();
  });
});
