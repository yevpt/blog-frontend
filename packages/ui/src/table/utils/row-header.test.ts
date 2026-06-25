import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../types";
import { ensureRowHeaderColumn } from "./row-header";

describe("ensureRowHeaderColumn", () => {
  it("已有 isRowHeader 时保持原列配置", () => {
    const columns = [
      { id: "seq", header: "排序", cell: () => null },
      { id: "name", header: "名称", isRowHeader: true, cell: () => null },
    ] satisfies Array<DataTableColumn<{ id: string }>>;

    expect(ensureRowHeaderColumn(columns)).toEqual(columns);
  });

  it("缺省 isRowHeader 时把首列标记为行头", () => {
    const columns = [
      { id: "seq", header: "排序", cell: () => null },
      { id: "name", header: "名称", cell: () => null },
    ] satisfies Array<DataTableColumn<{ id: string }>>;

    expect(ensureRowHeaderColumn(columns)).toEqual([
      { id: "seq", header: "排序", isRowHeader: true, cell: expect.any(Function) },
      { id: "name", header: "名称", cell: expect.any(Function) },
    ]);
  });

  it("空列数组直接返回", () => {
    expect(ensureRowHeaderColumn([])).toEqual([]);
  });
});
