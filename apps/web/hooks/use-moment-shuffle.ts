"use client";

import { useCallback, useRef, useState } from "react";
import type { MomentItemResp, MomentPageResp } from "@repo/api";
import { addToast } from "@/lib/toast";
import { apiJson, getApiErrorMessage } from "@/lib/client-fetch";
import { buildQuery } from "@/lib/query";

/** 已展示 ID 滑动窗口上限：约 10 批（每批 3 条），超出后丢弃最旧的，避免 URL 无限增长 */
const MAX_TRACKED_SHOWN_IDS = 30;

export interface UseMomentShuffleOptions {
  pageSize: number;
  /** 首屏已展示的碎语 ID，作为窗口初始值，避免第一次换一批就摸到首屏内容 */
  initialMomentIds: number[];
  onShuffled: (list: MomentItemResp[]) => void;
}

/** 首页碎语「换一批」：从全站公开碎语池随机抽样，尽量不重复展示最近出现过的内容 */
export function useMomentShuffle({
  pageSize,
  initialMomentIds,
  onShuffled,
}: UseMomentShuffleOptions) {
  const shownIdsRef = useRef<number[]>(initialMomentIds);
  const isShufflingRef = useRef(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const shuffle = useCallback(async () => {
    if (isShufflingRef.current) return;

    isShufflingRef.current = true;
    setIsShuffling(true);
    try {
      const qs = buildQuery({
        page_size: pageSize,
        random: true,
        exclude_ids: shownIdsRef.current.join(","),
      });
      const data = await apiJson<MomentPageResp>(`/api/moments?${qs}`);
      shownIdsRef.current = [...shownIdsRef.current, ...data.list.map((moment) => moment.id)].slice(
        -MAX_TRACKED_SHOWN_IDS,
      );
      onShuffled(data.list);
    } catch (err) {
      addToast(getApiErrorMessage(err, "换一批失败，请稍后重试"), "error");
    } finally {
      isShufflingRef.current = false;
      setIsShuffling(false);
    }
  }, [onShuffled, pageSize]);

  return { shuffle, isShuffling };
}
