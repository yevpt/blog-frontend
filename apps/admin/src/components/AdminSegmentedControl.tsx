import { Tabs, TabsItem, TabsList, cn } from "@repo/ui";

export interface AdminSegmentedControlOption<T extends string> {
  id: T;
  label: string;
}

interface AdminSegmentedControlProps<T extends string> {
  ariaLabel: string;
  options: ReadonlyArray<AdminSegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** 后台紧凑分段选择器：使用 React Aria Tabs 保证键盘与选择语义。 */
export function AdminSegmentedControl<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  className,
}: AdminSegmentedControlProps<T>) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(key) => {
        const next = options.find((option) => option.id === String(key));
        if (next) onChange(next.id);
      }}
      className={cn("w-auto", className)}
    >
      <TabsList variant="segmented" aria-label={ariaLabel}>
        {options.map((option) => (
          <TabsItem key={option.id} id={option.id} variant="segmented">
            {option.label}
          </TabsItem>
        ))}
      </TabsList>
    </Tabs>
  );
}
