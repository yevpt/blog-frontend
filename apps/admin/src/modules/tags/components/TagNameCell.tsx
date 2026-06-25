import { SvgIcon } from "@repo/icons";
import { cn } from "@repo/ui";
import type { TagRow } from "../model";

interface TagNameCellProps {
  tag: TagRow;
}

export function TagNameCell({ tag }: TagNameCellProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20",
        "bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
      )}
    >
      {tag.icon ? (
        <img src={tag.icon} alt="" className="size-3.5 shrink-0 rounded-full object-cover" />
      ) : (
        <SvgIcon name="tag" size={12} className="shrink-0 opacity-80" />
      )}
      <span className="truncate">{tag.name}</span>
    </span>
  );
}
