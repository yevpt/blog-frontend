import { describe, it, expect, beforeEach } from "vitest";
import { getSessionId } from "./session";

describe("getSessionId", () => {
  beforeEach(() => sessionStorage.clear());

  it("首次调用生成并持久化一个 session id", () => {
    const id = getSessionId(1000);
    expect(id).not.toBe("");
    expect(getSessionId(2000)).toBe(id); // 同窗口内复用
  });

  it("失活阈值内复用同一 session id", () => {
    const id = getSessionId(0);
    expect(getSessionId(29 * 60 * 1000)).toBe(id);
  });

  it("超过失活阈值生成新的 session id", () => {
    const id = getSessionId(0);
    const next = getSessionId(30 * 60 * 1000 + 1);
    expect(next).not.toBe(id);
  });

  it("每次调用都会刷新 last-activity（滑动窗口）", () => {
    const id = getSessionId(0);
    getSessionId(20 * 60 * 1000); // 刷新
    expect(getSessionId(40 * 60 * 1000)).toBe(id); // 距上次仅 20min，仍复用
  });
});
