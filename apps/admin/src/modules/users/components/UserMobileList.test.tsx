import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMobileList } from "./UserMobileList";
import type { UserRow } from "../model";

const userRow: UserRow = {
  id: "7",
  username: "vpt",
  displayName: "VPT",
  email: "vpt@example.com",
  roles: ["ROLE_ADMIN"],
  isVip: false,
  isAdmin: true,
  isOnline: true,
  accountStatus: "disabled",
  sanctionState: "muted",
  lastActiveAt: "2026/06/26 16:00",
  registerAt: "2026/01/01 08:00",
};

describe("UserMobileList", () => {
  it("展示账号与内容状态，并从详情按钮回传用户", async () => {
    const onViewDetail = vi.fn();
    const user = userEvent.setup();

    render(
      <UserMobileList
        items={[userRow]}
        isLoading={false}
        emptyState={{ title: "暂无用户" }}
        onViewDetail={onViewDetail}
      />,
    );

    expect(screen.getByText("已禁用")).toBeInTheDocument();
    expect(screen.getByText("禁言")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看详情" }));
    expect(onViewDetail).toHaveBeenCalledWith(userRow);
  });
});
