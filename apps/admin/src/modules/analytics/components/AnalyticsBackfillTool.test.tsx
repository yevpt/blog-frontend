import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { toastQueue } from "../../../lib/toast";
import { AnalyticsBackfillTool } from "./AnalyticsBackfillTool";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    analytics: {
      backfill: vi.fn(),
    },
  },
}));

describe("AnalyticsBackfillTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    vi.mocked(apiClient.analytics.backfill).mockResolvedValue({
      from: "2026-06-20",
      to: "2026-06-26",
      days: 7,
    });
  });

  it("使用传入范围触发回填并展示结果", async () => {
    const user = userEvent.setup();

    render(
      <>
        <AnalyticsBackfillTool range={{ from: "2026-06-20", to: "2026-06-26" }} />
        <ToastRegion queue={toastQueue} />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "执行回填" }));

    await waitFor(() => {
      expect(apiClient.analytics.backfill).toHaveBeenCalledWith({
        from: "2026-06-20",
        to: "2026-06-26",
      });
    });
    expect(await screen.findByText("已完成 7 天：2026-06-20 至 2026-06-26")).toBeInTheDocument();
  });

  it("跨度超过 92 天时不请求接口", async () => {
    const user = userEvent.setup();

    render(<AnalyticsBackfillTool range={{ from: "2026-01-01", to: "2026-04-03" }} />);

    await user.click(screen.getByRole("button", { name: "执行回填" }));

    expect(apiClient.analytics.backfill).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("回填跨度不能超过 92 天");
  });
});
