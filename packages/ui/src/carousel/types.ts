import type { CSSProperties, ComponentPropsWithRef, HTMLAttributes, ReactNode, Ref } from "react";
import type useEmblaCarousel from "embla-carousel-react";
import type { UseEmblaCarouselType } from "embla-carousel-react";

/** Embla 实例 API（reInit/select 等事件源）。 */
export type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
/** Embla 初始化选项。 */
export type CarouselOptions = UseCarouselParameters[0];
/** Embla 插件列表。 */
export type CarouselPlugin = UseCarouselParameters[1];
/** 轮播方向。 */
export type CarouselOrientation = "horizontal" | "vertical";

/** `Carousel.Root` 的配置项。 */
export type CarouselProps = {
  /** The options for the Embla carousel. */
  opts?: CarouselOptions;
  /** The plugins for the Embla carousel. */
  plugins?: CarouselPlugin;
  /** The orientation of the carousel. */
  orientation?: CarouselOrientation;
  /** The function to set the API for the carousel. */
  setApi?: (api: CarouselApi) => void;
};

/** `Carousel.Root` 接收的完整 props（含原生 div 属性）。 */
export type CarouselRootProps = ComponentPropsWithRef<"div"> & CarouselProps;

/** 透过 context 共享的轮播状态与控制方法。 */
export type CarouselContextValue = CarouselProps & {
  /** The ref of the carousel. */
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  /** The API of the carousel. */
  api: ReturnType<typeof useEmblaCarousel>[1];
  /** The function to scroll the carousel to the previous slide. */
  scrollPrev: () => void;
  /** The function to scroll the carousel to the next slide. */
  scrollNext: () => void;
  /** Whether the carousel can scroll to the previous slide. */
  canScrollPrev: boolean;
  /** Whether the carousel can scroll to the next slide. */
  canScrollNext: boolean;
  /** The index of the selected slide. */
  selectedIndex: number;
  /** The scroll snaps of the carousel. */
  scrollSnaps: number[];
};

/** `Carousel.Content` 的 props。 */
export interface CarouselContentProps extends ComponentPropsWithRef<"div"> {
  /** Whether to hide the overflow. */
  overflowHidden?: boolean;
}

/** 传给 Trigger 渲染函数的运行时状态。 */
export interface CarouselTriggerRenderProps {
  isDisabled: boolean;
  onClick: () => void;
}

/** `Carousel.PrevTrigger` / `Carousel.NextTrigger` 的 props。 */
export interface CarouselTriggerProps {
  /** The ref of the trigger. */
  ref?: Ref<HTMLButtonElement>;
  /** If true, the child element will be cloned and passed down the prop of the trigger. */
  asChild?: boolean;
  /** The direction of the trigger. */
  direction: "prev" | "next";
  /** The children of the trigger. Can be a render prop or a valid element. */
  children: ReactNode | ((props: CarouselTriggerRenderProps) => ReactNode);
  /** The style of the trigger. */
  style?: CSSProperties;
  /** The class name of the trigger. */
  className?: string | ((args: { isDisabled: boolean }) => string);
}

/** 传给 Indicator 渲染函数的运行时状态。 */
export interface CarouselIndicatorRenderProps {
  isSelected: boolean;
  onClick: () => void;
}

/** `Carousel.Indicator` 的 props。 */
export interface CarouselIndicatorProps {
  /** The index of the indicator. */
  index: number;
  /** If true, the child element will be cloned and passed down the prop of the indicator. */
  asChild?: boolean;
  /** If true, the indicator will be selected. */
  isSelected?: boolean;
  /** The children of the indicator. Can be a render prop or a valid element. */
  children?: ReactNode | ((props: CarouselIndicatorRenderProps) => ReactNode);
  /** The style of the indicator. */
  style?: CSSProperties;
  /** The class name of the indicator. */
  className?: string | ((args: { isSelected: boolean }) => string);
  /** The aria-label of the indicator. */
  "aria-label"?: string;
}

/** `Carousel.IndicatorGroup` 的 props。 */
export interface CarouselIndicatorGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  children: ReactNode | ((props: { index: number }) => ReactNode);
}
