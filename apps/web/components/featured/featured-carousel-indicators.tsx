"use client";

import { SvgIcon } from "@repo/icons";

interface FeaturedCarouselIndicatorsProps {
  count: number;
  currentIndex: number;
  onSelect: (index: number) => void;
}

// Droplet 指示器，点击切换幻灯片
export function FeaturedCarouselIndicators({
  count,
  currentIndex,
  onSelect,
}: FeaturedCarouselIndicatorsProps) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          aria-label={`第 ${index + 1} 张，共 ${count} 张`}
          aria-current={index === currentIndex ? "true" : undefined}
          className={`transition-colors duration-200 ${
            index === currentIndex ? "text-white" : "text-white/40 hover:text-white/80"
          }`}
        >
          <SvgIcon name="droplet-filled" size={12} />
        </button>
      ))}
    </div>
  );
}
