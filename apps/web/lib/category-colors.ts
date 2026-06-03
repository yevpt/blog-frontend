const COLOR_CLASSES: Record<string, string> = {
  编程: "bg-blue-500",
  技术: "bg-blue-500",
  工具: "bg-emerald-500",
  文学: "bg-violet-500",
  读书: "bg-violet-500",
  设计: "bg-pink-500",
  生活: "bg-amber-500",
  随笔: "bg-teal-500",
  摄影: "bg-orange-500",
};

export function getCategoryColorClass(category: string): string {
  return COLOR_CLASSES[category] ?? "bg-primary";
}
