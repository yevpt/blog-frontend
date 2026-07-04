import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminOperationLogPageResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { getActionLabel, useUserOperationLogs } from "./use-user-operation-logs";

vi.mock("../../../lib/api", () => ({
  apiClient: { users: { getOperationLogs: vi.fn() } },
}));

const page: AdminOperationLogPageResp = {
  total: 11,
  pages: 2,
  page: 1,
  page_size: 10,
  list: [
    {
      id: 1,
      operator_id: 2,
      action: "grant_vip",
      created_at: "2026-07-04T00:00:00Z",
    },
  ],
};

describe("useUserOperationLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.getOperationLogs).mockResolvedValue(page);
  });

  it("加载操作日志并映射操作文案", async () => {
    const { result } = renderHook(() => useUserOperationLogs(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(apiClient.users.getOperationLogs).toHaveBeenCalledWith(7, {
      page: 1,
      page_size: 10,
    });
    expect(result.current.items).toHaveLength(1);
    expect(getActionLabel("grant_vip")).toBe("授予 VIP");
    expect(getActionLabel("unknown")).toBe("unknown");
  });

  it("页码变化后重新请求", async () => {
    const { result } = renderHook(() => useUserOperationLogs(7));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() => {
      expect(apiClient.users.getOperationLogs).toHaveBeenLastCalledWith(7, {
        page: 2,
        page_size: 10,
      });
    });
  });
});
