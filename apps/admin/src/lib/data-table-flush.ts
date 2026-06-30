import type { DataTableClassNames } from "@repo/ui";

/** 嵌入 AdminListCard 内的 DataTable：白底表头与工具栏同色，避免灰白条带在边缘露缝。 */
export const adminFlushDataTableClassNames = {
  root: "flex flex-col h-full min-h-0 gap-0",
  toolbar: "hidden",
  container: "flex-1 h-full max-h-none w-full min-w-0 bg-card",
  overlay: "rounded-none",
  table: "w-full min-w-full border-separate border-spacing-0",
  headerCell: "bg-card first:pl-4 last:pr-4 hover:bg-muted/50 data-[pressed]:bg-muted/70",
  cell: "border-b border-border/60 bg-transparent px-3 py-2.5 first:pl-4 last:pr-4",
} as const satisfies DataTableClassNames;
