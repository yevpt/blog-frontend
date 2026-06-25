import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentsPageHeader } from "./moments-page-header";

describe("MomentsPageHeader", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<MomentsPageHeader />)).not.toThrow();
  });

  it("显示标题文案", () => {
    render(<MomentsPageHeader />);
    expect(screen.getByText("最近碎语")).toBeTruthy();
    expect(screen.getByText("最近在聊些什么")).toBeTruthy();
  });
});
