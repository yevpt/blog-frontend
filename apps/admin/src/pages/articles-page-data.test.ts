import { describe, expect, it } from "vitest";
import type { AdminArticleListItemResp } from "@repo/api";
import {
  buildIdFilterOptions,
  mapAdminArticleToRow,
  parseOptionalIdFilter,
  toArticleListSortBy,
  toArticleListSortOrder,
} from "./articles-page-data";

function createArticle(
  overrides: Partial<AdminArticleListItemResp> = {},
): AdminArticleListItemResp {
  return {
    id: 1,
    title: "测试文章",
    short_content: "摘要内容",
    user_id: 2,
    status: 1,
    comment_status: 1,
    read_count: 0,
    like_count: 0,
    is_liked: false,
    comment_count: 0,
    is_recommended: true,
    category: { id: 3, name: "工程" },
    user: { id: 2, username: "vpt", nickname: "博主" },
    created_at: "2026-06-16T08:00:00Z",
    updated_at: "2026-06-16T10:00:00Z",
    ...overrides,
  };
}

describe("articles-page-data helpers", () => {
  it("buildIdFilterOptions 生成带全部选项的 id 列表", () => {
    expect(buildIdFilterOptions([{ id: 2, name: "前端" }])).toEqual([
      { value: "all", label: "全部" },
      { value: "2", label: "前端" },
    ]);
  });

  it("parseOptionalIdFilter 解析分类 id", () => {
    expect(parseOptionalIdFilter("all")).toBeUndefined();
    expect(parseOptionalIdFilter("3")).toBe(3);
  });

  it("排序字段映射到后端 sort_by / sort_order", () => {
    expect(toArticleListSortBy("createdAt")).toBe("created_at");
    expect(toArticleListSortBy("pinned")).toBe("recommended");
    expect(toArticleListSortOrder("ascending")).toBe("asc");
    expect(toArticleListSortOrder("descending")).toBe("desc");
  });
});

describe("mapAdminArticleToRow", () => {
  it("映射公开文章的基础字段", () => {
    const row = mapAdminArticleToRow(createArticle());

    expect(row).toMatchObject({
      id: "1",
      title: "测试文章",
      excerpt: "摘要内容",
      status: "published",
      category: "工程",
      isPinned: true,
    });
    expect(row.createdAt).toMatch(/2026/);
    expect(row.updatedAt).toMatch(/2026/);
  });

  it("软删除文章映射为 archived", () => {
    const row = mapAdminArticleToRow(
      createArticle({ deleted_at: "2026-06-17T00:00:00Z", status: 1 }),
    );

    expect(row.status).toBe("archived");
  });

  it("隐藏与加密状态分别映射", () => {
    expect(mapAdminArticleToRow(createArticle({ status: 0 })).status).toBe("hidden");
    expect(mapAdminArticleToRow(createArticle({ status: 2 })).status).toBe("encrypted");
  });
});
