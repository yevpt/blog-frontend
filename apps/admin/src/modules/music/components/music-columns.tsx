import type { DataTableColumn } from "@repo/ui";
import { AdminRowAction, AdminRowActions } from "../../../components/AdminRowAction";
import { MusicArtwork } from "./MusicArtwork";
import { MusicDeleteButton } from "./MusicDeleteButton";
import { MusicPreviewButton } from "./MusicPreviewButton";
import { MusicStatusBadge } from "./MusicStatusBadge";
import { formatDuration, type MusicRow } from "../model";

export function createMusicColumns(
  onEdit: (row: MusicRow) => void,
  deletingKey: string | null,
  onConfirmDeleteSong: (row: MusicRow) => Promise<void>,
): Array<DataTableColumn<MusicRow>> {
  return [
    {
      id: "seq",
      header: "排序",
      width: "8%",
      minWidth: 72,
      className: "text-center text-muted-foreground tabular-nums",
      headerClassName: "text-center [&>div]:justify-center",
      sort: { defaultDirection: "ascending", value: (row) => row.seq },
      cell: (row) => row.seq,
    },
    {
      id: "name",
      header: "歌曲",
      isRowHeader: true,
      width: "28%",
      minWidth: 190,
      sort: { value: (row) => row.name },
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <MusicArtwork src={row.coverUrl} alt={`${row.name} 封面`} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{row.artistDisplayName}</p>
          </div>
        </div>
      ),
    },
    {
      id: "album",
      header: "专辑",
      width: "18%",
      minWidth: 128,
      className: "truncate text-muted-foreground",
      cell: (row) => row.albumName || "—",
    },
    {
      id: "duration",
      header: "时长",
      width: "10%",
      minWidth: 88,
      className: "text-muted-foreground tabular-nums",
      sort: { value: (row) => row.duration },
      cell: (row) => formatDuration(row.duration),
    },
    {
      id: "status",
      header: "状态",
      width: "12%",
      minWidth: 88,
      className: "text-center",
      headerClassName: "text-center [&>div]:justify-center",
      cell: (row) => <MusicStatusBadge isPublic={row.isPublic} />,
    },
    {
      id: "actions",
      header: "操作",
      width: "24%",
      minWidth: 150,
      className: "text-right",
      headerClassName: "text-right [&>div]:justify-end",
      cell: (row) => (
        <AdminRowActions>
          <MusicPreviewButton title={row.name} url={row.audioUrl} />
          <AdminRowAction type="button" onPress={() => onEdit(row)}>
            编辑
          </AdminRowAction>
          <MusicDeleteButton
            ariaLabel={`确认删除「${row.name}」`}
            message={`确定删除「${row.name}」？删除后不会再出现在音乐资料库中。`}
            isDeleting={deletingKey === `song-${row.id}`}
            onConfirm={() => onConfirmDeleteSong(row)}
          />
        </AdminRowActions>
      ),
    },
  ];
}
