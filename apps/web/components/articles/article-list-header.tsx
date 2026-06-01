"use client";

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
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
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当外部 searchQuery 重置时同步本地状态（如 category 切换时）
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // 防抖：localQuery 变化后 300ms 才通知外层
  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [localQuery, onSearchChange]);

  // 搜索展开时自动聚焦输入框（用 ref 方式避开 jsx-a11y/no-autofocus 规则）
  useEffect(() => {
    if (isSearchOpen && mobileSearchContainerRef.current) {
      const input = mobileSearchContainerRef.current.querySelector("input");
      input?.focus();
    }
  }, [isSearchOpen]);

  const handleCloseSearch = () => {
    // 取消防抖计时器，防止关闭时 onSearchChange 被触发两次
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSearchOpen(false);
    setLocalQuery("");
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* 移动端展开搜索态：整行替换为搜索框 + 关闭按钮 */}
      {isSearchOpen && (
        <div ref={mobileSearchContainerRef} className="flex flex-1 items-center gap-2 md:hidden">
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
        className={clsx("flex flex-1 items-end gap-4 min-w-0", isSearchOpen && "hidden md:flex")}
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
        <div className="hidden md:flex md:items-end shrink-0">
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
