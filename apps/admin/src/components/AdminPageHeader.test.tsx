import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@repo/ui";
import { AdminPageHeader } from "./AdminPageHeader";

describe("AdminPageHeader", () => {
  it("用统一结构渲染标题、说明与操作区", () => {
    render(
      <AdminPageHeader
        title="文章管理"
        description="集中查看文章、按表头筛选排序。"
        action={<Button>新建文章</Button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "文章管理" })).toBeInTheDocument();
    expect(screen.getByText("集中查看文章、按表头筛选排序。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建文章" })).toBeInTheDocument();
    expect(screen.getByRole("banner", { name: "文章管理页头" })).toHaveClass(
      "grid",
      "gap-3",
      "xl:grid-cols-[minmax(0,1fr)_auto]",
    );
    expect(screen.getByText("文章管理").parentElement).toHaveClass("pr-14", "lg:pr-0");
  });
});
