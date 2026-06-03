"use client";

import { Tabs, TabsList, TabsItem } from "@repo/ui";
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
}: ArticleListHeaderProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex flex-1 items-end gap-4 min-w-0">
        <Tabs
          selectedKey={String(currentCategoryId)}
          onSelectionChange={(key) => {
            const id = Number(key);
            if (!Number.isNaN(id)) onCategoryChange(id);
          }}
          className="flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList variant="underline">
            {categories.map((category) => (
              <TabsItem key={category.id} id={String(category.id)} variant="underline">
                {category.name}
              </TabsItem>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
