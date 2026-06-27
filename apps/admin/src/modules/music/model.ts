import type {
  MusicAlbumResp,
  MusicAlbumSaveReq,
  MusicArtistResp,
  MusicArtistSaveReq,
  MusicItemResp,
  MusicSaveReq,
  MusicUploadResp,
} from "@repo/api";
import type { DataTableState } from "@repo/ui";
import { createClientTableQueryCodec } from "../../lib/admin-list-query";

export type MusicCatalogTab = "songs" | "artists" | "albums";

export interface MusicRow {
  id: string;
  name: string;
  artistDisplayName: string;
  artists: MusicArtistResp[];
  album?: MusicAlbumResp;
  albumName: string;
  albumTrackNo: number;
  audioUrl?: string;
  coverUrl?: string;
  duration: number;
  isPublic: boolean;
  seq: number;
}

export interface MusicFormValues {
  name: string;
  artistIds: string[];
  artistDisplayName: string;
  albumId: string;
  albumTrackNo: string;
  audioKey: string;
  audioSize: string;
  audioMime: string;
  audioHash: string;
  lyric: string;
  duration: string;
  isPublic: boolean;
  seq: string;
}

export interface MusicArtistFormValues {
  name: string;
  nameZh: string;
  avatarKey: string;
  description: string;
}

export interface MusicAlbumFormValues {
  name: string;
  artistId: string;
  coverKey: string;
  releaseDate: string;
  description: string;
}

export interface MusicStatusCounts {
  total: number;
  publicCount: number;
  hiddenCount: number;
  withAudioCount: number;
}

export interface MusicUploadValue {
  key: string;
  url: string;
  size: number;
  mime: string;
  hash: string;
}

export type MusicFormErrors = Partial<Record<keyof MusicFormValues, string>>;
export type MusicArtistFormErrors = Partial<Record<keyof MusicArtistFormValues, string>>;
export type MusicAlbumFormErrors = Partial<Record<keyof MusicAlbumFormValues, string>>;

export function mapMusicToRow(item: MusicItemResp): MusicRow {
  const album = typeof item.album === "string" ? undefined : item.album;
  const albumName = typeof item.album === "string" ? item.album : (item.album?.name ?? "");
  return {
    id: String(item.id),
    name: item.name,
    artistDisplayName: item.artist_display_name ?? item.singer ?? "",
    artists: item.artists ?? [],
    album,
    albumName,
    albumTrackNo: item.album_track_no ?? 0,
    audioUrl: item.audio_url ?? item.url,
    coverUrl: item.cover_url ?? album?.cover_url ?? item.cover_img_url,
    duration: item.duration,
    isPublic: item.is_public ?? true,
    seq: item.seq,
  };
}

export function createEmptyMusicForm(nextSeq = 0): MusicFormValues {
  return {
    name: "",
    artistIds: [],
    artistDisplayName: "",
    albumId: "",
    albumTrackNo: "0",
    audioKey: "",
    audioSize: "0",
    audioMime: "",
    audioHash: "",
    lyric: "",
    duration: "0",
    isPublic: true,
    seq: String(nextSeq),
  };
}

export function mapMusicToFormValues(row: MusicRow): MusicFormValues {
  return {
    name: row.name,
    artistIds: row.artists.map((artist) => String(artist.id)),
    artistDisplayName: row.artistDisplayName,
    albumId: row.album ? String(row.album.id) : "",
    albumTrackNo: String(row.albumTrackNo),
    audioKey: row.audioUrl ?? "",
    audioSize: "0",
    audioMime: "",
    audioHash: "",
    lyric: "",
    duration: String(row.duration),
    isPublic: row.isPublic,
    seq: String(row.seq),
  };
}

export function createEmptyArtistForm(): MusicArtistFormValues {
  return { name: "", nameZh: "", avatarKey: "", description: "" };
}

export function mapArtistToFormValues(artist: MusicArtistResp): MusicArtistFormValues {
  return {
    name: artist.name,
    nameZh: artist.name_zh ?? "",
    avatarKey: artist.avatar_url ?? "",
    description: artist.description ?? "",
  };
}

export function createEmptyAlbumForm(): MusicAlbumFormValues {
  return { name: "", artistId: "", coverKey: "", releaseDate: "", description: "" };
}

export function mapAlbumToFormValues(album: MusicAlbumResp): MusicAlbumFormValues {
  return {
    name: album.name,
    artistId: album.artist ? String(album.artist.id) : "",
    coverKey: album.cover_url ?? "",
    releaseDate: album.release_date ?? "",
    description: album.description ?? "",
  };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "未记录";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function uploadRespToValue(resp: MusicUploadResp): MusicUploadValue {
  return {
    key: resp.key,
    url: resp.url,
    size: resp.size,
    mime: resp.mime,
    hash: resp.hash,
  };
}

export function applyAudioUpload(
  values: MusicFormValues,
  upload: MusicUploadValue,
): MusicFormValues {
  return {
    ...values,
    audioKey: upload.key,
    audioSize: String(upload.size),
    audioMime: upload.mime,
    audioHash: upload.hash,
  };
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return Number(trimmed);
}

function nonNegativeInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}

export function validateMusicForm(values: MusicFormValues): MusicFormErrors {
  const errors: MusicFormErrors = {};
  if (!values.name.trim()) errors.name = "请输入曲名";
  if (values.artistIds.length === 0) errors.artistIds = "请选择至少一位歌手";
  if (!values.audioKey.trim()) errors.audioKey = "请上传或填写音频 key";
  if (!nonNegativeInteger(values.albumTrackNo)) errors.albumTrackNo = "曲序必须是非负整数";
  if (!nonNegativeInteger(values.duration)) errors.duration = "时长必须是非负整数";
  if (!nonNegativeInteger(values.seq)) errors.seq = "排序必须是非负整数";
  return errors;
}

export function validateArtistForm(values: MusicArtistFormValues): MusicArtistFormErrors {
  const errors: MusicArtistFormErrors = {};
  if (!values.name.trim()) errors.name = "请输入歌手名";
  return errors;
}

export function validateAlbumForm(values: MusicAlbumFormValues): MusicAlbumFormErrors {
  const errors: MusicAlbumFormErrors = {};
  if (!values.name.trim()) errors.name = "请输入专辑名";
  return errors;
}

export function hasFormErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

export function toMusicSaveReq(values: MusicFormValues): MusicSaveReq {
  return {
    name: values.name.trim(),
    artist_ids: values.artistIds.map(Number),
    artist_display_name: optionalString(values.artistDisplayName),
    album_id: optionalNumber(values.albumId),
    album_track_no: Number(values.albumTrackNo),
    audio_key: values.audioKey.trim(),
    audio_size: Number(values.audioSize || 0),
    audio_mime: optionalString(values.audioMime),
    audio_hash: optionalString(values.audioHash),
    lyric: optionalString(values.lyric),
    duration: Number(values.duration),
    is_public: values.isPublic,
    seq: Number(values.seq),
  };
}

export function toArtistSaveReq(values: MusicArtistFormValues): MusicArtistSaveReq {
  return {
    name: values.name.trim(),
    name_zh: optionalString(values.nameZh),
    avatar_key: optionalString(values.avatarKey),
    description: optionalString(values.description),
  };
}

export function toAlbumSaveReq(values: MusicAlbumFormValues): MusicAlbumSaveReq {
  return {
    name: values.name.trim(),
    artist_id: optionalNumber(values.artistId),
    cover_key: optionalString(values.coverKey),
    release_date: optionalString(values.releaseDate),
    description: optionalString(values.description),
  };
}

export function suggestNextMusicSeq(items: MusicItemResp[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.seq)) + 1;
}

export function matchMusicSearch(row: MusicRow, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return (
    row.name.toLowerCase().includes(normalized) ||
    row.artistDisplayName.toLowerCase().includes(normalized) ||
    row.albumName.toLowerCase().includes(normalized)
  );
}

export function filterAndSortMusicRows(rows: MusicRow[], state: DataTableState): MusicRow[] {
  const visibility = String(state.filters.visibility ?? "all");
  const filtered = rows.filter((row) => {
    const matchesVisibility =
      visibility === "all" || (visibility === "public" ? row.isPublic : !row.isPublic);
    return matchesVisibility && matchMusicSearch(row, state.searchValue);
  });

  if (!state.sort) return filtered;
  const { column, direction } = state.sort;
  const sorted = [...filtered].sort((a, b) => {
    let result = 0;
    if (column === "seq") result = a.seq - b.seq;
    if (column === "name") result = a.name.localeCompare(b.name, "zh-Hans-CN");
    if (column === "duration") result = a.duration - b.duration;
    return direction === "descending" ? -result : result;
  });
  return sorted;
}

export function countMusicStatus(rows: MusicRow[]): MusicStatusCounts {
  return rows.reduce<MusicStatusCounts>(
    (counts, row) => {
      counts.total += 1;
      if (row.isPublic) counts.publicCount += 1;
      if (!row.isPublic) counts.hiddenCount += 1;
      if (row.audioUrl) counts.withAudioCount += 1;
      return counts;
    },
    { total: 0, publicCount: 0, hiddenCount: 0, withAudioCount: 0 },
  );
}

export const MUSIC_TABLE_DEFAULT_STATE: DataTableState = {
  searchValue: "",
  filters: { visibility: "all" },
  sort: { column: "seq", direction: "ascending" },
};

export const musicTableQueryCodec = createClientTableQueryCodec({
  defaultState: MUSIC_TABLE_DEFAULT_STATE,
  sortColumns: ["seq", "name", "duration"],
});
