import { useCallback, useRef } from "react";
import { createIdempotencyKey, type IdempotencyScope } from "@/lib/idempotency-key";

interface IdempotencyKeyState {
  scope: IdempotencyScope;
  fingerprint: string;
  key: string;
}

/** 在一次逻辑提交及其网络重试期间稳定复用幂等键。 */
export function useIdempotencyKey(scope: IdempotencyScope) {
  const stateRef = useRef<IdempotencyKeyState | null>(null);

  const getIdempotencyKey = useCallback(
    (fingerprint: string) => {
      if (stateRef.current?.scope !== scope || stateRef.current.fingerprint !== fingerprint) {
        stateRef.current = { scope, fingerprint, key: createIdempotencyKey(scope) };
      }
      return stateRef.current.key;
    },
    [scope],
  );

  const resetIdempotencyKey = useCallback(() => {
    stateRef.current = null;
  }, []);

  return { getIdempotencyKey, resetIdempotencyKey };
}
