import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { MomentPageResp } from "@repo/api";
import { MomentsListLoader } from "./moments-list-loader";

vi.mock("./moments-list", () => ({
  MomentsList: () => <div data-testid="moments-list">列表</div>,
  getMomentColumnCount: vi.fn(),
}));

vi.mock("./moments-list-fallback", () => ({
  MomentsListFallback: () => <div data-testid="moments-fallback">占位</div>,
}));

const EMPTY_PAGE: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 20,
  list: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("MomentsListLoader", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<MomentsListLoader initialPage={EMPTY_PAGE} />)).not.toThrow();
  });

  it("客户端挂载后显示 MomentsList", async () => {
    render(<MomentsListLoader initialPage={EMPTY_PAGE} />);
    await waitFor(() => {
      expect(screen.getByTestId("moments-list")).toBeTruthy();
    });
  });
});
