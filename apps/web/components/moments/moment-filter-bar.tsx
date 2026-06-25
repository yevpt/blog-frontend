"use client";

import { SvgIcon } from "@repo/icons";
import { Button, Tabs, TabsList, TabsItem } from "@repo/ui";
export type MomentTab = "all" | "owner" | "friends";
export type MomentSort = "latest" | "popular";

interface MomentFilterBarProps {
  activeTab: MomentTab;
  onTabChange: (tab: MomentTab) => void;
  activeSort: MomentSort;
  onSortChange: (sort: MomentSort) => void;
}

const TAB_ITEMS: Array<{ id: MomentTab; label: string }> = [
  { id: "all", label: "全部" },
  { id: "owner", label: "博主" },
  { id: "friends", label: "朋友们" },
];

const SORT_LABELS: Record<MomentSort, string> = {
  latest: "最新",
  popular: "最热",
};

function getNextSort(sort: MomentSort): MomentSort {
  return sort === "latest" ? "popular" : "latest";
}

/** 顺序图标 + 文字，点击在「最新 / 最热」间切换 */
function MomentSortToggle({
  activeSort,
  onSortChange,
}: {
  activeSort: MomentSort;
  onSortChange: (sort: MomentSort) => void;
}) {
  const label = SORT_LABELS[activeSort];

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onPress={() => onSortChange(getNextSort(activeSort))}
      aria-label={`排序：${label}，点击切换`}
      className="h-auto shrink-0 gap-1.5 px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <SvgIcon name="arrow-up-down" size={16} />
      <span>{label}</span>
    </Button>
  );
}

/**
 * 碎语页顶部：标题区 + Tab 行（下划线横贯全宽）+ 右侧排序切换
 */
export function MomentFilterBar({
  activeTab,
  onTabChange,
  activeSort,
  onSortChange,
}: MomentFilterBarProps) {
  return (
    <div data-testid="moments-page-header" className="mb-6">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
        最近碎语
      </p>
      <h1 className="mb-5 text-[22px] font-extrabold tracking-[-0.03em] text-foreground">
        最近在聊些什么
      </h1>

      <div className="border-b border-border">
        <div className="flex items-end justify-between gap-6">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => onTabChange(key as MomentTab)}
            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <TabsList variant="underline" className="border-b-0">
              {TAB_ITEMS.map((item) => (
                <TabsItem key={item.id} id={item.id} variant="underline">
                  {item.label}
                </TabsItem>
              ))}
            </TabsList>
          </Tabs>

          <div className="shrink-0 pb-1 pr-1">
            <MomentSortToggle activeSort={activeSort} onSortChange={onSortChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
