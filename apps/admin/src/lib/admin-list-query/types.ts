export interface AdminListQueryCodec<TState> {
  defaultState: TState;
  parse: (params: URLSearchParams) => TState;
  write: (state: TState) => URLSearchParams;
  hasActive: (state: TState) => boolean;
}
