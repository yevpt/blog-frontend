import { describe, expect, it } from "vitest";
import {
  createEmptyTagForm,
  filterAndSortTagRows,
  mapTagToFormValues,
  mapTagToRow,
  matchTagSearch,
  suggestNextSeq,
  toTagBasicUpdateReq,
  toTagCreateReq,
  validateTagForm,
} from "./model";

describe("tags model", () => {
  const sample: Parameters<typeof mapTagToRow>[0] = {
    id: 1,
    name: "Go",
    url: "go",
    icon: "icons/go.svg",
    description: "Go 语言相关内容",
    cover_img_url: "covers/go.jpg",
    seq: 0,
    article_count: 12,
  };

  it("mapTagToRow 映射展示字段", () => {
    expect(mapTagToRow(sample)).toEqual({
      id: "1",
      name: "Go",
      url: "go",
      icon: "icons/go.svg",
      description: "Go 语言相关内容",
      coverImgUrl: "covers/go.jpg",
      seq: 0,
      articleCount: 12,
    });
  });

  it("mapTagToFormValues 回填表单", () => {
    expect(mapTagToFormValues(sample)).toEqual({
      name: "Go",
      url: "go",
      seq: "0",
      icon: "icons/go.svg",
      description: "Go 语言相关内容",
      coverImgUrl: "covers/go.jpg",
    });
  });

  it("suggestNextSeq 取最大 seq + 1", () => {
    expect(suggestNextSeq([{ ...sample, seq: 0 }, { ...sample, id: 2, seq: 3 }])).toBe(4);
    expect(suggestNextSeq([])).toBe(0);
  });

  it("validateTagForm 仅校验名称与排序", () => {
    const errors = validateTagForm(createEmptyTagForm());
    expect(errors.name).toBeTruthy();
    expect(errors.seq).toBeUndefined();

    const invalidSeq = validateTagForm({ ...createEmptyTagForm(), name: "Go", seq: "-1" });
    expect(invalidSeq.seq).toBeTruthy();
    expect(invalidSeq.icon).toBeUndefined();
    expect(invalidSeq.description).toBeUndefined();
  });

  it("toTagCreateReq 省略空的可选字段", () => {
    expect(
      toTagCreateReq({
        name: "Go",
        url: "",
        seq: "2",
        icon: "",
        description: "",
        coverImgUrl: "",
      }),
    ).toEqual({
      name: "Go",
      seq: 2,
    });
  });

  it("toTagBasicUpdateReq 仅提交基础字段", () => {
    expect(
      toTagBasicUpdateReq({
        name: "Go",
        url: "go",
        seq: "1",
        icon: "",
        description: "",
        coverImgUrl: "",
      }),
    ).toEqual({
      name: "Go",
      url: "go",
      seq: 1,
    });
  });

  it("filterAndSortTagRows 支持搜索与排序", () => {
    const rows = [
      mapTagToRow({ ...sample, id: 1, name: "Go", url: "go", seq: 1, article_count: 2 }),
      mapTagToRow({ ...sample, id: 2, name: "Rust", url: "rust", seq: 0, article_count: 5 }),
    ];

    expect(
      filterAndSortTagRows(rows, {
        searchValue: "go",
        filters: {},
        sort: { column: "seq", direction: "ascending" },
      }),
    ).toHaveLength(1);

    expect(
      filterAndSortTagRows(rows, {
        searchValue: "",
        filters: {},
        sort: { column: "articleCount", direction: "descending" },
      }).map((row) => row.name),
    ).toEqual(["Rust", "Go"]);
  });

  it("matchTagSearch 支持名称与别名", () => {
    const row = mapTagToRow(sample);
    expect(matchTagSearch(row, "go")).toBe(true);
    expect(matchTagSearch(row, "rust")).toBe(false);
  });
});
