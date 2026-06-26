import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicSeek } from "./article-music-seek";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

function renderSeek(overrides: Partial<Parameters<typeof MusicSeek>[0]> = {}) {
  const onSeek = vi.fn();
  render(<MusicSeek progress={0.5} valueText="01:00 / 02:00" onSeek={onSeek} {...overrides} />);
  return { onSeek, slider: screen.getByRole("slider", { name: "播放进度" }) };
}

describe("MusicSeek", () => {
  it("暴露 slider 语义与进度文案", () => {
    const { slider } = renderSeek();
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("aria-valuetext", "01:00 / 02:00");
    expect(slider).toHaveAttribute("tabindex", "0");
  });

  it("方向键按步长切换进度", async () => {
    const { onSeek, slider } = renderSeek();
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSeek).toHaveBeenLastCalledWith(expect.closeTo(0.52, 5), true);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onSeek).toHaveBeenLastCalledWith(expect.closeTo(0.48, 5), true);
  });

  it("Home/End 跳到首尾", async () => {
    const { onSeek, slider } = renderSeek();
    slider.focus();
    await userEvent.keyboard("{Home}");
    expect(onSeek).toHaveBeenLastCalledWith(0, true);
    await userEvent.keyboard("{End}");
    expect(onSeek).toHaveBeenLastCalledWith(1, true);
  });

  it("disabled 时不可聚焦且不响应键盘", async () => {
    const { onSeek, slider } = renderSeek({ disabled: true });
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("tabindex", "-1");
    slider.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onSeek).not.toHaveBeenCalled();
  });
});
