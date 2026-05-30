import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("合并多个类名", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("过滤 falsy 值", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("Tailwind 冲突类以后者为准", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("条件对象类名", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("无参数返回空字符串", () => {
    expect(cn()).toBe("");
  });
});
