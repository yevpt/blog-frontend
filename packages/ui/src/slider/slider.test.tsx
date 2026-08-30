import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
  it("渲染可访问名称和当前值", () => {
    render(<Slider label="播放进度" value={25} minValue={0} maxValue={100} />);

    expect(screen.getByRole("slider", { name: "播放进度" })).toHaveAttribute("value", "25");
  });

  it("支持键盘调整受控值", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Slider label="播放进度" value={25} minValue={0} maxValue={100} onChange={onChange} />);

    await user.click(screen.getByRole("slider", { name: "播放进度" }));
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith(26);
  });
});
