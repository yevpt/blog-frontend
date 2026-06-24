// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getProviderMeta } from "./oauth-providers";

describe("getProviderMeta", () => {
  it("已知平台返回中文名", () => {
    expect(getProviderMeta("github").label).toBe("GitHub");
    expect(getProviderMeta("weibo").label).toBe("微博");
  });
  it("未知平台兜底用 source", () => {
    const m = getProviderMeta("unknownx");
    expect(m.label).toBe("unknownx");
    expect(m.short).toBe("UN");
  });
});
