import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SnippetsPageHeader } from "./snippets-page-header";

describe("SnippetsPageHeader", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<SnippetsPageHeader />)).not.toThrow();
  });

  it("显示标题文案", () => {
    render(<SnippetsPageHeader />);
    expect(screen.getByText("最近碎语")).toBeTruthy();
    expect(screen.getByText("最近在聊些什么")).toBeTruthy();
  });
});
