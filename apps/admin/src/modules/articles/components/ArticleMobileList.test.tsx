import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ArticleMobileList } from "./ArticleMobileList";
import type { ArticleRow } from "../model";

const mockRows: ArticleRow[] = [
  {
    id: "1",
    title: "React Query 与后台表格状态",
    excerpt: "用稳定的数据状态承载后台筛选、分页与刷新。",
    status: "published",
    category: "工程",
    isPinned: true,
    createdAt: "2026/06/16",
    updatedAt: "2026/06/16",
  },
];

describe("ArticleMobileList", () => {
  it("渲染文章行与元信息", () => {
    render(
      <MemoryRouter>
        <ArticleMobileList items={mockRows} deletingArticleId={null} onConfirmDelete={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "React Query 与后台表格状态" })).toHaveAttribute(
      "href",
      "/articles/1/edit",
    );
    expect(screen.getByText("已发布")).toBeInTheDocument();
    expect(screen.getByText("已推荐")).toBeInTheDocument();
  });

  it("空列表时展示空态", () => {
    render(
      <MemoryRouter>
        <ArticleMobileList
          items={[]}
          deletingArticleId={null}
          onConfirmDelete={vi.fn()}
          emptyState={{ icon: "folder", title: "还没有文章", description: "先写一篇吧" }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("还没有文章")).toBeInTheDocument();
  });

  it("点击删除按钮打开确认弹窗", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ArticleMobileList items={mockRows} deletingArticleId={null} onConfirmDelete={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "删除文章" })).toHaveClass("text-destructive/80");
    await user.click(screen.getByRole("button", { name: "删除文章" }));

    expect(
      screen.getByRole("dialog", { name: /确认删除「React Query 与后台表格状态」/ }),
    ).toBeInTheDocument();
  });
});
