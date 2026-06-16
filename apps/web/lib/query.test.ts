import { describe, it, expect } from "vitest";
import { buildQuery } from "./query";

describe("buildQuery", () => {
  it("omits undefined, null, and empty string values", () => {
    expect(buildQuery({ a: undefined, b: null, c: "", d: "x" })).toBe("d=x");
  });

  it("keeps 0 and false", () => {
    expect(buildQuery({ n: 0, flag: false })).toBe("n=0&flag=false");
  });

  it('returns "" when no values are set', () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ a: undefined, b: null, c: "" })).toBe("");
  });

  it("returns deterministic query strings for page/page_size/category_id", () => {
    expect(buildQuery({ page: 1, page_size: 10, category_id: 3 })).toBe(
      "page=1&page_size=10&category_id=3",
    );
  });
});
