"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SvgIcon } from "@repo/icons";
import { ImageViewer } from "@repo/ui";
import { compressImage } from "@/lib/compress-image";
import { addToast } from "@/lib/toast";
import { moveItem } from "./move-item";

const MAX_IMAGES = 9;

export interface SnippetImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

/** 暴露给父组件的命令式句柄：底栏「添加图片」按钮调用 openPicker 触发选图。 */
export interface SnippetImageUploaderHandle {
  openPicker: () => void;
}

interface Props {
  items: SnippetImageItem[];
  onChange: Dispatch<SetStateAction<SnippetImageItem[]>>;
  disabled?: boolean;
}

export const SnippetImageUploader = forwardRef<SnippetImageUploaderHandle, Props>(
  function SnippetImageUploader({ items, onChange, disabled }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    // 正在压缩中的图片数量：选图后立即占位显示 spinner，压缩完成后落入 items。
    const [pendingCount, setPendingCount] = useState(0);
    const sensors = useSensors(
      // 桌面：移动 8px 即开始拖拽（避免 delay+tolerance 把鼠标拖动误判为滚动而无法排序）
      useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
      // 触屏：长按 150ms 触发拖拽，区分于页面滚动
      useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useImperativeHandle(ref, () => ({ openPicker: () => inputRef.current?.click() }), []);

    async function handleFiles(fileList: FileList | null) {
      if (!fileList) return;
      // 名额需同时扣除已入列与压缩中的占位，避免超过上限
      const room = MAX_IMAGES - items.length - pendingCount;
      // 去重：跳过与已添加或本次批量内重名的文件，避免同一张图被重复上传
      const existingNames = new Set(items.map((it) => it.file.name));
      const seen = new Set<string>();
      const picked = Array.from(fileList)
        .filter((f) => {
          if (existingNames.has(f.name) || seen.has(f.name)) return false;
          seen.add(f.name);
          return true;
        })
        .slice(0, Math.max(0, room));
      if (inputRef.current) inputRef.current.value = "";
      if (picked.length === 0) return;

      setPendingCount((c) => c + picked.length);
      for (const file of picked) {
        try {
          const compressed = await compressImage(file);
          const item: SnippetImageItem = {
            id: crypto.randomUUID(),
            file: compressed,
            // 预览 URL 由本组件创建：删除时即时 revoke；其余在父组件关闭/提交时统一释放
            previewUrl: URL.createObjectURL(compressed),
          };
          // 函数式更新：以最新列表为准做权威限量，超额则丢弃并释放其预览 URL
          onChange((prev) => {
            if (prev.length >= MAX_IMAGES) {
              URL.revokeObjectURL(item.previewUrl);
              return prev;
            }
            return [...prev, item];
          });
        } catch (err) {
          addToast(err instanceof Error ? err.message : "图片处理失败", "error");
        } finally {
          setPendingCount((c) => Math.max(0, c - 1));
        }
      }
    }

    function removeAt(index: number) {
      const target = items[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      onChange(items.filter((_, i) => i !== index));
    }

    function handleDragEnd(e: DragEndEvent) {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const from = items.findIndex((it) => it.id === active.id);
      const to = items.findIndex((it) => it.id === over.id);
      onChange(moveItem(items, from, to));
    }

    const canAddMore = items.length + pendingCount < MAX_IMAGES;

    return (
      <div className="px-[2px] py-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-[repeat(3,80px)] justify-start gap-[10px]">
              {items.map((it, index) => (
                <SortableThumb
                  key={it.id}
                  item={it}
                  onPreview={() => setViewerIndex(index)}
                  onRemove={() => removeAt(index)}
                />
              ))}
              {Array.from({ length: pendingCount }).map((_, i) => (
                <LoadingTile key={`pending-${i}`} />
              ))}
              {canAddMore && (
                <button
                  type="button"
                  aria-label="添加图片"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:bg-muted/40"
                >
                  <SvgIcon name="plus" size={22} />
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>

        <input
          ref={inputRef}
          data-testid="snippet-image-input"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        {viewerIndex !== null && (
          <ImageViewer
            images={items.map((it) => ({ src: it.previewUrl }))}
            index={viewerIndex}
            isOpen
            onClose={() => setViewerIndex(null)}
            onIndexChange={setViewerIndex}
          />
        )}
      </div>
    );
  },
);

/** 压缩中的占位格：固定 80px，居中转圈。 */
function LoadingTile() {
  return (
    <div
      aria-label="图片处理中"
      className="flex h-20 w-20 items-center justify-center rounded-md bg-muted/60"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    </div>
  );
}

function SortableThumb({
  item,
  onPreview,
  onRemove,
}: {
  item: SnippetImageItem;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative h-20 w-20 ${isDragging ? "z-10 opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={onPreview}
        {...attributes}
        {...listeners}
        className="block h-full w-full overflow-hidden rounded-md"
      >
        <img src={item.previewUrl} alt={item.file.name} className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        aria-label="删除图片"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white p-0 leading-none text-[#15171a] shadow-sm hover:bg-zinc-100"
      >
        <SvgIcon name="close" size={12} />
      </button>
    </div>
  );
}
