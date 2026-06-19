/**
 * 生成 [start, end] 闭区间的连续整数数组。
 * @param start 起始值
 * @param end 结束值
 */
export const range = (start: number, end: number): number[] => {
  const length = end - start + 1;

  return Array.from({ length }, (_, index) => index + start);
};
