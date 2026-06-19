import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
// Mock embla-carousel-react to work in jsdom
let emblaCallbacks: Record<string, Array<(api: unknown) => void>> = {};
let selectedSnap = 0;
const mockApi = {
  scrollNext: vi.fn(() => {
    selectedSnap = (selectedSnap + 1) % 3;
    emblaCallbacks["select"]?.forEach((cb) => cb(mockApi));
    emblaCallbacks["reInit"]?.forEach((cb) => cb(mockApi));
  }),
  scrollPrev: vi.fn(() => {
    selectedSnap = Math.max(0, selectedSnap - 1);
    emblaCallbacks["select"]?.forEach((cb) => cb(mockApi));
  }),
  scrollTo: vi.fn((index: number) => {
    selectedSnap = index;
    emblaCallbacks["select"]?.forEach((cb) => cb(mockApi));
  }),
  canScrollPrev: vi.fn(() => selectedSnap > 0),
  canScrollNext: vi.fn(() => selectedSnap < 2),
  selectedScrollSnap: vi.fn(() => selectedSnap),
  scrollSnapList: vi.fn(() => [0, 1, 2]),
  on: vi.fn((event: string, cb: (api: unknown) => void) => {
    if (!emblaCallbacks[event]) emblaCallbacks[event] = [];
    emblaCallbacks[event].push(cb);
  }),
  off: vi.fn((event: string, cb: (api: unknown) => void) => {
    emblaCallbacks[event] = (emblaCallbacks[event] ?? []).filter((c) => c !== cb);
  }),
};

vi.mock("embla-carousel-react", () => ({
  default: vi.fn(() => [vi.fn(), mockApi]),
}));

import { Carousel, useCarousel } from "./index";

beforeEach(() => {
  emblaCallbacks = {};
  selectedSnap = 0;
  vi.clearAllMocks();
  mockApi.scrollSnapList.mockReturnValue([0, 1, 2]);
  mockApi.selectedScrollSnap.mockReturnValue(0);
  mockApi.canScrollPrev.mockReturnValue(false);
  mockApi.canScrollNext.mockReturnValue(true);
});

describe("Carousel", () => {
  it("渲染不崩溃", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>幻灯片 1</Carousel.Item>
          <Carousel.Item>幻灯片 2</Carousel.Item>
        </Carousel.Content>
      </Carousel.Root>,
    );
    expect(screen.getByRole("region")).toBeTruthy();
  });

  it("Carousel.Root 渲染为 region 角色", () => {
    render(
      <Carousel.Root aria-label="轮播">
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
        </Carousel.Content>
      </Carousel.Root>,
    );
    expect(screen.getByRole("region", { name: "轮播" })).toBeTruthy();
  });

  it("Carousel.Item 渲染为 group 角色", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>幻灯片</Carousel.Item>
        </Carousel.Content>
      </Carousel.Root>,
    );
    expect(screen.getByRole("group")).toBeTruthy();
  });

  it("IndicatorGroup + Indicator render prop 渲染正确数量", () => {
    render(
      <Carousel.Root>
        <Carousel.Content>
          <Carousel.Item>1</Carousel.Item>
          <Carousel.Item>2</Carousel.Item>
          <Carousel.Item>3</Carousel.Item>
        </Carousel.Content>
        <Carousel.IndicatorGroup aria-label="指示器">
          {({ index }) => (
            <Carousel.Indicator key={index} index={index} aria-label={`第 ${index + 1} 张`}>
              <button>•</button>
            </Carousel.Indicator>
          )}
        </Carousel.IndicatorGroup>
      </Carousel.Root>,
    );
    // scrollSnaps mock 返回 [0,1,2]，所以应渲染 3 个指示器
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("useCarousel 在 Root 外使用时抛出错误", () => {
    const BadComponent = () => {
      useCarousel();
      return null;
    };
    expect(() => render(<BadComponent />)).toThrow();
  });
});
