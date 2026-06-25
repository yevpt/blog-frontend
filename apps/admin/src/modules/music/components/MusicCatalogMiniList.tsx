import { useEffect, useMemo, useState } from "react";
import type { MusicAlbumResp, MusicArtistResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Modal, SearchField, cn } from "@repo/ui";
import { MusicArtwork } from "./MusicArtwork";
import { formatDuration, type MusicCatalogTab, type MusicRow } from "../model";

interface MusicCatalogMiniListProps {
  tab: Exclude<MusicCatalogTab, "songs">;
  rows: MusicRow[];
  artists: MusicArtistResp[];
  albums: MusicAlbumResp[];
  isLoading: boolean;
  onEditArtist: (artist: MusicArtistResp) => void;
  onEditAlbum: (album: MusicAlbumResp) => void;
  onDeleteArtist: (artist: MusicArtistResp) => void;
  onDeleteAlbum: (album: MusicAlbumResp) => void;
}

type ArtistListItem = {
  id: string;
  name: string;
  avatarUrl?: string;
  description: string;
  songs: MusicRow[];
  artist?: MusicArtistResp;
};

type AlbumListItem = {
  id: string;
  name: string;
  coverUrl?: string;
  artistName: string;
  releaseDate?: string;
  description?: string;
  songs: MusicRow[];
  album?: MusicAlbumResp;
};

type DetailTarget =
  | { kind: "artist"; item: ArtistListItem }
  | { kind: "album"; item: AlbumListItem };

export function MusicCatalogMiniList({
  tab,
  rows,
  artists,
  albums,
  isLoading,
  onEditArtist,
  onEditAlbum,
  onDeleteArtist,
  onDeleteAlbum,
}: MusicCatalogMiniListProps) {
  const [keyword, setKeyword] = useState("");
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const artistItems = useMemo(() => buildArtistItems(artists, rows), [artists, rows]);
  const albumItems = useMemo(() => buildAlbumItems(albums, rows), [albums, rows]);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleArtistItems = useMemo(
    () =>
      artistItems.filter((item) =>
        [item.name, item.description, ...item.songs.map((song) => song.name)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword),
      ),
    [artistItems, normalizedKeyword],
  );
  const visibleAlbumItems = useMemo(
    () =>
      albumItems.filter((item) =>
        [item.name, item.artistName, item.releaseDate ?? "", ...item.songs.map((song) => song.name)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword),
      ),
    [albumItems, normalizedKeyword],
  );
  const items = tab === "artists" ? visibleArtistItems : visibleAlbumItems;

  useEffect(() => {
    setKeyword("");
  }, [tab]);

  if (isLoading) {
    return (
      <div className="grid gap-3 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border/70 p-4">
        <SearchField
          aria-label={tab === "artists" ? "搜索歌手" : "搜索专辑"}
          placeholder={tab === "artists" ? "搜索歌手、简介或歌曲…" : "搜索专辑、歌手或歌曲…"}
          value={keyword}
          onChange={setKeyword}
        />
      </div>

      {items.length === 0 ? (
        <CatalogEmptyState tab={tab} hasKeyword={keyword.trim() !== ""} />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto">
          {tab === "artists"
            ? visibleArtistItems.map((artist) => {
                const sourceArtist = artist.artist;
                return (
                  <ArtistRow
                    key={artist.id}
                    item={artist}
                    onDetail={() => setDetailTarget({ kind: "artist", item: artist })}
                    onEdit={sourceArtist ? () => onEditArtist(sourceArtist) : undefined}
                    onDelete={sourceArtist ? () => onDeleteArtist(sourceArtist) : undefined}
                  />
                );
              })
            : visibleAlbumItems.map((album) => {
                const sourceAlbum = album.album;
                return (
                  <AlbumRow
                    key={album.id}
                    item={album}
                    onDetail={() => setDetailTarget({ kind: "album", item: album })}
                    onEdit={sourceAlbum ? () => onEditAlbum(sourceAlbum) : undefined}
                    onDelete={sourceAlbum ? () => onDeleteAlbum(sourceAlbum) : undefined}
                  />
                );
              })}
        </ul>
      )}

      <CatalogDetailDialog target={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}

function ArtistRow({
  item,
  onDetail,
  onEdit,
  onDelete,
}: {
  item: ArtistListItem;
  onDetail: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <MusicArtwork src={item.avatarUrl} alt={`${item.name} 头像`} className="rounded-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.description || "暂无简介"} · {item.songs.length} 首歌曲
        </p>
      </div>
      <MiniActions
        detailLabel={`查看 ${item.name} 详情`}
        onDetail={onDetail}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  );
}

function AlbumRow({
  item,
  onDetail,
  onEdit,
  onDelete,
}: {
  item: AlbumListItem;
  onDetail: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <MusicArtwork src={item.coverUrl} alt={`${item.name} 封面`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {item.artistName || "未设置主歌手"} · {item.songs.length} 首歌曲
          {item.releaseDate ? ` · ${item.releaseDate}` : ""}
        </p>
      </div>
      <MiniActions
        detailLabel={`查看 ${item.name} 详情`}
        onDetail={onDetail}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  );
}

function MiniActions({
  detailLabel,
  onDetail,
  onEdit,
  onDelete,
}: {
  detailLabel: string;
  onDetail: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs"
        aria-label={detailLabel}
        onPress={onDetail}
      >
        详情
      </Button>
      {onEdit ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onPress={onEdit}
        >
          编辑
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onPress={onDelete}
        >
          删除
        </Button>
      ) : null}
    </div>
  );
}

function CatalogEmptyState({
  tab,
  hasKeyword,
}: {
  tab: Exclude<MusicCatalogTab, "songs">;
  hasKeyword: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12 text-center">
      <SvgIcon
        name={hasKeyword ? "search" : tab === "artists" ? "user" : "image"}
        size={28}
        className="text-muted-foreground"
      />
      <p className="mt-4 text-sm font-medium text-foreground">
        {hasKeyword ? "未找到匹配结果" : tab === "artists" ? "还没有歌手" : "还没有专辑"}
      </p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {hasKeyword
          ? "换一个关键词试试。"
          : tab === "artists"
            ? "先创建歌手，再为歌曲建立结构化关联。"
            : "专辑可集中维护封面和发行日期。"}
      </p>
    </div>
  );
}

function CatalogDetailDialog({
  target,
  onClose,
}: {
  target: DetailTarget | null;
  onClose: () => void;
}) {
  const title = target?.kind === "artist" ? "歌手详情" : "专辑详情";
  return (
    <Modal
      isOpen={Boolean(target)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable
      placement="fullscreen-mobile"
      size="lg"
      aria-label={title}
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      {target ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
            <MusicArtwork
              src={target.kind === "artist" ? target.item.avatarUrl : target.item.coverUrl}
              alt={target.item.name}
              className={cn(target.kind === "artist" && "rounded-full")}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-foreground">{target.item.name}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {target.kind === "artist"
                  ? target.item.description || "暂无简介"
                  : `${target.item.artistName || "未设置主歌手"}${target.item.releaseDate ? ` · ${target.item.releaseDate}` : ""}`}
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <h3 className="text-sm font-semibold text-foreground">关联歌曲</h3>
            {target.item.songs.length > 0 ? (
              <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border">
                {target.item.songs.map((song) => (
                  <li key={song.id} className="flex items-center gap-3 px-3 py-2.5">
                    <MusicArtwork src={song.coverUrl} alt={`${song.name} 封面`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{song.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {song.artistDisplayName} · {song.albumName || "未归入专辑"} ·{" "}
                        {formatDuration(song.duration)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                暂无关联歌曲
              </p>
            )}
          </div>
          <div className="flex justify-end border-t border-border/70 px-4 py-4 sm:px-5">
            <Button variant="outline" onPress={onClose}>
              关闭
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function buildArtistItems(artists: MusicArtistResp[], rows: MusicRow[]): ArtistListItem[] {
  if (artists.length > 0) {
    return artists
      .map((artist) => ({
        id: String(artist.id),
        name: artist.display_name,
        avatarUrl: artist.avatar_url,
        description: artist.description ?? "",
        artist,
        songs: rows.filter((row) => rowBelongsToArtist(row, artist)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  const items = new Map<string, ArtistListItem>();
  for (const row of rows) {
    const name = row.artistDisplayName.trim();
    if (!name) continue;
    const item = items.get(name) ?? { id: `derived-${name}`, name, description: "", songs: [] };
    item.songs.push(row);
    items.set(name, item);
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function buildAlbumItems(albums: MusicAlbumResp[], rows: MusicRow[]): AlbumListItem[] {
  if (albums.length > 0) {
    return albums
      .map((album) => ({
        id: String(album.id),
        name: album.name,
        coverUrl: album.cover_url,
        artistName: album.artist?.display_name ?? "",
        releaseDate: album.release_date,
        description: album.description,
        album,
        songs: rows.filter((row) => rowBelongsToAlbum(row, album)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  const items = new Map<string, AlbumListItem>();
  for (const row of rows) {
    const name = row.albumName.trim();
    if (!name) continue;
    const item = items.get(name) ?? {
      id: `derived-${name}`,
      name,
      coverUrl: row.coverUrl,
      artistName: "",
      songs: [],
    };
    item.coverUrl = item.coverUrl ?? row.coverUrl;
    item.songs.push(row);
    items.set(name, item);
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function rowBelongsToArtist(row: MusicRow, artist: MusicArtistResp) {
  if (row.artists.some((item) => item.id === artist.id)) return true;
  return splitDisplayNames(row.artistDisplayName).some(
    (name) => name === artist.display_name || name === artist.name,
  );
}

function rowBelongsToAlbum(row: MusicRow, album: MusicAlbumResp) {
  return row.album?.id === album.id || row.albumName.trim() === album.name;
}

function splitDisplayNames(value: string) {
  return value
    .split(/[、,/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
