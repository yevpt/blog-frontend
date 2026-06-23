import { useMemo, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Autocomplete, Button } from "@repo/ui";
import { tagOptions, type ArticleTag } from "../editor-options";

interface ArticleTagPickerProps {
  selectedTags: ArticleTag[];
  onChange: (tags: ArticleTag[]) => void;
}

function RemovableTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-fit items-center gap-0.5 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-secondary-foreground">
      {label}
      <Button
        type="button"
        variant="ghost"
        aria-label={`移除 ${label}`}
        className="size-4 shrink-0 rounded-full p-0 text-muted-foreground shadow-none hover:bg-foreground/8 hover:text-foreground"
        onPress={onRemove}
      >
        <SvgIcon name="close" size={10} />
      </Button>
    </span>
  );
}

export function ArticleTagPicker({ selectedTags, onChange }: ArticleTagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableTags = useMemo(
    () => tagOptions.filter((tag) => !selectedTags.some((selected) => selected.id === tag.id)),
    [selectedTags],
  );

  const handleAddTag = (key: string | number) => {
    const nextTag = tagOptions.find((tag) => tag.id === String(key));
    if (!nextTag) return;

    onChange([...selectedTags, nextTag]);
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((tag) => tag.id !== tagId));
  };

  return (
    <div role="group" aria-label="文章标签" className="flex flex-wrap gap-2">
      {selectedTags.map((tag) => (
        <RemovableTag key={tag.id} label={tag.label} onRemove={() => handleRemoveTag(tag.id)} />
      ))}

      <Autocomplete.Trigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <Button
          type="button"
          variant="ghost"
          className="h-auto max-w-fit gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shadow-none hover:bg-primary/15 hover:text-primary"
        >
          <SvgIcon name="plus" size={10} />
          增加标签
        </Button>
        <Autocomplete.Popover className="w-64 overflow-hidden p-2">
          <Autocomplete key={String(isOpen)}>
            <Autocomplete.SearchField
              aria-label="搜索标签"
              placeholder="搜索标签"
              size="sm"
              groupClassName="bg-card"
            />
            <Autocomplete.Menu
              aria-label="标签候选"
              items={availableTags}
              onAction={handleAddTag}
              renderEmptyState={() => (
                <div className="px-3 py-5 text-center text-xs text-muted-foreground">
                  没有可添加的标签
                </div>
              )}
              className="max-h-56"
            >
              {(tag) => <Autocomplete.Item id={tag.id} label={tag.label} />}
            </Autocomplete.Menu>
          </Autocomplete>
        </Autocomplete.Popover>
      </Autocomplete.Trigger>
    </div>
  );
}
