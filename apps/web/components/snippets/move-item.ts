/** 纯函数：将数组中 from 处元素移动到 to 处，返回新数组；索引非法时返回原内容副本 */
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = [...arr];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
