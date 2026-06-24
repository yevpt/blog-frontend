export interface MusicItemResp {
  id: number;
  name: string;
  singer: string;
  album: string;
  url?: string;
  cover_img_url?: string;
  duration: number;
  seq: number;
}

export interface MusicListResp {
  list: MusicItemResp[];
}
