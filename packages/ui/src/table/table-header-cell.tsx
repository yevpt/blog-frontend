"use client";

import type { ReactNode } from "react";
import type { Selection } from "react-aria-components";
import { SvgIcon } from "@repo/icons";
import { ButtonUtility } from "../button-utility/button-utility";
import { Dropdown } from "../dropdown/dropdown";
import { cn } from "../lib/utils";
import type { DataTableColumn, DataTableSortState } from "./types";

function getHeaderText(header: ReactNode, fallback: string) {
  return typeof header === "string" ? header : fallback;
}

export function DataTableHeaderCell<T>({
  column,
  sort,
  filterValue,
  onSortChange,
  onFilterChange,
}: {
  column: DataTableColumn<T>;
  sort?: DataTableSortState;
  filterValue?: string | string[];
  onSortChange: (column: DataTableColumn<T>) => void;
  onFilterChange: (columnId: string, value: string) => void;
}) {
  const headerText = getHeaderText(column.header, column.id);
  const isSortedColumn = sort?.column === column.id;
  const sortDirection = isSortedColumn ? sort.direction : undefined;
  const filter = column.filter;
  const selectedFilterValue =
    typeof filterValue === "string"
      ? filterValue
      : (filter?.value ?? filter?.defaultValue ?? "all");
  const activeFilterOption = filter?.options.find((option) => option.value === selectedFilterValue);
  const isFilterActive = Boolean(filter && selectedFilterValue !== "all");
  const filterButtonLabel = isFilterActive
    ? `筛选${headerText}：${activeFilterOption?.label ?? selectedFilterValue}`
    : `筛选${headerText}`;
  const sortButtonLabel =
    sortDirection === "ascending" ? `${headerText}排序：升序` : `${headerText}排序：降序`;

  function handleFilterSelection(keys: Selection) {
    if (keys === "all") return;
    const [selectedKey] = Array.from(keys);
    if (typeof selectedKey === "string") {
      onFilterChange(column.id, selectedKey);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate">{column.header}</span>
      {column.sort && (
        <ButtonUtility
          aria-pressed={sortDirection === "ascending"}
          aria-label={sortButtonLabel}
          type="button"
          size="xs"
          color="tertiary"
          icon={
            <span
              className={cn("transition-transform", sortDirection !== "ascending" && "rotate-180")}
            >
              <SvgIcon name="arrow-up" size={14} />
            </span>
          }
          onClick={() => onSortChange(column)}
          className={cn(
            "size-7 shrink-0 p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
            "focus-visible:ring-ring data-[pressed]:scale-95 data-[pressed]:bg-accent data-[pressed]:text-foreground",
            isSortedColumn &&
              "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15 hover:text-primary",
          )}
        />
      )}
      {filter && (
        <Dropdown.Root>
          <ButtonUtility
            aria-pressed={isFilterActive}
            aria-label={filterButtonLabel}
            type="button"
            size="xs"
            color="tertiary"
            icon={<SvgIcon name="chevron-down" size={14} />}
            className={cn(
              "size-7 shrink-0 p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
              "focus-visible:ring-ring data-[pressed]:scale-95 data-[pressed]:bg-accent data-[pressed]:text-foreground",
              isFilterActive &&
                "bg-primary/10 text-primary ring-1 ring-primary/20 hover:bg-primary/15 hover:text-primary",
            )}
          />
          <Dropdown.Popover
            placement="bottom right"
            className="z-50 w-max min-w-[10rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-1 text-card-foreground shadow-lg ring-1 ring-border"
          >
            <Dropdown.Menu
              aria-label={`筛选${headerText}`}
              selectionMode="single"
              selectedKeys={new Set([selectedFilterValue])}
              onSelectionChange={handleFilterSelection}
              className="outline-none"
            >
              {filter.options.map((option) => (
                <Dropdown.Item
                  unstyled
                  key={option.value}
                  id={option.value}
                  textValue={option.label}
                  className={({ isFocused, isSelected }) =>
                    cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors",
                      "text-foreground hover:bg-accent hover:text-accent-foreground",
                      isFocused && "bg-accent text-accent-foreground",
                      isSelected && "font-medium text-primary",
                    )
                  }
                >
                  {({ isSelected }) => (
                    <>
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center",
                          !isSelected && "invisible",
                        )}
                      >
                        <SvgIcon name="check" size={14} />
                      </span>
                      <span>{option.label}</span>
                    </>
                  )}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      )}
    </div>
  );
}
