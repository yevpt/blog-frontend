import { Badge, Button, type DataTableColumn } from "@repo/ui";
import type { MomentRow } from "../model";

interface MomentColumnsOptions {
  togglingTopId: string | null;
  onToggleTop: (moment: MomentRow) => void;
  onDelete: (moment: MomentRow) => void;
}

export function createMomentColumns({
  togglingTopId,
  onToggleTop,
  onDelete,
}: MomentColumnsOptions): Array<DataTableColumn<MomentRow>> {
  return [
    {
      id: "content",
      header: "动态内容",
      isRowHeader: true,
      width: "36%",
      minWidth: 220,
      className: "min-w-0 whitespace-normal",
      cell: (moment) => (
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-6 text-foreground">{moment.content}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {moment.imageCount} 张图片 · {moment.commentStatus === 1 ? "可评论" : "已关评"}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "状态",
      width: "12%",
      minWidth: 96,
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      cell: (moment) => (
        <div className="flex items-center justify-center gap-1">
          <Badge variant={moment.status === 1 ? "success" : "secondary"}>
            {moment.statusLabel}
          </Badge>
          {moment.isTop ? <Badge variant="brand">置顶</Badge> : null}
        </div>
      ),
    },
    {
      id: "author",
      header: "作者",
      width: "14%",
      minWidth: 120,
      className: "truncate text-muted-foreground",
      cell: (moment) => moment.authorName,
    },
    {
      id: "stats",
      header: "互动",
      width: "16%",
      minWidth: 136,
      className: "text-muted-foreground",
      cell: (moment) =>
        `${moment.readCount} 读 · ${moment.likeCount} 赞 · ${moment.commentCount} 评`,
    },
    {
      id: "createdAt",
      header: "时间",
      width: "14%",
      minWidth: 128,
      className: "text-muted-foreground tabular-nums",
      cell: (moment) => moment.createdAt,
    },
    {
      id: "actions",
      header: "操作",
      width: "18%",
      minWidth: 156,
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      cell: (moment) => (
        <div className="flex items-center justify-center gap-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            isLoading={togglingTopId === moment.id}
            onPress={() => onToggleTop(moment)}
          >
            {moment.isTop ? "取消置顶" : "置顶"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onPress={() => onDelete(moment)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];
}
