import { useEffect, useRef, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Button, SearchField } from "@repo/ui";

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
    <div ref={searchContainerRef}>
      <SearchField
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={() => {
          if (value.trim().length === 0) setIsExpanded(false);
        }}
        className="w-full sm:w-[300px]"
        inputClassName="px-2"
        clearLabel="清除搜索"
        size="sm"
      />
    </div>
  );
}
