import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("styles dark variant", () => {
  it("使用祖先选择器匹配 html.dark 和 system dark，而不是要求元素自身带 dark/light class", () => {
    const css = readFileSync("packages/styles/src/base.css", "utf8");
    const customVariantBlock = css.match(/@custom-variant dark\s*\{[\s\S]*?\n\}/)?.[0];

    expect(customVariantBlock).toBeTruthy();
    expect(customVariantBlock).toContain("&:where(:root.dark, :root.dark *)");
    expect(customVariantBlock).toContain("&:where(:root:not(.light), :root:not(.light) *)");
    expect(customVariantBlock).not.toContain("&.dark");
    expect(customVariantBlock).not.toContain("&:not(.light)");
  });
});
