/* global EventSource */
export type ReconnectingEventSourceHandlers = {
  /** 断线重连成功后触发，用于补拉离线期间的数据 */
  onOpen?: () => void;
  onMessage?: (type: string, event: MessageEvent) => void;
};

export type ReconnectingEventSourceOptions = {
  url: string;
  eventTypes: string[];
  handlers: ReconnectingEventSourceHandlers;
  initialRetryDelayMs?: number;
  maxRetryDelayMs?: number;
};

/** 带指数退避的 SSE 连接：原生 EventSource 在 HTTP 错误（如 502）后不会自动重连 */
export function connectReconnectingEventSource(
  options: ReconnectingEventSourceOptions,
): () => void {
  const {
    url,
    eventTypes,
    handlers,
    initialRetryDelayMs = 1_000,
    maxRetryDelayMs = 30_000,
  } = options;

  let cancelled = false;
  let source: EventSource | null = null;
  let retryDelay = initialRetryDelayMs;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let hadFailure = false;

  function clearRetryTimer() {
    if (retryTimer === undefined) return;
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function scheduleReconnect() {
    if (cancelled) return;
    clearRetryTimer();
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, maxRetryDelayMs);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (!cancelled) connect();
    }, delay);
  }

  function connect() {
    if (cancelled) return;
    source?.close();
    source = new EventSource(url);

    source.onopen = () => {
      if (cancelled) return;
      retryDelay = initialRetryDelayMs;
      if (!hadFailure) return;
      hadFailure = false;
      handlers.onOpen?.();
    };

    for (const type of eventTypes) {
      source.addEventListener(type, (event) => {
        handlers.onMessage?.(type, event);
      });
    }

    source.onerror = () => {
      if (cancelled) return;
      // CONNECTING 时浏览器仍在自动重试，勿重复建连
      if (source?.readyState !== EventSource.CLOSED) return;
      hadFailure = true;
      source.close();
      source = null;
      scheduleReconnect();
    };
  }

  connect();

  return () => {
    cancelled = true;
    clearRetryTimer();
    source?.close();
    source = null;
  };
}
