"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsItem, SearchField } from "@repo/ui";
import { SvgIcon } from "@repo/icons";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setLocalQuery("");
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* 移动端展开搜索态：整行替换为搜索框 + 关闭按钮 */}
      {isSearchOpen && (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          <SearchField
            placeholder={t("article.searchPlaceholder")}
            value={localQuery}
            onChange={setLocalQuery}
            size="sm"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleCloseSearch}
            aria-label="关闭搜索"
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <SvgIcon name="close" size={18} />
          </button>
        </div>
      )}

      {/* 正常态：Tabs + 桌面搜索框 + 移动搜索图标 */}
      <div
        className={`flex flex-1 items-center gap-2 min-w-0 ${isSearchOpen ? "hidden md:flex" : ""}`}
      >
        <Tabs
          selectedKey={String(currentCategoryId)}
          onSelectionChange={(key) => {
            const id = Number(key);
            if (!Number.isNaN(id)) onCategoryChange(id);
          }}
          className="flex-1 min-w-0"
        >
          <TabsList variant="underline">
            {categories.map((category) => (
              <TabsItem key={category.id} id={String(category.id)} variant="underline">
                {category.name}
              </TabsItem>
            ))}
          </TabsList>
        </Tabs>

        {/* 桌面端：展开式搜索框 */}
        <div className="hidden md:block shrink-0">
          <SearchField
            placeholder={t("article.searchPlaceholder")}
            value={localQuery}
            onChange={setLocalQuery}
            size="sm"
            className="w-48 focus-within:w-64 transition-all duration-300"
          />
        </div>

        {/* 移动端：搜索图标按钮（点击展开）*/}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="搜索"
          className="md:hidden shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SvgIcon name="search" size={18} />
        </button>
      </div>
    </div>
  );
}
