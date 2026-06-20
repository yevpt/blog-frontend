import { Badge } from "@repo/ui";
import { articleStatusText, articleStatusVariant, type ArticleStatus } from "../model";

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return <Badge variant={articleStatusVariant[status]}>{articleStatusText[status]}</Badge>;
}
