import { useEffect, useState } from "react";
import type { CategoryTabItem } from "@repo/api";
import type { MusicItemResp } from "@repo/api";
import type { TagItemResp } from "@repo/api";
import { apiClient } from "../../../lib/api";

export function useArticleEditorOptions() {
  const [categories, setCategories] = useState<CategoryTabItem[]>([]);
  const [tags, setTags] = useState<TagItemResp[]>([]);
  const [musicList, setMusicList] = useState<MusicItemResp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setIsLoading(true);
      setError(null);

      try {
        const [categoryResp, tagResp, musicResp] = await Promise.all([
          apiClient.categories.listTabs(),
          apiClient.tags.list(),
          apiClient.music.list(),
        ]);
        if (cancelled) return;
        setCategories(categoryResp.list);
        setTags(tagResp.list);
        setMusicList(musicResp.list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载编辑选项失败"));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, tags, musicList, isLoading, error };
}
