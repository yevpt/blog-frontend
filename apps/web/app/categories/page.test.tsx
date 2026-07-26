// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { CategoryTabItem } from "@repo/api";
import CategoriesPageRoute from "./page";

const mockListTabs = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn(async () => ({
    categories: {
      listTabs: mockListTabs,
    },
  })),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/categories", () => ({
  CategoriesPage: ({ categories }: { categories: CategoryTabItem[] }) => (
    <main data-testid="categories-page">
      {categories.map((c) => (
        <span key={c.id}>{c.name}</span>
      ))}
    </main>
  ),
}));

describe("CategoriesPageRoute", () => {
  beforeEach(() => {
    mockListTabs.mockReset();
  });

  it("渲染并传入分类数据", async () => {
    mockListTabs.mockResolvedValue({
      list: [
        { id: 1, name: "编程", seq: 0, article_count: 12 },
        { id: 2, name: "文学", seq: 1, article_count: 8 },
      ],
    });

    const element = await CategoriesPageRoute();
    render(element);

    expect(screen.getByTestId("categories-page")).toBeTruthy();
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByText("文学")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    mockListTabs.mockRejectedValueOnce(new Error("network error"));

    const element = await CategoriesPageRoute();
    render(element);

    expect(screen.getByTestId("categories-page")).toBeTruthy();
    expect(screen.queryByText("编程")).toBeNull();
  });
});
