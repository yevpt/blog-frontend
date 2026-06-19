/** 选项卡视觉风格。 */
export type TabsVariant = "button-brand-horizontal" | "underline";

export const tabListVariantClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal": "inline-flex flex-wrap gap-1 p-1 bg-muted rounded-full",
  underline:
    "flex gap-4 border-b border-border overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [scrollbar-width:none]",
};

export const tabItemBaseClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal": [
    "group relative flex items-center cursor-pointer rounded-full px-4 py-1.5",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "data-[disabled]:opacity-50",
  ].join(" "),
  underline: [
    "group relative pb-3 cursor-pointer",
    "text-sm font-medium outline-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "data-[disabled]:opacity-50",
    "whitespace-nowrap shrink-0",
  ].join(" "),
};

export const tabItemTextClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal":
    "relative z-10 transition-colors text-muted-foreground group-hover:text-foreground group-data-[selected]:text-primary-foreground",
  underline:
    "transition-colors text-muted-foreground group-hover:text-foreground group-data-[selected]:text-foreground",
};

export const tabIndicatorClasses: Record<TabsVariant, string> = {
  "button-brand-horizontal":
    "absolute inset-0 z-0 rounded-full bg-primary motion-safe:transition-[translate,width,height] duration-200",
  underline:
    "absolute bottom-0 left-0 h-0.5 w-full bg-primary motion-safe:transition-[translate,width] duration-200",
};
