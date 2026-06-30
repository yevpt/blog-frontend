import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ApiError, type AdminRecommendItemResp } from "@repo/api";
import { SvgIcon } from "@repo/icons";
import { Button, Modal, cn, CdnResponsiveImage } from "@repo/ui";
import { apiClient } from "../../../lib/api";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import { moveItem } from "../move-item";
import type { ArticleStatus } from "../model";

interface RecommendSortDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const contentInsetClassName = "px-4 sm:px-5";

function mapRecommendStatus(status: number): ArticleStatus {
  switch (status) {
    case 1:
      return "published";
    case 2:
      return "encrypted";
    default:
      return "hidden";
  }
}

function SortableRecommendRow({ item, index }: { item: AdminRecommendItemResp; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5",
        isDragging && "z-10 shadow-md ring-2 ring-ring/40",
      )}
    >
      <button
        type="button"
        aria-label={`拖拽调整第 ${index + 1} 位：${item.title}`}
        className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <SvgIcon name="menu" size={16} />
      </button>
      <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.cover_img_url ? (
          <CdnResponsiveImage
            src={item.cover_img_url}
            alt=""
            preset="thumbnail"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            无封面
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
      </div>
      <ArticleStatusBadge status={mapRecommendStatus(item.status)} />
    </li>
  );
}

export function RecommendSortDialog({ open, onClose, onSaved }: RecommendSortDialogProps) {
  const [items, setItems] = useState<AdminRecommendItemResp[]>([]);
  const [initialIds, setInitialIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);

    void apiClient.articles
      .listRecommendedAdmin()
      .then((resp) => {
        if (cancelled) return;
        setItems(resp.list);
        setInitialIds(resp.list.map((item) => item.id));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "加载推荐文章失败，请稍后重试");
        setItems([]);
        setInitialIds([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const currentIds = useMemo(() => items.map((item) => item.id), [items]);
  const isDirty = useMemo(() => {
    if (currentIds.length !== initialIds.length) return true;
    return currentIds.some((id, index) => id !== initialIds[index]);
  }, [currentIds, initialIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    setItems(moveItem(items, from, to));
    setSaveError(null);
  };

  const handleSave = async () => {
    if (items.length === 0 || !isDirty) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiClient.articles.reorderRecommendedAdmin({ article_ids: currentIds });
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isLoading || isSaving;

  return (
    <Modal
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      isDismissable={!isBusy}
      placement="fullscreen-mobile"
      size="lg"
      aria-label="推荐文章排序"
      dialogClassName="min-h-0 min-w-0 flex-1 overflow-x-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <div
          className={cn(
            "shrink-0 border-b border-border/70",
            contentInsetClassName,
            "py-4 max-md:pt-[max(1rem,env(safe-area-inset-top))]",
          )}
        >
          <h2 className="text-lg font-semibold text-foreground">推荐排序</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            拖拽调整首页推荐文章顺序，越靠前越优先展示。
          </p>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          <div className={cn(contentInsetClassName, "py-5")}>
            {loadError ? (
              <p role="alert" className="text-sm text-destructive">
                {loadError}
              </p>
            ) : null}

            {isLoading ? <p className="text-sm text-muted-foreground">正在加载推荐文章…</p> : null}

            {!isLoading && !loadError && items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">还没有推荐文章</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  在文章编辑页开启「推荐到首页」后，可在这里调整顺序。
                </p>
              </div>
            ) : null}

            {!isLoading && !loadError && items.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={currentIds} strategy={verticalListSortingStrategy}>
                  <ul className="grid gap-2" aria-label="推荐文章列表">
                    {items.map((item, index) => (
                      <SortableRecommendRow key={item.id} item={item} index={index} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : null}

            {saveError ? (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {saveError}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col-reverse gap-2 border-t border-border/70 sm:flex-row sm:justify-end",
            contentInsetClassName,
            "py-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Button variant="outline" onPress={onClose} isDisabled={isBusy}>
            取消
          </Button>
          <Button
            onPress={() => void handleSave()}
            isDisabled={isBusy || items.length === 0 || !isDirty}
          >
            {isSaving ? "保存中…" : "保存排序"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
