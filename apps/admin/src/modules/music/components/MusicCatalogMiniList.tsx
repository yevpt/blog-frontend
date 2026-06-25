import type { MusicAlbumResp, MusicArtistResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Badge, Button } from "@repo/ui";
import { MusicArtwork } from "./MusicArtwork";
import type { MusicCatalogTab, MusicRow } from "../model";

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
  const derivedArtists = deriveArtistsFromRows(rows);
  const derivedAlbums = deriveAlbumsFromRows(rows);
  const items = tab === "artists" ? artists : albums;
  const derivedItems = tab === "artists" ? derivedArtists : derivedAlbums;
  if (isLoading) {
    return (
      <div className="grid gap-3 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0 && derivedItems.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <SvgIcon
          name={tab === "artists" ? "user" : "image"}
          size={28}
          className="text-muted-foreground"
        />
        <p className="mt-4 text-sm font-medium text-foreground">
          {tab === "artists" ? "还没有歌手" : "还没有专辑"}
        </p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {tab === "artists"
            ? "先创建歌手，再为歌曲建立结构化关联。"
            : "专辑可集中维护封面和发行日期。"}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-y-auto">
      {tab === "artists"
        ? artists.length > 0
          ? artists.map((artist) => (
              <li key={artist.id} className="flex items-center gap-3 px-4 py-3">
                <MusicArtwork
                  src={artist.avatar_url}
                  alt={`${artist.display_name} 头像`}
                  className="rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {artist.display_name}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {artist.description ?? "暂无简介"}
                  </p>
                </div>
                <Badge variant="outline">歌手</Badge>
                <MiniActions
                  onEdit={() => onEditArtist(artist)}
                  onDelete={() => onDeleteArtist(artist)}
                />
              </li>
            ))
          : derivedArtists.map((artist) => (
              <li key={artist.name} className="flex items-center gap-3 px-4 py-3">
                <MusicArtwork alt={`${artist.name} 头像`} className="rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{artist.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {artist.count} 首歌曲引用
                  </p>
                </div>
                <Badge variant="outline">来自歌曲</Badge>
              </li>
            ))
        : albums.length > 0
          ? albums.map((album) => (
              <li key={album.id} className="flex items-center gap-3 px-4 py-3">
                <MusicArtwork src={album.cover_url} alt={`${album.name} 封面`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{album.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {album.artist?.display_name ?? "未设置主歌手"}
                    {album.release_date ? ` · ${album.release_date}` : ""}
                  </p>
                </div>
                <Badge variant="outline">专辑</Badge>
                <MiniActions
                  onEdit={() => onEditAlbum(album)}
                  onDelete={() => onDeleteAlbum(album)}
                />
              </li>
            ))
          : derivedAlbums.map((album) => (
              <li key={album.name} className="flex items-center gap-3 px-4 py-3">
                <MusicArtwork src={album.coverUrl} alt={`${album.name} 封面`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{album.name}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {album.count} 首歌曲引用
                  </p>
                </div>
                <Badge variant="outline">来自歌曲</Badge>
              </li>
            ))}
    </ul>
  );
}

function deriveArtistsFromRows(rows: MusicRow[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = row.artistDisplayName.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function deriveAlbumsFromRows(
  rows: MusicRow[],
): Array<{ name: string; count: number; coverUrl?: string }> {
  const albums = new Map<string, { name: string; count: number; coverUrl?: string }>();
  for (const row of rows) {
    const name = row.albumName.trim();
    if (!name) continue;
    const current = albums.get(name);
    albums.set(name, {
      name,
      count: (current?.count ?? 0) + 1,
      coverUrl: current?.coverUrl ?? row.coverUrl,
    });
  }
  return [...albums.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function MiniActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onPress={onEdit}>
        编辑
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onPress={onDelete}
      >
        删除
      </Button>
    </div>
  );
}
