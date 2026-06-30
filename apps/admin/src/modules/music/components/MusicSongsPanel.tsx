import { SvgIcon } from "@repo/icons";
import { Button, DataTable, type DataTableEmptyState, type DataTableState } from "@repo/ui";
import { AdminListCard } from "../../../components/AdminListCard";
import { AdminListSummary } from "../../../components/AdminListSummary";
import { adminFlushDataTableClassNames } from "../../../lib/data-table-flush";
import { MusicListToolbar } from "./MusicListToolbar";
import { MusicMobileList } from "./MusicMobileList";
import { createMusicColumns } from "./music-columns";
import { matchMusicSearch, type MusicRow, type MusicStatusCounts } from "../model";

interface MusicSongsPanelProps {
  rows: MusicRow[];
  visibleRows: MusicRow[];
  statusCounts: MusicStatusCounts;
  tableState: DataTableState;
  visibilityFilter: string;
  isLoading: boolean;
  isMdScreen: boolean;
  onTableStateChange: (state: DataTableState) => void;
  onSearchChange: (value: string) => void;
  onVisibilityFilterChange: (value: string) => void;
  canClear?: boolean;
  onClear?: () => void;
  onCreate: () => void;
  onEdit: (row: MusicRow) => void;
  deletingKey: string | null;
  onConfirmDeleteSong: (row: MusicRow) => Promise<void>;
}

export function MusicSongsPanel({
  rows,
  visibleRows,
  statusCounts,
  tableState,
  visibilityFilter,
  isLoading,
  isMdScreen,
  onTableStateChange,
  onSearchChange,
  onVisibilityFilterChange,
  canClear = false,
  onClear,
  onCreate,
  onEdit,
  deletingKey,
  onConfirmDeleteSong,
}: MusicSongsPanelProps) {
  const columns = createMusicColumns(onEdit, deletingKey, onConfirmDeleteSong);
  const hasActiveFilter = canClear;
  const emptyState: DataTableEmptyState = hasActiveFilter
    ? { icon: "search", title: "未找到匹配的音乐", description: "调整搜索或筛选条件后再试。" }
    : {
        icon: "music",
        title: "还没有音乐",
        description: "上传第一首歌后，它可以被文章引用，也可以公开到音乐库。",
        action: (
          <Button size="sm" onPress={onCreate}>
            <SvgIcon name="plus" size={15} />
            新建音乐
          </Button>
        ),
      };

  return (
    <AdminListCard className="md:min-h-[320px]">
      <MusicListToolbar
        searchValue={tableState.searchValue}
        visibilityFilter={visibilityFilter}
        onSearchChange={onSearchChange}
        onVisibilityFilterChange={onVisibilityFilterChange}
        canClear={canClear}
        onClear={onClear}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        {isMdScreen ? (
          <DataTable
            aria-label="音乐列表"
            items={visibleRows}
            columns={columns}
            getRowId={(row) => row.id}
            state={tableState}
            onStateChange={onTableStateChange}
            search={{ placeholder: "搜索曲名、歌手或专辑…", match: matchMusicSearch }}
            showTotal={false}
            showToolbar={false}
            emptyState={emptyState}
            isLoading={isLoading}
            maxHeightClassName={false}
            embedded
            classNames={adminFlushDataTableClassNames}
          />
        ) : (
          <div className="h-full overflow-y-auto overscroll-y-contain">
            <MusicMobileList
              items={visibleRows}
              isLoading={isLoading}
              emptyState={emptyState}
              onEdit={onEdit}
              deletingKey={deletingKey}
              onConfirmDeleteSong={onConfirmDeleteSong}
            />
          </div>
        )}
      </div>
      {!isLoading && rows.length > 0 ? (
        <AdminListSummary
          visibleCount={visibleRows.length}
          secondary={`公开 ${statusCounts.publicCount} · 隐藏 ${statusCounts.hiddenCount} · 有音频 ${statusCounts.withAudioCount}`}
        />
      ) : null}
    </AdminListCard>
  );
}
