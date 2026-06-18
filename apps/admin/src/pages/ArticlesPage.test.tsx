import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ArticlesPage } from "./ArticlesPage";

function renderArticlesPage() {
  return render(
    <MemoryRouter>
      <ArticlesPage />
    </MemoryRouter>,
  );
}

describe("ArticlesPage", () => {
  it("渲染以表格为主体的文章管理页", () => {
    renderArticlesPage();

    expect(screen.getByRole("heading", { name: "文章管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /置顶管理/ })).toHaveAttribute(
      "href",
      "/articles/pinned",
    );
    expect(screen.getByRole("link", { name: /新建文章/ })).toHaveAttribute("href", "/articles/new");
    expect(screen.getByRole("searchbox", { name: "搜索标题、摘要或作者" })).toBeInTheDocument();

    const table = screen.getByRole("grid", { name: "文章列表" });
    expect(within(table).getByRole("columnheader", { name: /状态/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /分类/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /标签/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /更新时间/ })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "筛选状态" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "筛选分类" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "筛选标签" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "筛选置顶" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "更新时间排序：降序" })).toBeInTheDocument();

    expect(within(table).getByRole("link", { name: "React Query 与后台表格状态" })).toHaveAttribute(
      "href",
      "/articles/react-query-admin-table/edit",
    );
    expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();
    expect(within(table).getAllByRole("button", { name: /删除/ })).toHaveLength(4);
  });

  it("可通过表头筛选状态并展示当前筛选状态", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    await user.click(screen.getByRole("button", { name: "筛选状态" }));
    await user.click(screen.getByRole("menuitemradio", { name: "草稿" }));

    expect(screen.getByRole("button", { name: "筛选状态：草稿" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("共 1 条")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vite 管理后台的主题方案" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "React Query 与后台表格状态" }),
    ).not.toBeInTheDocument();
  });

  it("可通过内置搜索过滤文章", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    await user.type(screen.getByRole("searchbox", { name: "搜索标题、摘要或作者" }), "Vite");

    expect(screen.getByText("共 1 条")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vite 管理后台的主题方案" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "React Query 与后台表格状态" }),
    ).not.toBeInTheDocument();
  });

  it("可通过表头切换更新时间排序", async () => {
    const user = userEvent.setup();
    renderArticlesPage();

    await user.click(screen.getByRole("button", { name: "更新时间排序：降序" }));

    const articleLinks = within(screen.getByRole("grid", { name: "文章列表" })).getAllByRole(
      "link",
    );
    expect(screen.getByRole("button", { name: "更新时间排序：升序" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(articleLinks[0]).toHaveTextContent("旧友链清理记录");
  });
});
