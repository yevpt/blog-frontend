import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarDate } from "@internationalized/date";
import { DatePicker } from "./date-picker";

describe("DatePicker", () => {
  it("渲染不崩溃", () => {
    expect(() => render(<DatePicker />)).not.toThrow();
  });

  it("有 value 时显示日期分段", () => {
    render(<DatePicker value={new CalendarDate(2000, 6, 15)} />);
    expect(screen.getByText("2000")).toBeTruthy();
  });

  it("日历触发按钮存在", () => {
    render(<DatePicker />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
