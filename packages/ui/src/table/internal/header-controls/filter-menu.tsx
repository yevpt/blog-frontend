"use client";

import type { Selection } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { ButtonUtility } from "../../../button-utility/button-utility";
import { Dropdown } from "../../../dropdown/dropdown";
import { cn } from "../../../lib/utils";
import { dataTableHeaderControlClassName } from "./control-class-name";
import type { DataTableClassNames, DataTableColumn } from "../../types";

interface DataTableFilterMenuProps<T extends object> {
  column: DataTableColumn<T>;
  headerText: string;
  filterValue?: string | string[];
  onFilterChange: (columnId: string, value: string) => void;
  classNames?: DataTableClassNames;
}

export function DataTableFilterMenu<T extends object>({
  column,
  headerText,
  filterValue,
  onFilterChange,
  classNames,
}: DataTableFilterMenuProps<T>) {
  const filter = column.filter;
  if (!filter) return null;

  // 目前 UI 先支持单选筛选；数组值保留给后续多选扩展时复用状态结构。
  const selectedFilterValue =
    typeof filterValue === "string" ? filterValue : (filter.value ?? filter.defaultValue ?? "all");
  const activeFilterOption = filter.options.find((option) => option.value === selectedFilterValue);
  const isFilterActive = selectedFilterValue !== "all";
  const buttonLabel = isFilterActive
    ? `筛选${headerText}：${activeFilterOption?.label ?? selectedFilterValue}`
    : `筛选${headerText}`;

  function handleFilterSelection(keys: Selection) {
    if (keys === "all") return;
    const [selectedKey] = Array.from(keys);
    if (typeof selectedKey === "string") {
      onFilterChange(column.id, selectedKey);
    }
  }

  return (
    <Dropdown.Root>
      <ButtonUtility
        aria-pressed={isFilterActive}
        aria-label={buttonLabel}
        type="button"
        size="xs"
        color="tertiary"
        icon={
          <span
            className={cn(
              "text-muted-foreground/80 transition-colors",
              isFilterActive && "text-primary",
            )}
          >
            <SvgIcon name="filter" size={14} />
          </span>
        }
        onClick={(event) => event.stopPropagation()}
        className={cn(dataTableHeaderControlClassName, classNames?.filterButton)}
      />
      <Dropdown.Popover
        placement="bottom"
        offset={6}
        className={cn(
          "z-50 w-max min-w-[11rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-xl",
          "ring-1 ring-border/70 placement-bottom:mt-1",
          classNames?.filterPopover,
        )}
      >
        <div
          className={cn(
            "px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground",
            classNames?.filterMenuTitle,
          )}
        >
          筛选{headerText}
        </div>
        <Dropdown.Menu
          aria-label={`筛选${headerText}`}
          selectionMode="single"
          selectedKeys={new Set([selectedFilterValue])}
          onSelectionChange={handleFilterSelection}
          className={cn("grid gap-0.5 outline-none", classNames?.filterMenu)}
        >
          {filter.options.map((option) => (
            <Dropdown.Item
              unstyled
              key={option.value}
              id={option.value}
              textValue={option.label}
              className={({ isFocused, isSelected }) =>
                cn(
                  "grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
                  "text-foreground hover:bg-accent/70 hover:text-accent-foreground",
                  isFocused && "bg-accent/70 text-accent-foreground",
                  isSelected && "font-medium text-foreground",
                  classNames?.filterMenuItem,
                )
              }
            >
              {({ isSelected }) => (
                <>
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center text-primary",
                      !isSelected && "invisible",
                    )}
                  >
                    <SvgIcon name="check" size={14} />
                  </span>
                </>
              )}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}
