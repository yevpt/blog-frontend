import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminModerationRuleMetadataResp, AdminModerationRulePageResp } from "@repo/api";
import { useAdminListQuery } from "../../../../lib/admin-list-query";
import { apiClient } from "../../../../lib/api";
import {
  buildLabelMaps,
  mapRuleToRow,
  ruleListQueryCodec,
  toListReq,
  type RuleFilters,
  type RuleRow,
} from "../model";

export type { RuleFilters, RuleRow };

export interface UseRuleListResult {
  rows: RuleRow[];
  pageData: AdminModerationRulePageResp | null;
  isLoading: boolean;
  error: Error | null;
  filters: RuleFilters;
  setFilter: <K extends keyof RuleFilters>(key: K, value: RuleFilters[K]) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  nextPage: () => void;
  previousPage: () => void;
  reload: () => void;
  searchError?: string;
}

const EMPTY_LABELS = buildLabelMaps(null);

export function useRuleList(enabled = true): UseRuleListResult {
  const { state, patchState, resetListQuery, hasActiveListQuery } =
    useAdminListQuery(ruleListQueryCodec);
  const { filters } = state;

  const [pageData, setPageData] = useState<AdminModerationRulePageResp | null>(null);
  const [metadata, setMetadata] = useState<AdminModerationRuleMetadataResp | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [cursorStack, setCursorStack] = useState<number[]>([]);
  const [currentCursor, setCurrentCursor] = useState<number | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState(0);
  const requestSeq = useRef(0);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  const query = useMemo(() => toListReq(filters, currentCursor), [filters, currentCursor]);

  useEffect(() => {
    if (!enabled) return undefined;

    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    let cancelled = false;

    async function loadRules() {
      setIsLoading(true);
      setError(null);
      try {
        const [data, meta] = await Promise.all([
          apiClient.moderation.rules.list(query),
          apiClient.moderation.rules.metadata(),
        ]);
        if (cancelled || requestSeq.current !== seq) return;
        setMetadata(meta);
        setPageData(data);
      } catch (err) {
        if (cancelled || requestSeq.current !== seq) return;
        setError(err instanceof Error ? err : new Error("加载规则列表失败"));
        setPageData(null);
      } finally {
        if (!cancelled && requestSeq.current === seq) setIsLoading(false);
      }
    }

    void loadRules();
    return () => {
      cancelled = true;
    };
  }, [enabled, query, reloadToken]);

  const labelMaps = useMemo(() => buildLabelMaps(metadata), [metadata]);
  const rows = useMemo(
    () => pageData?.list.map((rule) => mapRuleToRow(rule, labelMaps)) ?? [],
    [labelMaps, pageData],
  );

  const resetCursorStack = useCallback(() => {
    setCursorStack([]);
    setCurrentCursor(undefined);
  }, []);

  const setFilter = useCallback(
    <K extends keyof RuleFilters>(key: K, value: RuleFilters[K]) => {
      resetCursorStack();
      patchState((previous) => ({
        ...previous,
        filters: { ...previous.filters, [key]: value },
      }));
    },
    [patchState, resetCursorStack],
  );

  const resetFilters = useCallback(() => {
    resetCursorStack();
    resetListQuery();
  }, [resetCursorStack, resetListQuery]);

  const nextPage = useCallback(() => {
    if (!pageData?.has_more) return;
    setCursorStack((stack) => [...stack, currentCursor ?? 0]);
    setCurrentCursor(pageData.next_cursor);
  }, [currentCursor, pageData]);

  const previousPage = useCallback(() => {
    setCursorStack((stack) => {
      if (stack.length === 0) return stack;
      const nextStack = [...stack];
      const previousCursor = nextStack.pop();
      setCurrentCursor(previousCursor === 0 ? undefined : previousCursor);
      return nextStack;
    });
  }, []);

  const searchError = useMemo(() => {
    const pattern = filters.pattern.trim();
    if (!pattern) return undefined;
    if (filters.searchMode === "exact" && pattern.length > 500) {
      return "精确搜索最长 500 字符";
    }
    return undefined;
  }, [filters.pattern, filters.searchMode]);

  return {
    rows,
    pageData,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters: hasActiveListQuery,
    canGoPrevious: cursorStack.length > 0,
    canGoNext: Boolean(pageData?.has_more),
    nextPage,
    previousPage,
    reload,
    searchError,
  };
}

// 供测试断言默认标签映射
export { EMPTY_LABELS };
