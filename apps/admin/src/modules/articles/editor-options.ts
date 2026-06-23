import type { SelectItemType } from "@repo/ui";

export type ArticleTag = {
  id: string;
  label: string;
};

export type MusicOption = SelectItemType & {
  artist: string;
  duration: string;
};

export const categoryOptions: SelectItemType[] = [
  { id: "frontend", label: "前端" },
  { id: "engineering", label: "工程" },
  { id: "essay", label: "随笔" },
  { id: "life", label: "生活" },
];

export const tagOptions: ArticleTag[] = [
  { id: "react", label: "React" },
  { id: "admin", label: "后台" },
  { id: "ux", label: "体验设计" },
  { id: "typescript", label: "TypeScript" },
  { id: "editor", label: "编辑器" },
  { id: "publish", label: "发布流" },
  { id: "a11y", label: "可访问性" },
  { id: "perf", label: "性能优化" },
];

export const musicOptions: MusicOption[] = [
  { id: "midnight", label: "Midnight Drafts", artist: "Luma", duration: "03:42" },
  { id: "rain", label: "Quiet Rain", artist: "Paperroom", duration: "04:18" },
  { id: "city", label: "City Windows", artist: "Taro", duration: "02:57" },
];
