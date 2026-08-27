import { SvgIcon, type IconName } from "@repo/icons";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminPanel } from "./AdminPanel";

interface ModulePlaceholderProps {
  title: string;
  icon: IconName;
  description: string;
}

export function ModulePlaceholder({ title, icon, description }: ModulePlaceholderProps) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4">
      <AdminPageHeader title={title} description={description} />

      <AdminPanel
        title="功能建设中"
        description={`已为${title}保留页面结构，业务能力接入后可继续扩展。`}
        contentClassName="p-0 sm:p-0"
      >
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-4 grid size-10 place-items-center rounded-lg bg-primary-soft text-primary ring-1 ring-inset ring-primary/10">
            <SvgIcon name={icon} size={19} />
          </span>
          <p className="text-sm font-semibold tracking-tight text-foreground">等待接入管理能力</p>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
            当前暂无可操作内容；接口与工作流准备完成后，这里会承载列表、筛选与批量操作。
          </p>
        </div>
      </AdminPanel>
    </div>
  );
}
