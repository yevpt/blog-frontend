import type { MomentItemResp } from "@repo/api";

/** 与 Tailwind sm/lg 断点保持一致 */
export function getSnippetColumnCount(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/** 估算卡片高度，用于瀑布流高度感知分配 */
export function estimateHeight(snippet: MomentItemResp): number {
  let height = 120;
  const textLen = snippet.content ? snippet.content.length : 0;
  height += Math.min(textLen * 0.8, 300);
  if (snippet.images && snippet.images.length > 0) {
    height += snippet.images.length === 1 ? 250 : 130;
  }
  return height;
}

export interface ColumnItem {
  snippet: MomentItemResp;
  delay: number;
}

export function distributeToColumns(
  items: MomentItemResp[],
  columnCount: number,
  pageSize: number,
  prevAssignments?: Map<number, number>,
): { cols: ColumnItem[][]; assignments: Map<number, number> } {
  const cols: ColumnItem[][] = Array.from({ length: columnCount }, () => []);
  const colWeights = Array.from({ length: columnCount }, () => 0);
  const newAssignments = new Map<number, number>();

  items.forEach((item, index) => {
    let targetCol = prevAssignments?.get(item.id);

    if (targetCol === undefined || targetCol >= columnCount) {
      let minCol = 0;
      let minWeight = colWeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (colWeights[i] < minWeight) {
          minWeight = colWeights[i];
          minCol = i;
        }
      }
      targetCol = minCol;
    }

    newAssignments.set(item.id, targetCol);
    cols[targetCol].push({
      snippet: item,
      delay: (index % pageSize) * 0.08,
    });

    colWeights[targetCol] += estimateHeight(item);
  });

  return { cols, assignments: newAssignments };
}
