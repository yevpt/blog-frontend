import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminModerationRuleMetadataResp, AdminModerationRuleStatusResp } from "@repo/api";
import { apiClient } from "../../../../lib/api";

const POLL_STATUSES = new Set(["building", "publishing"]);

function shouldPoll(status: AdminModerationRuleStatusResp | null): boolean {
  const candidateStatus = status?.candidate?.status;
  return candidateStatus ? POLL_STATUSES.has(candidateStatus) : false;
}

export interface UseRuleStatusResult {
  status: AdminModerationRuleStatusResp | null;
  metadata: AdminModerationRuleMetadataResp | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useRuleStatus(enabled = true): UseRuleStatusResult {
  const [status, setStatus] = useState<AdminModerationRuleStatusResp | null>(null);
  const [metadata, setMetadata] = useState<AdminModerationRuleMetadataResp | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const statusRef = useRef<AdminModerationRuleStatusResp | null>(null);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextStatus, nextMetadata] = await Promise.all([
          apiClient.moderation.rules.status(),
          apiClient.moderation.rules.metadata(),
        ]);
        if (cancelled) return;
        setStatus(nextStatus);
        setMetadata(nextMetadata);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("加载规则状态失败"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setInterval(() => {
      if (!shouldPoll(statusRef.current)) return;
      void apiClient.moderation.rules.status().then((next) => {
        setStatus(next);
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [enabled, reloadToken]);

  return { status, metadata, isLoading, error, reload };
}
