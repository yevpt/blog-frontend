import { SvgIcon, type IconName } from "@repo/icons";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

interface ModulePlaceholderProps {
  title: string;
  icon: IconName;
  description: string;
}

export function ModulePlaceholder({ title, icon, description }: ModulePlaceholderProps) {
  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SvgIcon name={icon} size={22} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Button type="button" onPress={() => undefined} className="w-full sm:w-auto">
          <SvgIcon name="plus" size={18} />
          新建
        </Button>
      </section>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>功能建设中</CardTitle>
          <CardDescription>这里会承载{title}的列表、筛选、表单与批量操作。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/35 px-6 py-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SvgIcon name={icon} size={26} />
            </div>
            <p className="text-base font-medium text-foreground">等待接入真实管理能力</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              本期先固定后台框架、导航路径与页面结构，后续接入接口后再补充完整 CRUD。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
