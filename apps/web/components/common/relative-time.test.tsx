// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelativeTime } from "./relative-time";

describe("RelativeTime", () => {
  it("挂载后显示相对时间", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<RelativeTime dateTime={recent} />);
    expect(screen.getByText("5 分钟前")).toBeInTheDocument();
  });
});
