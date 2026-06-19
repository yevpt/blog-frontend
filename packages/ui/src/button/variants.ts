import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-colors cursor-pointer select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "data-[pending]:pointer-events-none data-[pending]:opacity-70",
    "data-[pressed]:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground active:text-accent-foreground",
        text: "text-foreground active:text-accent-foreground hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      {
        variant: "text",
        size: ["default", "sm", "lg"],
        class: "h-auto px-0 py-0",
      },
    ],
  },
);
