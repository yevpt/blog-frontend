import type { MusicItemResp } from "@repo/api";

export interface ArticleMusicSyncInput {
  musicUrl: string;
  musicName: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  musicDurationSeconds?: number;
}

function resolveMusicArtist(item: MusicItemResp): string | undefined {
  const display = item.artist_display_name?.trim();
  if (display) return display;

  const fromArtists = item.artists?.[0]?.display_name ?? item.artists?.[0]?.name;
  if (fromArtists?.trim()) return fromArtists.trim();

  const legacy = item.singer?.trim();
  return legacy || undefined;
}

function resolveMusicCoverUrl(item: MusicItemResp): string | undefined {
  const album = typeof item.album === "string" ? undefined : item.album;
  return item.cover_url ?? album?.cover_url ?? item.cover_img_url;
}

/** 取文章配乐列表中 seq 最小的曲目 */
export function pickPrimaryArticleMusic(music?: MusicItemResp[]): MusicItemResp | undefined {
  if (!music?.length) return undefined;
  return [...music].sort((a, b) => a.seq - b.seq)[0];
}

/** 将文章详情 music 字段映射为 ArticleMusicSync 所需 props */
export function mapArticleMusicToSyncInput(
  music?: MusicItemResp[],
): ArticleMusicSyncInput | undefined {
  const item = pickPrimaryArticleMusic(music);
  if (!item) return undefined;

  const musicUrl = item.audio_url ?? item.url;
  if (!musicUrl || !item.name) return undefined;

  return {
    musicUrl,
    musicName: item.name,
    musicArtist: resolveMusicArtist(item),
    musicCoverUrl: resolveMusicCoverUrl(item),
    musicDurationSeconds: item.duration > 0 ? item.duration : undefined,
  };
}
