import type { DataTableColumn } from "../types";

/** react-aria Table 要求至少一列 isRowHeader；缺省时把首列标记为行头。 */
export function ensureRowHeaderColumn<T>(
  columns: Array<DataTableColumn<T>>,
): Array<DataTableColumn<T>> {
  if (columns.length === 0 || columns.some((column) => column.isRowHeader)) {
    return columns;
  }

  return columns.map((column, index) => (index === 0 ? { ...column, isRowHeader: true } : column));
}
