import { useEffect, useRef, useState, type TransitionEvent } from "react";
import { SvgIcon } from "@repo/icons";
import { ButtonUtility, SearchField, cn } from "@repo/ui";

interface ArticleListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const EXPANDED_WIDTH_CLASS = "w-[240px]";
const COLLAPSED_WIDTH_CLASS = "w-6";
const TRANSITION_MS = 300;
const SEARCH_COMMIT_DELAY_MS = 200;

// 与表头排序 / 筛选按钮保持一致的图标按钮样式（无边框、透明底、muted 前景）
const headerControlClassName =
  "size-6 shrink-0 rounded-sm p-0 text-muted-foreground shadow-none ring-0 hover:bg-transparent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0";

const ghostClearButtonClassName =
  "mr-1.5 size-5 rounded-sm bg-transparent shadow-none ring-0 hover:bg-transparent hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[pressed]:scale-100 data-[pressed]:bg-transparent";

export function ArticleListSearch({
  value,
  onChange,
  placeholder = "搜索标题或摘要",
}: ArticleListSearchProps) {
  const [draftValue, setDraftValue] = useState(value);
  const hasValue = draftValue.trim().length > 0;
  const [isExpanded, setIsExpanded] = useState(hasValue);
  const [isSearchMounted, setIsSearchMounted] = useState(hasValue);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusSearchRef = useRef(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current === null) return;

    clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  };

  const scheduleSearchUnmount = () => {
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      collapseTimerRef.current = null;
      setIsSearchMounted(false);
    }, TRANSITION_MS);
  };

  useEffect(() => () => clearCollapseTimer(), []);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (draftValue === value) return;

    const timer = window.setTimeout(() => {
      onChange(draftValue);
    }, SEARCH_COMMIT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [draftValue, onChange, value]);

  useEffect(() => {
    if (!hasValue) return;

    setIsExpanded(true);
    setIsSearchMounted(true);
  }, [hasValue]);

  useEffect(() => {
    if (!isExpanded || !shouldFocusSearchRef.current) return;

    const frame = requestAnimationFrame(() => {
      searchContainerRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      shouldFocusSearchRef.current = false;
    });

    return () => cancelAnimationFrame(frame);
  }, [isExpanded, isSearchMounted]);

  const handleExpand = () => {
    clearCollapseTimer();
    shouldFocusSearchRef.current = true;
    setIsSearchMounted(true);
    requestAnimationFrame(() => {
      setIsExpanded(true);
    });
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    scheduleSearchUnmount();
  };

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== "width" || isExpanded) return;

    clearCollapseTimer();
    setIsSearchMounted(false);
  };

  return (
    // 外层保持固定的折叠态尺寸（仅占图标宽度）并留在表格流内，作为绝对定位锚点；
    // 真正展开的输入框移出流外（absolute），宽度动画不再触发整张表格逐帧回流。
    <div className="relative h-7 w-6">
      <ButtonUtility
        type="button"
        size="xs"
        color="tertiary"
        aria-label="展开搜索"
        aria-hidden={isExpanded}
        tabIndex={isExpanded ? -1 : 0}
        icon={<SvgIcon name="search" size={14} />}
        onClick={handleExpand}
        className={cn(
          headerControlClassName,
          "absolute top-1/2 right-0 -translate-y-1/2 transition-opacity duration-200 motion-reduce:transition-none",
          (isExpanded || isSearchMounted) && "pointer-events-none opacity-0",
        )}
      />

      {isSearchMounted ? (
        <div
          ref={searchContainerRef}
          onTransitionEnd={handleTransitionEnd}
          // 不再裁切：输入框随面板宽度自然生长，focus 的柔和外发光得以完整渲染、圆角平滑
          className={cn(
            "absolute top-0 right-0 z-10 h-7",
            "transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none",
            isExpanded ? EXPANDED_WIDTH_CLASS : COLLAPSED_WIDTH_CLASS,
            isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <SearchField
            aria-label={placeholder}
            placeholder={placeholder}
            value={draftValue}
            onChange={setDraftValue}
            onBlur={() => {
              if (!hasValue) handleCollapse();
            }}
            className={cn("w-full", "[&[data-empty]_[aria-label='清除搜索']]:hidden")}
            // 现代审美：静息态极简细描边 + 微填充底；focus 态用细描边 + 大半径低透明柔光环（halo），
            // 经 cn / tailwind-merge 干净覆盖默认样式，过渡平滑，无硬边、无毛刺
            groupClassName={cn(
              "rounded-full border border-border/60 bg-muted/40 shadow-none",
              "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
              "focus-within:border-primary/50 focus-within:bg-background",
              "focus-within:ring-[3px] focus-within:ring-primary/15",
            )}
            compact
            inputClassName="px-2"
            clearLabel="清除搜索"
            clearButtonClassName={ghostClearButtonClassName}
            size="sm"
          />
        </div>
      ) : null}
    </div>
  );
}
