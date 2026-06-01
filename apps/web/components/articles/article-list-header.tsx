"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, SearchField } from "@repo/ui";
import { useLocale } from "@repo/hooks";
import type { CategoryTabItem } from "@repo/api";

interface ArticleListHeaderProps {
  categories: CategoryTabItem[];
  currentCategoryId: number;
  onCategoryChange: (id: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ArticleListHeader({
  categories,
  currentCategoryId,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ArticleListHeaderProps) {
  const { t } = useLocale();
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
      {/* 左侧分类 Tabs — button-brand-horizontal 变体（主色胶囊样式） */}
      <Tabs
        selectedKey={String(currentCategoryId)}
        onSelectionChange={(key) => {
          const id = Number(key);
          if (!Number.isNaN(id)) onCategoryChange(id);
        }}
      >
        <TabsList variant="button-brand-horizontal">
          {categories.map((category) => (
            <TabsItem key={category.id} id={String(category.id)} variant="button-brand-horizontal">
              {category.name}
            </TabsItem>
          ))}
        </TabsList>
      </Tabs>

      <SearchField
        placeholder={t("article.searchPlaceholder")}
        value={localQuery}
        onChange={setLocalQuery}
        size="sm"
        inputClassName="w-48 focus:w-64 transition-all duration-300"
      />
    </div>
  );
}
