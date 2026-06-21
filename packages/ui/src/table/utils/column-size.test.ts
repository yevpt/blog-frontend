import { describe, it, expect } from "vitest";
import { getMinTableWidth, toCssMinWidth, toCssWidth } from "./column-size";
import type { DataTableColumn } from "../types";

describe("toCssWidth", () => {
  it("数字与纯数字串转成 px", () => {
    expect(toCssWidth(120)).toBe("120px");
    expect(toCssWidth("130")).toBe("130px");
  });

  it("百分比原样保留", () => {
    expect(toCssWidth("50%")).toBe("50%");
  });

  it("弹性单位转成 auto（吸收剩余空间）", () => {
    expect(toCssWidth("1fr")).toBe("auto");
    expect(toCssWidth("2fr")).toBe("auto");
  });

  it("未指定返回 undefined", () => {
    expect(toCssWidth(undefined)).toBeUndefined();
  });
});

describe("toCssMinWidth", () => {
  it("数字转 px、百分比保留", () => {
    expect(toCssMinWidth(360)).toBe("360px");
    expect(toCssMinWidth("20%")).toBe("20%");
    expect(toCssMinWidth(undefined)).toBeUndefined();
  });
});

describe("getMinTableWidth", () => {
  it("固定列取宽度、弹性列取 minWidth 累加", () => {
    const columns = [
      { id: "title", header: "标题", cell: () => null, width: "1fr", minWidth: 360 },
      { id: "status", header: "状态", cell: () => null, width: 120 },
      { id: "actions", header: "操作", cell: () => null, width: 80 },
    ] as Array<DataTableColumn<unknown>>;
    expect(getMinTableWidth(columns)).toBe(560);
  });

  it("固定列同时给 width 和 minWidth 时取较大值", () => {
    const columns = [
      { id: "a", header: "a", cell: () => null, width: 100, minWidth: 140 },
    ] as Array<DataTableColumn<unknown>>;
    expect(getMinTableWidth(columns)).toBe(140);
  });

  it("百分比 / 无单位换算的列不计入像素总和", () => {
    const columns = [
      { id: "a", header: "a", cell: () => null, width: "50%" },
      { id: "b", header: "b", cell: () => null, width: 200 },
    ] as Array<DataTableColumn<unknown>>;
    expect(getMinTableWidth(columns)).toBe(200);
  });
});
