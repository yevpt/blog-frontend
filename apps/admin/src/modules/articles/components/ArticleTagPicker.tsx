import { useMemo, useState } from "react";
import { SvgIcon } from "@repo/icons";
import { Autocomplete, Button } from "@repo/ui";
import { tagOptions, type ArticleTag } from "../editor-options";

interface ArticleTagPickerProps {
  selectedTags: ArticleTag[];
  onChange: (tags: ArticleTag[]) => void;
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
        <Button
          key={tag.id}
          type="button"
          variant="ghost"
          size="sm"
          onPress={() => handleRemoveTag(tag.id)}
          className="h-8 rounded-full bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        >
          {tag.label}
        </Button>
      ))}

      <Autocomplete.Trigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-xs">
          <SvgIcon name="plus" size={14} />
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
