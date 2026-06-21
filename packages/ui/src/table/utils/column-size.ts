import type { DataTableColumn, DataTableColumnSize, DataTableColumnStaticSize } from "../types";

/**
 * 把 DataTableColumnSize 解析成像素数值，无法换算（百分比 / 弹性单位）的返回 0。
 * 仅用于推算表格的最小宽度，不参与实际列宽渲染。
 */
function toPx(size: DataTableColumnSize | DataTableColumnStaticSize | undefined): number {
  if (size == null) return 0;
  if (typeof size === "number") return size;
  if (size.endsWith("fr") || size.endsWith("%")) return 0;
  return Number.parseFloat(size) || 0;
}

function isFlexWidth(width: DataTableColumnSize | undefined): boolean {
  return typeof width === "string" && width.endsWith("fr");
}

/**
 * 列宽 → CSS width。配合表格 `table-layout: fixed`，表头单元格宽即列宽。
 * - 数字 / 纯数字串 → `px`
 * - `${n}%` → 百分比
 * - `${n}fr` → `auto`，吸收剩余空间（CSS 模式下多个弹性列只能均分，无法按比例分配）
 */
export function toCssWidth(size: DataTableColumnSize | undefined): string | undefined {
  if (size == null) return undefined;
  if (typeof size === "number") return `${size}px`;
  if (size.endsWith("fr")) return "auto";
  if (size.endsWith("%")) return size;
  return `${size}px`;
}

/** minWidth → CSS min-width（不接受弹性单位）。 */
export function toCssMinWidth(size: DataTableColumnStaticSize | undefined): string | undefined {
  if (size == null) return undefined;
  if (typeof size === "number") return `${size}px`;
  if (size.endsWith("%")) return size;
  return `${size}px`;
}

/**
 * 表格最小宽度（px）：固定列取其宽度，弹性列取其 minWidth。
 * 容器更窄时由它撑出横向滚动，避免内容被压缩裁切（替代 react-aria 的 min-content 量算）。
 */
export function getMinTableWidth<T>(columns: Array<DataTableColumn<T>>): number {
  return columns.reduce((total, column) => {
    const px = isFlexWidth(column.width)
      ? toPx(column.minWidth)
      : Math.max(toPx(column.width), toPx(column.minWidth));
    return total + px;
  }, 0);
}
