"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
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

interface Props {
  items: SnippetImageItem[];
  onChange: (next: SnippetImageItem[]) => void;
  disabled?: boolean;
}

export function SnippetImageUploader({ items, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const room = MAX_IMAGES - items.length;
    const picked = Array.from(fileList).slice(0, Math.max(0, room));
    const added: SnippetImageItem[] = [];
    for (const file of picked) {
      try {
        const compressed = await compressImage(file);
        added.push({
          id: crypto.randomUUID(),
          file: compressed,
          previewUrl: URL.createObjectURL(compressed),
        });
      } catch (err) {
        addToast(err instanceof Error ? err.message : "图片处理失败", "error");
      }
    }
    if (added.length > 0) onChange([...items, ...added]);
    if (inputRef.current) inputRef.current.value = "";
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
            {items.length < MAX_IMAGES && (
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
        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        aria-label="删除图片"
        onClick={onRemove}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#15171a] shadow-sm hover:bg-zinc-100"
      >
        <SvgIcon name="close" size={12} />
      </button>
    </div>
  );
}
