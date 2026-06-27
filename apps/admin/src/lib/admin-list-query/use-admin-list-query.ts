import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AdminListQueryCodec } from "./types";

export interface UseAdminListQueryResult<TState> {
  state: TState;
  patchState: (updater: (previous: TState) => TState) => void;
  resetListQuery: () => void;
  hasActiveListQuery: boolean;
  listSearch: string;
}

export function useAdminListQuery<TState>(
  codec: AdminListQueryCodec<TState>,
): UseAdminListQueryResult<TState> {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => codec.parse(searchParams), [codec, searchParams]);
  const hasActiveListQuery = useMemo(() => codec.hasActive(state), [codec, state]);
  const listSearch = searchParams.toString();

  const patchState = useCallback(
    (updater: (previous: TState) => TState) => {
      setSearchParams((current) => codec.write(updater(codec.parse(current))), { replace: true });
    },
    [codec, setSearchParams],
  );

  const resetListQuery = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    state,
    patchState,
    resetListQuery,
    hasActiveListQuery,
    listSearch,
  };
}
