import { useCallback, useMemo, useState } from "react";
import { ApiError, type NormalizeAvatarItem, type NormalizeAvatarsResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Card, CardContent, Checkbox, Input } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { addToast } from "../../../lib/toast";

const STATUS_LABELS: Record<string, string> = {
  ok: "已合规",
  updated: "已更新",
  cleared: "已清除",
  skipped: "已跳过",
  failed: "失败",
};

type SubmitMode = "single" | "all";

function parseOptionalUserId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("用户 ID 必须是正整数");
  }
  return parsed;
}

function buildSummary(result: NormalizeAvatarsResp) {
  const storagePart =
    (result.storage_scanned ?? 0) > 0 ? ` · 存储扫描 ${result.storage_scanned}` : "";
  const purgedPart = (result.purged ?? 0) > 0 ? ` · 清理旧图 ${result.purged}` : "";
  return `用户扫描 ${result.scanned}${storagePart} · 更新 ${result.updated} · 已清除 ${result.cleared}${purgedPart} · 已合规 ${result.ok} · 跳过 ${result.skipped} · 失败 ${result.failed}`;
}

function isActionableItem(item: NormalizeAvatarItem) {
  return item.status === "updated" || item.status === "failed" || item.status === "cleared";
}

export function AvatarNormalizeTool() {
  const [userId, setUserId] = useState("");
  const [clearInvalid, setClearInvalid] = useState(false);
  const [submittingMode, setSubmittingMode] = useState<SubmitMode | null>(null);
  const [clearingUserId, setClearingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NormalizeAvatarsResp | null>(null);

  const isBusy = submittingMode !== null;

  const actionableItems = useMemo(() => result?.items.filter(isActionableItem) ?? [], [result]);

  const handleSubmit = useCallback(
    async (mode: SubmitMode) => {
      setError(null);
      let parsedUserId: number | undefined;
      try {
        if (mode === "single") {
          parsedUserId = parseOptionalUserId(userId);
          if (parsedUserId === undefined) {
            throw new Error("处理单个用户时请填写用户 ID");
          }
        } else if (userId.trim() !== "") {
          throw new Error("处理全部用户时请清空用户 ID");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "参数无效";
        setError(message);
        addToast(message, "error");
        return;
      }

      setSubmittingMode(mode);
      try {
        const payload = parsedUserId
          ? { user_id: parsedUserId, clear_invalid: clearInvalid }
          : { clear_invalid: clearInvalid };
        const data = await apiClient.users.normalizeAvatars(payload);
        setResult(data);
        addToast(buildSummary(data), "success");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "头像归一化失败，请稍后重试";
        setError(message);
        addToast(message, "error");
      } finally {
        setSubmittingMode(null);
      }
    },
    [clearInvalid, userId],
  );

  const handleClearAvatar = useCallback(async (item: NormalizeAvatarItem) => {
    setClearingUserId(item.user_id);
    try {
      const data = await apiClient.users.clearUserAvatar(item.user_id);
      setResult((current) => {
        if (!current) return current;
        const nextItems = current.items.map((row) =>
          row.user_id === item.user_id
            ? {
                ...row,
                status: "cleared",
                message: "已清空头像并删除对象",
                old_key: data.old_key ?? row.old_key,
                new_key: undefined,
              }
            : row,
        );
        const failedBefore = current.items.filter((row) => row.status === "failed").length;
        const clearedBefore = current.items.filter((row) => row.status === "cleared").length;
        const failedAfter = nextItems.filter((row) => row.status === "failed").length;
        const clearedAfter = nextItems.filter((row) => row.status === "cleared").length;
        return {
          ...current,
          failed: current.failed - (failedBefore - failedAfter),
          cleared: current.cleared + (clearedAfter - clearedBefore),
          items: nextItems,
        };
      });
      addToast(`已清除用户 #${item.user_id} 的头像`, "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "清除头像失败，请稍后重试";
      addToast(message, "error");
    } finally {
      setClearingUserId(null);
    }
  }, []);

  return (
    <Card className="shrink-0">
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SvgIcon name="image" size={15} />
            <span>头像归一化</span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            检查本站托管头像是否符合 120px、20KB JPEG 规范；不合规则压缩替换（含 GIF 转
            JPEG）。无法处理的文件会列出完整 key，可单独清除。
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/15 p-3 lg:flex-row lg:items-end lg:justify-between">
          <Input
            label="用户 ID"
            size="sm"
            placeholder="留空则处理全部"
            value={userId}
            onChange={setUserId}
            isDisabled={isBusy}
            className="w-full lg:max-w-[10rem]"
            inputClassName="h-8"
          />

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              isLoading={submittingMode === "single"}
              isDisabled={isBusy && submittingMode !== "single"}
              onPress={() => void handleSubmit("single")}
            >
              处理该用户
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={submittingMode === "all"}
              isDisabled={isBusy && submittingMode !== "all"}
              onPress={() => void handleSubmit("all")}
            >
              处理全部
            </Button>
          </div>

          <Checkbox
            isSelected={clearInvalid}
            onChange={setClearInvalid}
            isDisabled={isBusy}
            label="无法处理时自动清除"
            className="lg:pb-1"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {error ? (
            <span role="alert" className="text-destructive">
              {error}
            </span>
          ) : null}
          {!error && result ? <span>{buildSummary(result)}</span> : null}
          {!error && !result ? <span>一般只需执行一次「处理全部」。</span> : null}
        </div>

        {actionableItems.length > 0 ? (
          <div className="min-w-0">
            <p className="mb-2 text-xs text-muted-foreground">
              需关注 {actionableItems.length} 条（表格区域可滚动）
            </p>
            <div className="max-h-48 overflow-auto rounded-md border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90 text-xs text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-3 py-2 font-medium">用户</th>
                    <th className="px-3 py-2 font-medium">状态</th>
                    <th className="px-3 py-2 font-medium">文件</th>
                    <th className="px-3 py-2 font-medium">说明</th>
                    <th className="px-3 py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {actionableItems.map((item) => (
                    <tr key={item.user_id} className="border-t border-border">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">#{item.user_id}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {STATUS_LABELS[item.status] ?? item.status}
                      </td>
                      <td
                        className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs text-foreground"
                        title={item.old_key}
                      >
                        {item.old_key ?? "—"}
                      </td>
                      <td className="min-w-[10rem] px-3 py-2 text-muted-foreground">
                        {item.message ?? (item.new_key ? `已替换为 ${item.new_key}` : "—")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {item.status === "failed" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            isLoading={clearingUserId === item.user_id}
                            isDisabled={clearingUserId !== null && clearingUserId !== item.user_id}
                            onPress={() => void handleClearAvatar(item)}
                          >
                            清除头像
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
