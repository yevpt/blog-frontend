import { Badge, cn } from "@repo/ui";
import { friendLinkStatusText, friendLinkStatusVariant, type FriendLinkRow } from "../model";

interface FriendLinkStatusBadgeProps {
  status: FriendLinkRow["status"];
  className?: string;
}

export function FriendLinkStatusBadge({ status, className }: FriendLinkStatusBadgeProps) {
  return (
    <Badge variant={friendLinkStatusVariant[status]} className={cn("whitespace-nowrap", className)}>
      {friendLinkStatusText[status]}
    </Badge>
  );
}
