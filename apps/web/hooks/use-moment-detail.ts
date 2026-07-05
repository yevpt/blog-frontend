"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MomentDeleteResp, MomentItemResp, MomentLikeResp, MomentTopResp } from "@repo/api";
import { useSession } from "@/app/providers/session-provider";
import { useLoginModal } from "@/store/use-login-modal";
import { addToast } from "@/lib/toast";
import { apiForm, apiJson, ApiClientError, getApiErrorMessage } from "@/lib/client-fetch";
import { useIdempotencyKey } from "@/hooks/use-idempotency-key";
import { normalizeModerationView } from "@/components/moderation";
import { packMomentImagesFormData } from "@/components/moments/pack-moment-images-form-data";
import { momentEditFingerprint } from "@/components/moments/moment-submit-fingerprint";
import { logMomentUploadImages } from "@/components/moments/log-moment-upload-images";
import type { MomentImageItem } from "@/components/moments/types";

/** 碎语详情页的点赞/编辑保存/置顶/删除交互；是 use-moment-list.ts 同名逻辑的单条目版本 */
export function useMomentDetail(initialMoment: MomentItemResp) {
  const router = useRouter();
  const { userId: sessionUserId } = useSession();
  const { open: openLoginModal } = useLoginModal();
  // 编辑碎语复用 moment-edit 幂等键：同载荷重试保留，成功或明确 4xx 后 reset
  const { getIdempotencyKey, resetIdempotencyKey } = useIdempotencyKey("moment-edit");

  const [moment, setMoment] = useState(initialMoment);
  const [likePending, setLikePending] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const toggleLike = useCallback(
    async (target: MomentItemResp) => {
      if (sessionUserId == null) {
        openLoginModal();
        return;
      }
      if (!normalizeModerationView(target.moderation).can_interact) {
        return;
      }
      if (likePending) {
        return;
      }

      setLikePending(true);
      try {
        const data = await apiJson<MomentLikeResp>(`/api/moments/${target.id}/like`, {
          method: "POST",
        });
        setMoment((current) => ({
          ...current,
          is_liked: data.is_liked,
          like_count: data.like_count,
        }));
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            target.is_liked ? "取消点赞失败，请稍后重试" : "点赞失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setLikePending(false);
      }
    },
    [likePending, openLoginModal, sessionUserId],
  );

  const updateMoment = useCallback(
    async (content: string, images: MomentImageItem[]) => {
      if (actionPending) {
        return moment;
      }

      setActionPending(true);
      try {
        const form = new FormData();
        form.append("id", String(moment.id));
        form.append("content", content);
        form.append("status", String(moment.status));
        form.append("comment_status", String(moment.comment_status));
        packMomentImagesFormData(form, images);

        logMomentUploadImages("publish", images);
        const key = getIdempotencyKey(
          momentEditFingerprint(moment.id, content, moment.status, moment.comment_status, images),
        );
        const updated = await apiForm<MomentItemResp>("/api/moments", form, {
          method: "POST",
          headers: { "Idempotency-Key": key },
        });
        resetIdempotencyKey();
        setMoment(updated);
        addToast(updated.moderation?.notice ?? "碎语已更新", "success");
        return updated;
      } catch (err) {
        // 明确 4xx（含高风险拦截、401）后 reset；5xx 与网络错误保留同载荷键以便幂等重试
        if (err instanceof ApiClientError && err.status >= 400 && err.status < 500) {
          resetIdempotencyKey();
        }
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
        } else {
          addToast(getApiErrorMessage(err, "更新失败，请稍后重试"), "error");
        }
        throw err;
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, moment, getIdempotencyKey, resetIdempotencyKey, openLoginModal],
  );

  const toggleTop = useCallback(
    async (target: MomentItemResp) => {
      if (actionPending) {
        return;
      }

      setActionPending(true);
      try {
        const data = await apiJson<MomentTopResp>(`/api/moments/${target.id}/top`, {
          method: target.is_top ? "DELETE" : "POST",
        });
        setMoment((current) => ({ ...current, is_top: data.is_top }));
        addToast(data.is_top ? "已置顶" : "已取消置顶", "success");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(
          getApiErrorMessage(
            err,
            target.is_top ? "取消置顶失败，请稍后重试" : "置顶失败，请稍后重试",
          ),
          "error",
        );
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, openLoginModal],
  );

  const deleteMoment = useCallback(
    async (target: MomentItemResp) => {
      if (actionPending) {
        return;
      }

      setActionPending(true);
      try {
        await apiJson<MomentDeleteResp>(`/api/moments/${target.id}`, { method: "DELETE" });
        addToast("碎语已删除", "success");
        router.push("/moments");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          openLoginModal();
          return;
        }
        addToast(getApiErrorMessage(err, "删除失败，请稍后重试"), "error");
        throw err;
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, openLoginModal, router],
  );

  return { moment, likePending, actionPending, toggleLike, updateMoment, toggleTop, deleteMoment };
}
