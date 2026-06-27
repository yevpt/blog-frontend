import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { CircleUserCardSkeleton } from "./circle-user-card-skeleton";
import { CIRCLE_USER_CARD_CLASS } from "./circle-grid";

test("CircleUserCardSkeleton 与真实用户卡片壳层 class 一致", () => {
  const { container } = render(<CircleUserCardSkeleton />);

  const card = screen.getByTestId("circle-user-card-skeleton");
  expect(card.className).toBe(CIRCLE_USER_CARD_CLASS);
  expect(container.querySelectorAll(".moment-shimmer-bar")).toHaveLength(3);
  expect(container.querySelector(".h-12.w-12")).toBeTruthy();
});
