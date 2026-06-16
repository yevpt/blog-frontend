import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UserProfileSkeleton } from "./user-profile-skeleton";

describe("UserProfileSkeleton", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<UserProfileSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("包含两张卡片区域", () => {
    const { container } = render(<UserProfileSkeleton />);
    const cards = container.querySelectorAll(".bg-card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
