"use client";

import { useState, useEffect } from "react";
import { SvgIcon } from "@repo/icons";
import { useLocale } from "@repo/hooks";

interface ArticleListHeaderProps {
  categories: string[];
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// 分类 Tabs + 搜索框，搜索框有 300ms 防抖和 focus 展开效果
export function ArticleListHeader({
  categories,
  currentCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();
  // localQuery 即时响应输入，防抖 300ms 后才触发 onSearchChange
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // 当外部 searchQuery 重置时同步本地状态（如 category 切换时）
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // 防抖：localQuery 变化后 300ms 才通知外层
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 左侧分类 Tabs */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((category) => {
          const isActive = category === currentCategory;
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={[
                "px-4 py-2 rounded-full text-sm transition-colors duration-200",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              aria-pressed={isActive}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* 右侧搜索框：focus 时从 w-48 展开到 w-64 */}
      <div className="relative flex items-center">
        <span className="absolute left-3 pointer-events-none text-muted-foreground">
          <SvgIcon name="search" size={16} />
        </span>
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder={t("article.searchPlaceholder")}
          className="w-48 focus:w-64 transition-all duration-300 rounded-full border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
