import { describe, it, expect } from "vitest";
import { moveItem } from "./move-item";

describe("moveItem", () => {
  it("把元素从 from 移动到 to，返回新数组", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
  });
  it("from===to 时原样返回新数组", () => {
    const src = ["a", "b"];
    expect(moveItem(src, 1, 1)).toEqual(["a", "b"]);
  });
  it("越界索引时原样返回", () => {
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});
