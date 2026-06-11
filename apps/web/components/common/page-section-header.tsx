import { cn } from "@repo/ui";

interface PageSectionHeaderProps {
  label: string;
  title: string;
  as?: "h1" | "h2";
  titleClassName?: string;
}

export function PageSectionHeader({
  label,
  title,
  as: Tag = "h1",
  titleClassName,
}: PageSectionHeaderProps) {
  return (
    <>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
        {label}
      </p>
      <Tag
        className={cn(
          "text-[22px] font-extrabold tracking-[-0.03em] text-foreground",
          titleClassName,
        )}
      >
        {title}
      </Tag>
    </>
  );
}
