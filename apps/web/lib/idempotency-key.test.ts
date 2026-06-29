import { describe, expect, it } from "vitest";
import { createIdempotencyKey } from "./idempotency-key";

describe("createIdempotencyKey", () => {
  it("生成包含业务作用域且满足后端长度限制的键", () => {
    const key = createIdempotencyKey("comment");

    expect(key).toMatch(/^comment:[0-9a-f-]+$/);
    expect(key.length).toBeLessThanOrEqual(128);
  });

  it("每次新逻辑操作生成不同的键", () => {
    expect(createIdempotencyKey("moment")).not.toBe(createIdempotencyKey("moment"));
  });
});
