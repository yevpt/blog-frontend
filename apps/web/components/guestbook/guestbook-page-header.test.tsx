// apps/web/components/guestbook/guestbook-page-header.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GuestbookPageHeader } from "./guestbook-page-header";

describe("GuestbookPageHeader", () => {
  it("渲染不崩溃", () => {
    render(<GuestbookPageHeader />);
  });

  it("显示标签文字", () => {
    render(<GuestbookPageHeader />);
    expect(screen.getByText("来过的人")).toBeTruthy();
  });

  it("显示标题文字", () => {
    render(<GuestbookPageHeader />);
    expect(screen.getByRole("heading", { name: "留下你的痕迹" })).toBeTruthy();
  });
});
