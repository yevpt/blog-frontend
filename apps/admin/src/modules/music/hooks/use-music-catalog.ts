import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, type MusicAlbumResp, type MusicArtistResp, type MusicItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";
import { mapMusicToRow, type MusicRow } from "../model";

const ADMIN_MUSIC_PAGE_SIZE = 100;

type MusicCatalogResponse = [
  { list: MusicItemResp[] },
  { list: MusicArtistResp[] },
  { list: MusicAlbumResp[] },
];

export interface UseMusicCatalogResult {
  musicItems: MusicItemResp[];
  rows: MusicRow[];
  artists: MusicArtistResp[];
  albums: MusicAlbumResp[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMusicCatalog(): UseMusicCatalogResult {
  const [musicItems, setMusicItems] = useState<MusicItemResp[]>([]);
  const [artists, setArtists] = useState<MusicArtistResp[]>([]);
  const [albums, setAlbums] = useState<MusicAlbumResp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(async () => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      setError(null);

      try {
        const [musicResp, artistResp, albumResp] = await loadMusicCatalog();
        if (cancelled) return;
        setMusicItems(musicResp.list);
        setArtists(artistResp.list);
        setAlbums(albumResp.list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载音乐资料库失败"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const rows = useMemo(() => musicItems.map(mapMusicToRow), [musicItems]);

  return { musicItems, rows, artists, albums, isLoading, error, refetch };
}

async function loadMusicCatalog(): Promise<MusicCatalogResponse> {
  try {
    const [musicResp, artistResp, albumResp] = await Promise.all([
      apiClient.music.listAdmin({ page: 1, page_size: ADMIN_MUSIC_PAGE_SIZE }),
      apiClient.music.listArtistsAdmin(),
      apiClient.music.listAlbumsAdmin(),
    ]);
    return [musicResp, artistResp, albumResp];
  } catch (err) {
    if (!(err instanceof ApiError) || err.code !== 404) {
      throw err;
    }
    const musicResp = await apiClient.music.list();
    return [musicResp, { list: [] }, { list: [] }];
  }
}
