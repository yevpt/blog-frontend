import { describe, expect, it } from "vitest";
import {
  createEmptyCategoryForm,
  filterAndSortCategoryRows,
  isCategoryArticleAddCandidate,
  mapAdminArticleToCategoryArticleRow,
  mapCategoryToFormValues,
  mapCategoryToRow,
  matchCategorySearch,
  suggestNextSeq,
  toCategoryCreateReq,
  validateCategoryForm,
} from "./model";

describe("categories model", () => {
  const sample: Parameters<typeof mapCategoryToRow>[0] = {
    id: 1,
    name: "编程",
    url: "programming",
    icon: "https://cdn.example.com/icon.svg",
    description: "编程学习与工程实践",
    cover_img_url: "https://cdn.example.com/cover.jpg",
    seq: 0,
    article_count: 12,
  };

  it("mapCategoryToRow 映射展示字段", () => {
    expect(mapCategoryToRow(sample)).toEqual({
      id: "1",
      name: "编程",
      url: "programming",
      icon: "https://cdn.example.com/icon.svg",
      description: "编程学习与工程实践",
      coverImgUrl: "https://cdn.example.com/cover.jpg",
      seq: 0,
      articleCount: 12,
    });
  });

  it("mapCategoryToFormValues 回填表单", () => {
    expect(mapCategoryToFormValues(sample)).toEqual({
      name: "编程",
      url: "programming",
      seq: "0",
      icon: "https://cdn.example.com/icon.svg",
      description: "编程学习与工程实践",
      coverImgUrl: "https://cdn.example.com/cover.jpg",
    });
  });

  it("suggestNextSeq 取最大 seq + 1", () => {
    expect(suggestNextSeq([{ ...sample, seq: 0 }, { ...sample, id: 2, seq: 3 }])).toBe(4);
    expect(suggestNextSeq([])).toBe(0);
  });

  it("validateCategoryForm 仅校验名称、排序与描述", () => {
    const errors = validateCategoryForm(createEmptyCategoryForm());
    expect(errors.name).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.icon).toBeUndefined();
    expect(errors.coverImgUrl).toBeUndefined();
  });

  it("toCategoryCreateReq 省略空的图标与封面", () => {
    expect(
      toCategoryCreateReq({
        name: "编程",
        url: "programming",
        seq: "2",
        icon: "",
        description: "desc",
        coverImgUrl: "",
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      description: "desc",
      seq: 2,
    });
  });

  it("toCategoryCreateReq 保留已填写的图标与封面", () => {
    expect(
      toCategoryCreateReq({
        name: " 编程 ",
        url: "programming",
        seq: "2",
        icon: "icon.svg",
        description: "desc",
        coverImgUrl: "cover.jpg",
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      icon: "icon.svg",
      description: "desc",
      cover_img_url: "cover.jpg",
      seq: 2,
    });
  });

  it("mapAdminArticleToCategoryArticleRow 映射文章行", () => {
    expect(
      mapAdminArticleToCategoryArticleRow({
        id: 5,
        title: "标题",
        short_content: "摘要",
        user_id: 1,
        status: 1,
        comment_status: 1,
        read_count: 0,
        like_count: 0,
        is_liked: false,
        comment_count: 0,
        is_recommended: false,
        created_at: "",
        updated_at: "",
      }),
    ).toEqual({
      id: "5",
      title: "标题",
      excerpt: "摘要",
    });
  });

  it("mapAdminArticleToCategoryArticleRow 标记其他分类", () => {
    expect(
      mapAdminArticleToCategoryArticleRow(
        {
          id: 5,
          title: "标题",
          user_id: 1,
          status: 1,
          comment_status: 1,
          read_count: 0,
          like_count: 0,
          is_liked: false,
          comment_count: 0,
          is_recommended: false,
          category: { id: 2, name: "前端" },
          created_at: "",
          updated_at: "",
        },
        1,
      ).otherCategory,
    ).toBe("前端");
  });

  it("isCategoryArticleAddCandidate 排除已删除与当前分类", () => {
    const base = {
      id: 1,
      title: "t",
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      is_liked: false,
      comment_count: 0,
      is_recommended: false,
      created_at: "",
      updated_at: "",
    };

    expect(
      isCategoryArticleAddCandidate({ ...base, category: { id: 1, name: "A" } }, 1),
    ).toBe(false);
    expect(
      isCategoryArticleAddCandidate({ ...base, category: { id: 2, name: "B" } }, 1),
    ).toBe(true);
    expect(
      isCategoryArticleAddCandidate(
        { ...base, deleted_at: "2024-01-01", category: { id: 2, name: "B" } },
        1,
      ),
    ).toBe(false);
  });

  it("matchCategorySearch 支持名称、别名与描述", () => {
    const row = mapCategoryToRow(sample);
    expect(matchCategorySearch(row, "编程")).toBe(true);
    expect(matchCategorySearch(row, "programming")).toBe(true);
    expect(matchCategorySearch(row, "工程实践")).toBe(true);
    expect(matchCategorySearch(row, "不存在")).toBe(false);
  });

  it("filterAndSortCategoryRows 按 seq 升序排序", () => {
    const rows = [
      mapCategoryToRow({ ...sample, id: 1, seq: 2 }),
      mapCategoryToRow({ ...sample, id: 2, seq: 0 }),
    ];
    const result = filterAndSortCategoryRows(rows, {
      searchValue: "",
      filters: {},
      sort: { column: "seq", direction: "ascending" },
    });
    expect(result.map((row) => row.seq)).toEqual([0, 2]);
  });
});
