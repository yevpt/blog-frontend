export interface MusicItemResp {
  id: number;
  name: string;
  /** 旧版公开接口字段 */
  singer?: string;
  /** 旧版公开接口返回字符串；新版资料库接口返回专辑对象 */
  album?: string | MusicAlbumResp;
  /** 旧版公开接口字段 */
  url?: string;
  /** 旧版公开接口字段 */
  cover_img_url?: string;
  artist_display_name?: string;
  artists?: MusicArtistResp[];
  album_track_no?: number;
  audio_url?: string;
  cover_url?: string;
  duration: number;
  is_public?: boolean;
  seq: number;
}

export interface MusicDetailResp extends MusicItemResp {
  lyric?: string;
}

export interface MusicListResp {
  list: MusicItemResp[];
}

export interface MusicAdminListReq {
  keyword?: string;
  page?: number;
  page_size?: number;
}

export interface MusicAdminListResp {
  list: MusicItemResp[];
  /** Go int64 — safe as JS number for blog-scale counts */
  total: number;
}

export interface MusicArtistResp {
  id: number;
  name: string;
  name_zh?: string;
  display_name: string;
  avatar_url?: string;
  description?: string;
}

export interface MusicArtistSaveReq {
  id?: number;
  name: string;
  name_zh?: string;
  avatar_key?: string;
  description?: string;
}

export interface MusicArtistListResp {
  list: MusicArtistResp[];
}

export interface MusicAlbumResp {
  id: number;
  name: string;
  artist?: MusicArtistResp;
  cover_url?: string;
  release_date?: string;
  description?: string;
}

export interface MusicAlbumSaveReq {
  id?: number;
  name: string;
  artist_id?: number;
  cover_key?: string;
  release_date?: string;
  description?: string;
}

export interface MusicAlbumListResp {
  list: MusicAlbumResp[];
}

export interface MusicSaveReq {
  id?: number;
  name: string;
  artist_ids: number[];
  artist_display_name?: string;
  album_id?: number;
  album_track_no: number;
  audio_key: string;
  audio_size: number;
  audio_mime?: string;
  audio_hash?: string;
  lyric?: string;
  duration: number;
  is_public: boolean;
  seq: number;
}

export interface MusicUploadReq {
  file: File;
}

export interface MusicUploadResp {
  key: string;
  url: string;
  /** Go uint64 — safe as JS number for uploaded object sizes */
  size: number;
  mime: string;
  hash: string;
}
