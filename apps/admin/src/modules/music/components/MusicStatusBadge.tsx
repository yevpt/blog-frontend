import { Badge } from "@repo/ui";

export function MusicStatusBadge({ isPublic }: { isPublic: boolean }) {
  return <Badge variant={isPublic ? "success" : "secondary"}>{isPublic ? "公开" : "隐藏"}</Badge>;
}
