// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { TagItemResp } from "@repo/api";
import TagsPageRoute from "./page";

const mockListTags = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn(async () => ({
    tags: {
      list: mockListTags,
    },
  })),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/tags", () => ({
  TagsPage: ({ tags }: { tags: TagItemResp[] }) => (
    <main data-testid="tags-page">
      {tags.map((t) => (
        <span key={t.id}>{t.name}</span>
      ))}
    </main>
  ),
}));

describe("TagsPageRoute", () => {
  beforeEach(() => {
    mockListTags.mockReset();
  });

  it("渲染并传入标签数据", async () => {
    mockListTags.mockResolvedValue({
      list: [
        { id: 1, name: "Go", seq: 0, article_count: 3 },
        { id: 2, name: "React", seq: 1, article_count: 25 },
      ],
    });

    const element = await TagsPageRoute();
    render(element);

    expect(screen.getByTestId("tags-page")).toBeTruthy();
    expect(screen.getByText("Go")).toBeTruthy();
    expect(screen.getByText("React")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    mockListTags.mockRejectedValueOnce(new Error("network error"));

    const element = await TagsPageRoute();
    render(element);

    expect(screen.getByTestId("tags-page")).toBeTruthy();
    expect(screen.queryByText("Go")).toBeNull();
  });
});
