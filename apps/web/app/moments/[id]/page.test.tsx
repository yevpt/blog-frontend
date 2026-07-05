import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MomentItemResp } from "@repo/api";
import MomentDetailPage, { generateMetadata } from "./page";

const mockState = vi.hoisted(() => ({
  getDetail: vi.fn(),
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    moments: { getDetail: mockState.getDetail },
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("@/components/moments/moment-detail", () => ({
  MomentDetail: ({ initialMoment }: { initialMoment: MomentItemResp }) => (
    <div data-testid="moment-detail">{initialMoment.content}</div>
  ),
}));

vi.mock("@/components/moments/moment-comments", () => ({
  MomentComments: ({ momentId, commentCount }: { momentId: number; commentCount: number }) => (
    <div data-testid="moment-comments">
      {momentId}-{commentCount}
    </div>
  ),
}));

const mockMoment: MomentItemResp = {
  id: 1,
  user_id: 1,
  content: "今天的风很温柔",
  status: 1,
  comment_status: 1,
  read_count: 20,
  is_top: false,
  like_count: 3,
  comment_count: 2,
  is_liked: false,
  images: [],
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

describe("MomentDetailPage", () => {
  beforeEach(() => {
    mockState.getDetail.mockReset();
  });

  it("渲染碎语内容与评论区", async () => {
    mockState.getDetail.mockResolvedValue(mockMoment);
    render(await MomentDetailPage({ params: Promise.resolve({ id: "1" }) }));
    expect(screen.getByTestId("moment-detail")).toHaveTextContent("今天的风很温柔");
    expect(screen.getByTestId("moment-comments")).toHaveTextContent("1-2");
  });

  it("id 不是正整数时 404", async () => {
    await expect(MomentDetailPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(mockState.getDetail).not.toHaveBeenCalled();
  });

  it("getDetail 抛错时 404", async () => {
    mockState.getDetail.mockRejectedValue(new Error("not found"));
    await expect(MomentDetailPage({ params: Promise.resolve({ id: "999" }) })).rejects.toThrow(
      "NOT_FOUND",
    );
  });

  it("metadata 使用碎语正文生成标题", async () => {
    mockState.getDetail.mockResolvedValue(mockMoment);
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("今天的风很温柔 | Yevpt's Blog");
  });

  it("metadata 正文超长时截断并加省略号", async () => {
    const longContent = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十";
    mockState.getDetail.mockResolvedValue({ ...mockMoment, content: longContent });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe(`${longContent.slice(0, 30)}… | Yevpt's Blog`);
  });

  it("metadata 无正文（纯图片）时使用兜底标题", async () => {
    mockState.getDetail.mockResolvedValue({ ...mockMoment, content: "" });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("碎语 | Yevpt's Blog");
  });

  it("metadata 取第一张原图作为 openGraph 封面", async () => {
    mockState.getDetail.mockResolvedValue({
      ...mockMoment,
      images: [
        {
          id: 1,
          name: "a.jpg",
          file_type: "jpg",
          url: "a.jpg",
          access_url: "https://cdn/a.jpg",
          display_mode: "blurred",
          size: 1,
          seq: 1,
        },
        {
          id: 2,
          name: "b.jpg",
          file_type: "jpg",
          url: "b.jpg",
          access_url: "https://cdn/b.jpg",
          display_mode: "original",
          size: 1,
          seq: 2,
        },
      ],
    });
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.openGraph?.images).toEqual(["https://cdn/b.jpg"]);
  });

  it("getDetail 失败时 metadata 兜底标题", async () => {
    mockState.getDetail.mockRejectedValue(new Error("fail"));
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });
    expect(metadata.title).toBe("碎语 | Yevpt's Blog");
  });
});
