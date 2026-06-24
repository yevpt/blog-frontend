import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown-to-html";

describe("markdownToHtml", () => {
  it("代码围栏转 HTML 时移除 code 末尾的单个换行，避免编辑态多出空行", () => {
    const html = markdownToHtml("```\nsource ~/.bash_profile\n```");

    expect(html).toContain("<code>source ~/.bash_profile</code>");
    expect(html).not.toContain("source ~/.bash_profile\n</code>");
  });
});
