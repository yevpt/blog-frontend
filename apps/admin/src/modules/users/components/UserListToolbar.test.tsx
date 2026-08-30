import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserListToolbar } from "./UserListToolbar";

describe("UserListToolbar", () => {
  it("渲染角色和账号状态筛选并回传变更", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const filters = { keyword: "", role: "all", status: "all" };

    render(<UserListToolbar filters={filters} onFiltersChange={onFiltersChange} />);

    expect(screen.getByRole("button", { name: /筛选角色/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /筛选账号状态/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /筛选角色/ }));
    await user.click(screen.getByRole("option", { name: "管理员" }));

    const updater = onFiltersChange.mock.calls[0]?.[0] as
      ((previous: typeof filters) => typeof filters) | undefined;
    expect(updater?.(filters)).toEqual({ ...filters, role: "ROLE_ADMIN" });
  });
});
