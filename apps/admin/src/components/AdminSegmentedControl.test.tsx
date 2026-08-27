import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSegmentedControl } from "./AdminSegmentedControl";

beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) HTMLElement.prototype.getAnimations = () => [];
});

describe("AdminSegmentedControl", () => {
  it("展示选中状态并回传新值", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AdminSegmentedControl
        ariaLabel="访问指标"
        options={[
          { id: "pv", label: "浏览量" },
          { id: "uv", label: "访客" },
        ]}
        value="pv"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("tablist", { name: "访问指标" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "浏览量" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "访客" }));
    expect(onChange).toHaveBeenCalledWith("uv");
  });
});
