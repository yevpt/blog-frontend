import { useCallback, useMemo, useState } from "react";
import { ApiError, type MusicAlbumResp, type MusicArtistResp } from "@repo/api";
import { useClientTableQuery } from "../../lib/admin-list-query";
import { AdminListCard } from "../../components/AdminListCard";
import { apiClient } from "../../lib/api";
import { addToast } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { MusicCatalogMiniList } from "./components/MusicCatalogMiniList";
import { MusicPageDialogs } from "./components/MusicPageDialogs";
import { MusicPageHeader } from "./components/MusicPageHeader";
import { MusicSongsPanel } from "./components/MusicSongsPanel";
import { useMusicCatalog } from "./hooks/use-music-catalog";
import {
  countMusicStatus,
  filterAndSortMusicRows,
  musicTableQueryCodec,
  suggestNextMusicSeq,
  toAlbumSaveReq,
  toArtistSaveReq,
  toMusicSaveReq,
  uploadRespToValue,
  type MusicAlbumFormValues,
  type MusicArtistFormValues,
  type MusicCatalogTab,
  type MusicFormValues,
  type MusicRow,
  type MusicUploadValue,
} from "./model";

type FormMode = "create" | "edit";

export function MusicPage() {
  const { musicItems, rows, artists, albums, isLoading, error, refetch } = useMusicCatalog();
  const isMdScreen = useIsMdScreen();
  const [activeTab, setActiveTab] = useState<MusicCatalogTab>("songs");
  const [songMode, setSongMode] = useState<FormMode>("create");
  const [artistMode, setArtistMode] = useState<FormMode>("create");
  const [albumMode, setAlbumMode] = useState<FormMode>("create");
  const [songOpen, setSongOpen] = useState(false);
  const [artistOpen, setArtistOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<MusicRow | null>(null);
  const [editingArtist, setEditingArtist] = useState<MusicArtistResp | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<MusicAlbumResp | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    tableState,
    handleSearchChange,
    handleTableStateChange,
    setStringFilter,
    resetListQuery,
    hasActiveListQuery,
  } = useClientTableQuery(musicTableQueryCodec);

  const nextSeq = useMemo(() => suggestNextMusicSeq(musicItems), [musicItems]);
  const statusCounts = useMemo(() => countMusicStatus(rows), [rows]);
  const visibleRows = useMemo(() => filterAndSortMusicRows(rows, tableState), [rows, tableState]);
  const visibilityFilter = String(tableState.filters.visibility ?? "all");

  const openCreateSong = useCallback(() => {
    setSongMode("create");
    setEditingSong(null);
    setSongOpen(true);
  }, []);

  const openCreateArtist = useCallback(() => {
    setArtistMode("create");
    setEditingArtist(null);
    setArtistOpen(true);
  }, []);

  const openCreateAlbum = useCallback(() => {
    setAlbumMode("create");
    setEditingAlbum(null);
    setAlbumOpen(true);
  }, []);

  const openEditSong = useCallback((row: MusicRow) => {
    setSongMode("edit");
    setEditingSong(row);
    setSongOpen(true);
  }, []);

  const openEditArtist = useCallback((artist: MusicArtistResp) => {
    setArtistMode("edit");
    setEditingArtist(artist);
    setArtistOpen(true);
  }, []);

  const openEditAlbum = useCallback((album: MusicAlbumResp) => {
    setAlbumMode("edit");
    setEditingAlbum(album);
    setAlbumOpen(true);
  }, []);

  const handleVisibilityFilterChange = useCallback(
    (visibility: string) => {
      setStringFilter("visibility", visibility);
    },
    [setStringFilter],
  );

  const handleSongSubmit = useCallback(
    async (values: MusicFormValues, mode: FormMode, id?: string) => {
      setIsSubmitting(true);
      try {
        if (mode === "create") {
          await apiClient.music.create(toMusicSaveReq(values));
          addToast("音乐已创建", "success");
        } else if (id) {
          await apiClient.music.update(Number(id), toMusicSaveReq(values));
          addToast("音乐已更新", "success");
        }
        setSongOpen(false);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "保存失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch],
  );

  const handleArtistSubmit = useCallback(
    async (values: MusicArtistFormValues, mode: FormMode, id?: number) => {
      setIsSubmitting(true);
      try {
        const req = toArtistSaveReq(values);
        if (mode === "create") {
          await apiClient.music.createArtist(req);
          addToast("歌手已创建", "success");
        } else if (id) {
          await apiClient.music.updateArtist(id, req);
          addToast("歌手已更新", "success");
        }
        setArtistOpen(false);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "保存失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch],
  );

  const handleAlbumSubmit = useCallback(
    async (values: MusicAlbumFormValues, mode: FormMode, id?: number) => {
      setIsSubmitting(true);
      try {
        const req = toAlbumSaveReq(values);
        if (mode === "create") {
          await apiClient.music.createAlbum(req);
          addToast("专辑已创建", "success");
        } else if (id) {
          await apiClient.music.updateAlbum(id, req);
          addToast("专辑已更新", "success");
        }
        setAlbumOpen(false);
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "保存失败，请稍后重试", "error");
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refetch],
  );

  const handleDeleteSong = useCallback(
    async (row: MusicRow) => {
      setDeletingKey(`song-${row.id}`);
      try {
        await apiClient.music.delete(Number(row.id));
        addToast("已删除", "success");
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setDeletingKey(null);
      }
    },
    [refetch],
  );

  const handleDeleteArtist = useCallback(
    async (artist: MusicArtistResp) => {
      setDeletingKey(`artist-${artist.id}`);
      try {
        await apiClient.music.deleteArtist(artist.id);
        addToast("已删除", "success");
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setDeletingKey(null);
      }
    },
    [refetch],
  );

  const handleDeleteAlbum = useCallback(
    async (album: MusicAlbumResp) => {
      setDeletingKey(`album-${album.id}`);
      try {
        await apiClient.music.deleteAlbum(album.id);
        addToast("已删除", "success");
        await refetch();
      } catch (err) {
        addToast(err instanceof ApiError ? err.message : "删除失败，请稍后重试", "error");
        throw err;
      } finally {
        setDeletingKey(null);
      }
    },
    [refetch],
  );

  const uploadAudio = useCallback(async (file: File): Promise<MusicUploadValue> => {
    return uploadRespToValue(await apiClient.music.uploadAudio({ file }));
  }, []);
  const uploadArtistAvatar = useCallback(async (file: File): Promise<MusicUploadValue> => {
    return uploadRespToValue(await apiClient.music.uploadArtistAvatar({ file }));
  }, []);
  const uploadAlbumCover = useCallback(async (file: File): Promise<MusicUploadValue> => {
    return uploadRespToValue(await apiClient.music.uploadAlbumCover({ file }));
  }, []);

  return (
    <div className="grid min-h-0 min-w-0 max-w-full gap-4 overflow-hidden md:max-h-[calc(100dvh-3rem)] md:grid-rows-[auto_auto_minmax(0,1fr)] lg:max-h-[calc(100dvh-3.5rem)]">
      <MusicPageHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateSong={openCreateSong}
        onCreateArtist={openCreateArtist}
        onCreateAlbum={openCreateAlbum}
      />

      <section className="flex min-h-0 min-w-0 max-w-full flex-col" aria-label="音乐资料库">
        {error ? (
          <p role="alert" className="pb-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {activeTab === "songs" ? (
          <MusicSongsPanel
            rows={rows}
            visibleRows={visibleRows}
            statusCounts={statusCounts}
            tableState={tableState}
            visibilityFilter={visibilityFilter}
            isLoading={isLoading}
            isMdScreen={isMdScreen}
            onTableStateChange={handleTableStateChange}
            onSearchChange={handleSearchChange}
            onVisibilityFilterChange={handleVisibilityFilterChange}
            canClear={hasActiveListQuery}
            onClear={resetListQuery}
            onCreate={openCreateSong}
            onEdit={openEditSong}
            deletingKey={deletingKey}
            onConfirmDeleteSong={handleDeleteSong}
          />
        ) : (
          <AdminListCard className="md:min-h-[320px]">
            <MusicCatalogMiniList
              tab={activeTab}
              rows={rows}
              artists={artists}
              albums={albums}
              isLoading={isLoading}
              onEditArtist={openEditArtist}
              onEditAlbum={openEditAlbum}
              deletingKey={deletingKey}
              onConfirmDeleteArtist={handleDeleteArtist}
              onConfirmDeleteAlbum={handleDeleteAlbum}
            />
          </AdminListCard>
        )}
      </section>

      <MusicPageDialogs
        songMode={songMode}
        artistMode={artistMode}
        albumMode={albumMode}
        songOpen={songOpen}
        artistOpen={artistOpen}
        albumOpen={albumOpen}
        editingSong={editingSong}
        editingArtist={editingArtist}
        editingAlbum={editingAlbum}
        artists={artists}
        albums={albums}
        nextSeq={nextSeq}
        isSubmitting={isSubmitting}
        onCloseSong={() => setSongOpen(false)}
        onCloseArtist={() => setArtistOpen(false)}
        onCloseAlbum={() => setAlbumOpen(false)}
        onUploadAudio={uploadAudio}
        onUploadArtistAvatar={uploadArtistAvatar}
        onUploadAlbumCover={uploadAlbumCover}
        onSubmitSong={handleSongSubmit}
        onSubmitArtist={handleArtistSubmit}
        onSubmitAlbum={handleAlbumSubmit}
      />
    </div>
  );
}
