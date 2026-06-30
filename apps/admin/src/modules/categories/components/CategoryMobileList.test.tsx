import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryMobileList } from "./CategoryMobileList";
import type { CategoryRow } from "../model";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const rows: CategoryRow[] = [
  {
    id: "1",
    name: "文学",
    url: "literature",
    description: "散文与诗歌",
    seq: 0,
    articleCount: 10,
  },
];

describe("CategoryMobileList", () => {
  it("渲染分类行与元信息", () => {
    render(
      <CategoryMobileList
        items={rows}
        onManageArticles={() => {}}
        onEdit={() => {}}
        deletingCategoryId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    expect(screen.getByText("文学")).toBeInTheDocument();
    expect(screen.getByText(/\/literature · 10 篇/)).toBeInTheDocument();
    expect(screen.getByText("散文与诗歌")).toBeInTheDocument();
  });

  it("空列表时展示空态", () => {
    render(
      <CategoryMobileList
        items={[]}
        emptyState={{ icon: "folder", title: "还没有分类", description: "先创建一个吧" }}
        onManageArticles={() => {}}
        onEdit={() => {}}
        deletingCategoryId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    expect(screen.getByText("还没有分类")).toBeInTheDocument();
  });

  it("点击管理文章触发回调", async () => {
    const user = userEvent.setup();
    const onManageArticles = vi.fn();

    render(
      <CategoryMobileList
        items={rows}
        onManageArticles={onManageArticles}
        onEdit={() => {}}
        deletingCategoryId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "管理文章" }));
    expect(onManageArticles).toHaveBeenCalledWith(rows[0]);
  });
});
