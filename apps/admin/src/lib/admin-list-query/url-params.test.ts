import { describe, expect, it } from "vitest";
import { createClientTableQueryCodec } from "./client-table-query";
import {
  parseListPage,
  parseListSearch,
  parseListSort,
  writeListPage,
  writeListSearch,
  writeListSort,
  writeStringFilter,
} from "./url-params";

describe("admin-list-query url-params", () => {
  it("parse/write 分页与搜索", () => {
    const params = new URLSearchParams();
    writeListPage(params, 2);
    writeListSearch(params, "Go");

    expect(params.toString()).toBe("page=2&q=Go");
    expect(parseListPage(params)).toBe(2);
    expect(parseListSearch(params)).toBe("Go");
  });

  it("parseListSort 校验列名与排序方向", () => {
    const params = new URLSearchParams("sort=status&order=asc");
    expect(parseListSort(params, ["status", "createdAt"])).toEqual({
      column: "status",
      direction: "ascending",
    });
  });

  it("writeListSort 省略默认排序", () => {
    const params = new URLSearchParams();
    writeListSort(
      params,
      { column: "seq", direction: "ascending" },
      {
        column: "seq",
        direction: "ascending",
      },
    );
    expect(params.toString()).toBe("");
  });

  it("writeStringFilter 省略默认值", () => {
    const params = new URLSearchParams();
    writeStringFilter(params, "status", "all", "all");
    writeStringFilter(params, "status", "hidden", "all");
    expect(params.get("status")).toBe("hidden");
  });
});

describe("createClientTableQueryCodec", () => {
  const codec = createClientTableQueryCodec({
    defaultState: {
      searchValue: "",
      filters: { status: "all" },
      sort: { column: "seq", direction: "ascending" },
    },
    sortColumns: ["seq", "name"],
  });

  it("往返客户端表格状态", () => {
    const params = codec.write({
      searchValue: "Go",
      filters: { status: "hidden" },
      sort: { column: "name", direction: "descending" },
    });

    expect(codec.parse(params)).toEqual({
      searchValue: "Go",
      filters: { status: "hidden" },
      sort: { column: "name", direction: "descending" },
    });
    expect(codec.hasActive(codec.parse(params))).toBe(true);
  });
});
