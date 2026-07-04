import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUserOperationLogs } from "../hooks/use-user-operation-logs";
import { UserOperationLogList } from "./UserOperationLogList";

vi.mock("../hooks/use-user-operation-logs", () => ({
  getActionLabel: (action: string) => (action === "grant_vip" ? "授予 VIP" : action),
  useUserOperationLogs: vi.fn(),
}));

const setPage = vi.fn();

describe("UserOperationLogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserOperationLogs).mockReturnValue({
      items: [
        {
          id: 1,
          operator_id: 2,
          action: "grant_vip",
          created_at: "2026-07-04T00:00:00Z",
        },
      ],
      total: 11,
      page: 1,
      setPage,
      isLoading: false,
      error: null,
    });
  });

  it("展示日志并支持分页", async () => {
    const user = userEvent.setup();
    render(<UserOperationLogList userId={7} />);

    expect(screen.getByText("授予 VIP")).toBeInTheDocument();
    expect(screen.getByText(/操作人 #2/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
