import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentImageReviewOverlay } from "./moment-image-review-overlay";

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

describe("MomentImageReviewOverlay", () => {
  it("展示审核中文案", () => {
    render(<MomentImageReviewOverlay />);
    expect(screen.getByText("审核中")).toBeInTheDocument();
  });

  it("紧凑模式仍展示审核中", () => {
    render(<MomentImageReviewOverlay compact />);
    expect(screen.getByText("审核中")).toBeInTheDocument();
  });

  it("徽标使用不透明深色底，避免受底图颜色影响", () => {
    render(<MomentImageReviewOverlay />);
    const badge = screen.getByText("审核中");
    expect(badge.className).toContain("bg-black/80");
    expect(badge.className).toContain("text-white");
    expect(badge.className).not.toContain("backdrop-blur");
  });
});
