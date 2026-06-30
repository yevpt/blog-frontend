import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FeaturedPost } from "@/app/_mock/types";
import { FeaturedCarouselSlide } from "./featured-carousel-slide";

vi.mock("@repo/hooks/locale", () => ({
  useLocale: () => ({ locale: "zh", setLocale: vi.fn(), t: (k: string) => k }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/category-colors", () => ({
  getCategoryColorClass: () => "bg-blue-500",
}));

const post: FeaturedPost = {
  id: "1",
  title: "桌面轮播标题",
  excerpt: "桌面轮播摘要",
  coverImage: "https://example.com/cover.jpg",
  category: "编程",
  date: "2026-01-15",
  href: "/articles/1",
};

describe("FeaturedCarouselSlide", () => {
  it("showImageSkeleton 时仅图片区骨架，右侧文案仍可见", () => {
    render(<FeaturedCarouselSlide post={post} isActive showImageSkeleton />);

    expect(screen.getByRole("heading", { name: "桌面轮播标题" })).toBeVisible();
    expect(screen.getByText("桌面轮播摘要")).toBeVisible();
    expect(screen.getByTestId("loading-image-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
