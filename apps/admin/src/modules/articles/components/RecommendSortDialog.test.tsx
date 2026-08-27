import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { apiClient } from "../../../lib/api";
import { RecommendSortDialog } from "./RecommendSortDialog";

vi.mock("../../../lib/api", () => ({
  apiClient: {
    articles: {
      listRecommendedAdmin: vi.fn(),
      reorderRecommendedAdmin: vi.fn(),
    },
  },
}));

describe("RecommendSortDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.articles.listRecommendedAdmin).mockResolvedValue({ list: [] });
  });

  it("使用统一弹窗骨架展示空状态", async () => {
    render(<RecommendSortDialog open onClose={vi.fn()} />);

    expect(screen.getByText("首页推荐")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭推荐排序" })).toBeInTheDocument();
    expect(await screen.findByText("还没有推荐文章")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存排序" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});
