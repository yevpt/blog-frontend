import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagMobileList } from "./TagMobileList";
import type { TagRow } from "../model";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const rows: TagRow[] = [
  { id: "1", name: "Go", url: "go", seq: 0, articleCount: 12 },
  { id: "2", name: "Rust", seq: 1, articleCount: 0 },
];

describe("TagMobileList", () => {
  it("渲染标签行与元信息", () => {
    render(
      <TagMobileList
        items={rows}
        onEdit={() => {}}
        deletingTagId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText(/\/go · 12 篇/)).toBeInTheDocument();
    expect(screen.getByText(/未设置别名 · 0 篇/)).toBeInTheDocument();
  });

  it("空列表时展示空态", () => {
    render(
      <TagMobileList
        items={[]}
        emptyState={{ icon: "tag", title: "还没有标签", description: "先创建一个吧" }}
        onEdit={() => {}}
        deletingTagId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    expect(screen.getByText("还没有标签")).toBeInTheDocument();
  });

  it("点击编辑触发回调", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <TagMobileList
        items={rows}
        onEdit={onEdit}
        deletingTagId={null}
        onConfirmDelete={async () => {}}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);

    expect(onEdit).toHaveBeenCalledWith(rows[0]);
  });
});
