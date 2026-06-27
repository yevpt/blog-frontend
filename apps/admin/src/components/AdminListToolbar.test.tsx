import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminListToolbar } from "./AdminListToolbar";

describe("AdminListToolbar", () => {
  it("渲染搜索框并在有筛选时展示清除按钮", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <AdminListToolbar
        searchLabel="搜索文章"
        searchPlaceholder="搜索…"
        searchValue="Go"
        onSearchChange={vi.fn()}
        canClear
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
