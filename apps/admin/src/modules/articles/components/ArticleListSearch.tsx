import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, SearchField, cn } from "@repo/ui";

interface ArticleListSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ArticleListSearch({
  value,
  onChange,
  placeholder = "搜索标题或摘要",
}: ArticleListSearchProps) {
  const [isExpanded, setIsExpanded] = useState(value.trim().length > 0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusSearchRef = useRef(false);

  useEffect(() => {
    if (value.trim().length > 0) setIsExpanded(true);
  }, [value]);

  useEffect(() => {
    if (!isExpanded || !shouldFocusSearchRef.current) return;

    searchContainerRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    shouldFocusSearchRef.current = false;
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="outline"
        aria-label="展开搜索"
        onPress={() => {
          shouldFocusSearchRef.current = true;
          setIsExpanded(true);
        }}
        className="size-8 rounded-full border-border bg-background p-0 shadow-sm"
      >
        <SvgIcon name="search" size={15} />
      </Button>
    );
  }

  return (
    <div ref={searchContainerRef} className="w-full sm:w-[360px]">
      <SearchField
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={() => {
          if (value.trim().length === 0) setIsExpanded(false);
        }}
        className={cn(
          "w-full",
          "[&>div]:h-9 [&>div]:rounded-full [&>div]:border-primary [&>div]:bg-background [&>div]:shadow-sm",
          "[&>div]:focus-within:border-primary [&>div]:focus-within:ring-primary/20",
          "[&[data-empty]_[aria-label='清除搜索']]:hidden",
          "[&_[aria-label='清除搜索']]:mr-2",
        )}
        inputClassName="px-2 text-sm"
        clearLabel="清除搜索"
        size="sm"
      />
    </div>
  );
}
