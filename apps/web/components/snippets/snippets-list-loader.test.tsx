import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { MomentPageResp } from "@repo/api";
import { SnippetsListLoader } from "./snippets-list-loader";

vi.mock("./snippets-list", () => ({
  SnippetsList: () => <div data-testid="snippets-list">列表</div>,
  getSnippetColumnCount: vi.fn(),
}));

vi.mock("./snippets-list-fallback", () => ({
  SnippetsListFallback: () => <div data-testid="snippets-fallback">占位</div>,
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

describe("SnippetsListLoader", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<SnippetsListLoader initialPage={EMPTY_PAGE} />)).not.toThrow();
  });

  it("客户端挂载后显示 SnippetsList", async () => {
    render(<SnippetsListLoader initialPage={EMPTY_PAGE} />);
    await waitFor(() => {
      expect(screen.getByTestId("snippets-list")).toBeTruthy();
    });
  });
});
