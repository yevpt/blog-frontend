"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, Input } from "@repo/ui";
import { useLocale } from "@repo/hooks";

interface ArticleListHeaderProps {
  categories: string[];
  currentCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// 分类 Tabs（button-brand-horizontal）+ 搜索框（Input with iconName）
// Input onChange 返回 string，防抖 300ms 后才触发 onSearchChange
export function ArticleListHeader({
  categories,
  currentCategory,
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
        selectedKey={currentCategory}
        onSelectionChange={(key) => onCategoryChange(String(key))}
      >
        <TabsList variant="button-brand-horizontal">
          {categories.map((category) => (
            <TabsItem key={category} id={category} variant="button-brand-horizontal">
              {category}
            </TabsItem>
          ))}
        </TabsList>
      </Tabs>

      {/* 右侧搜索框：Input 组件，iconName 自动左侧定位搜索图标 */}
      <Input
        iconName="search"
        placeholder={t("article.searchPlaceholder")}
        value={localQuery}
        onChange={setLocalQuery}
        size="sm"
        inputClassName="w-48 focus:w-64 transition-all duration-300"
      />
    </div>
  );
}
