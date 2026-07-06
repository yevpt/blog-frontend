import { describe, expect, it } from "vitest";
import {
  createCategoryAssetFromUpload,
  createCategoryAssetFromUrl,
  createEmptyCategoryForm,
  EMPTY_CATEGORY_ASSET,
  filterAndSortCategoryRows,
  isCategoryArticleAddCandidate,
  mapAdminArticleToCategoryArticleRow,
  mapCategoryToFormValues,
  mapCategoryToRow,
  matchCategorySearch,
  suggestNextSeq,
  toCategoryCreateReq,
  toCategoryUpdateReq,
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
      icon: createCategoryAssetFromUrl("https://cdn.example.com/icon.svg"),
      description: "编程学习与工程实践",
      coverImgUrl: createCategoryAssetFromUrl("https://cdn.example.com/cover.jpg"),
      dirty: { description: false, icon: false, coverImgUrl: false },
    });
  });

  it("suggestNextSeq 取最大 seq + 1", () => {
    expect(
      suggestNextSeq([
        { ...sample, seq: 0 },
        { ...sample, id: 2, seq: 3 },
      ]),
    ).toBe(4);
    expect(suggestNextSeq([])).toBe(0);
  });

  it("validateCategoryForm 空描述不产生校验错误", () => {
    const errors = validateCategoryForm(createEmptyCategoryForm());
    expect(errors.name).toBeTruthy();
    expect(errors.description).toBeUndefined();
    expect(errors.icon).toBeUndefined();
    expect(errors.coverImgUrl).toBeUndefined();
  });

  it("toCategoryCreateReq 省略三个空可选字段", () => {
    expect(
      toCategoryCreateReq({
        name: "编程",
        url: "programming",
        seq: "2",
        icon: EMPTY_CATEGORY_ASSET,
        description: "",
        coverImgUrl: EMPTY_CATEGORY_ASSET,
        dirty: { description: false, icon: false, coverImgUrl: false },
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      seq: 2,
    });
  });

  it("toCategoryCreateReq 保留已填写的可选字段", () => {
    expect(
      toCategoryCreateReq({
        name: " 编程 ",
        url: "programming",
        seq: "2",
        icon: createCategoryAssetFromUpload("tmp/icon.svg", "https://cdn.example.com/icon.svg"),
        description: "desc",
        coverImgUrl: createCategoryAssetFromUpload(
          "tmp/cover.jpg",
          "https://cdn.example.com/cover.jpg",
        ),
        dirty: { description: false, icon: true, coverImgUrl: true },
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      icon: "tmp/icon.svg",
      description: "desc",
      cover_img_url: "tmp/cover.jpg",
      seq: 2,
    });
  });

  it("toCategoryUpdateReq 未改动素材时省略字段", () => {
    const values = mapCategoryToFormValues(sample);
    expect(toCategoryUpdateReq(values)).toEqual({
      name: "编程",
      url: "programming",
      description: "编程学习与工程实践",
      seq: 0,
    });
  });

  it("toCategoryUpdateReq 主动清空素材与描述时传空字符串", () => {
    const values = mapCategoryToFormValues(sample);
    expect(
      toCategoryUpdateReq({
        ...values,
        description: "",
        icon: EMPTY_CATEGORY_ASSET,
        coverImgUrl: EMPTY_CATEGORY_ASSET,
        dirty: { description: true, icon: true, coverImgUrl: true },
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      description: "",
      icon: "",
      cover_img_url: "",
      seq: 0,
    });
  });

  it("toCategoryUpdateReq 保存新上传素材引用", () => {
    const values = mapCategoryToFormValues(sample);
    expect(
      toCategoryUpdateReq({
        ...values,
        icon: createCategoryAssetFromUpload("tmp/new.svg", "https://cdn.example.com/new.svg"),
        coverImgUrl: createCategoryAssetFromUpload(
          "tmp/new.jpg",
          "https://cdn.example.com/new.jpg",
        ),
        dirty: { description: false, icon: true, coverImgUrl: true },
      }),
    ).toEqual({
      name: "编程",
      url: "programming",
      description: "编程学习与工程实践",
      icon: "tmp/new.svg",
      cover_img_url: "tmp/new.jpg",
      seq: 0,
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

    expect(isCategoryArticleAddCandidate({ ...base, category: { id: 1, name: "A" } }, 1)).toBe(
      false,
    );
    expect(isCategoryArticleAddCandidate({ ...base, category: { id: 2, name: "B" } }, 1)).toBe(
      true,
    );
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
