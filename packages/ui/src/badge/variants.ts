import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        brand: "bg-primary/10 text-primary border border-primary/20",
        // success/warning/error 为状态语义色，设计系统暂无对应令牌，保留并自带暗色适配
        success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
