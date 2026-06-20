// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { GuestbookPageResp } from "@repo/api";

const emptyPage: GuestbookPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

const page2: GuestbookPageResp = {
  total: 15,
  pages: 2,
  page: 2,
  page_size: 10,
  list: [],
};

const mockList = vi.fn().mockResolvedValue(emptyPage);

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn().mockResolvedValue({
    guestbook: {
      list: mockList,
    },
  }),
}));

vi.mock("@/components/guestbook", () => ({
  GuestbookPage: ({ initialPage }: { initialPage: GuestbookPageResp }) => (
    <main data-testid="guestbook-page">
      <span>{initialPage.total} 条留言</span>
    </main>
  ),
}));

describe("GuestbookPageRoute", () => {
  it("渲染不崩溃并传入 initialPage", async () => {
    mockList.mockResolvedValueOnce(emptyPage);
    const { default: GuestbookPageRoute } = await import("./page");
    const element = await GuestbookPageRoute({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByTestId("guestbook-page")).toBeTruthy();
    expect(screen.getByText("0 条留言")).toBeTruthy();
  });

  it("按 searchParams.page 请求对应页数据", async () => {
    mockList.mockResolvedValueOnce(page2);
    const { default: GuestbookPageRoute } = await import("./page");
    const element = await GuestbookPageRoute({ searchParams: Promise.resolve({ page: "2" }) });
    render(element);
    expect(mockList).toHaveBeenCalledWith({ page: 2, page_size: 10 });
    expect(screen.getByText("15 条留言")).toBeTruthy();
  });
});
