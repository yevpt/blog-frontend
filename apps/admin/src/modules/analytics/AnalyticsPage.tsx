import { Tabs, TabsItem, TabsList, TabsPanel, TabsPanels } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { TrendTab } from "./tabs/TrendTab";
import { AudienceTab } from "./tabs/AudienceTab";
import { PagesTab } from "./tabs/PagesTab";
import { FriendsTab } from "./tabs/FriendsTab";

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted">
      {name}（建设中）
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="数据统计"
        description="站点流量、受众与来源、页面、友链、实时与路径分析"
      />
      <Tabs defaultSelectedKey="trend">
        <TabsList aria-label="数据统计分类">
          <TabsItem id="trend">趋势</TabsItem>
          <TabsItem id="audience">受众与来源</TabsItem>
          <TabsItem id="pages">页面</TabsItem>
          <TabsItem id="friends">友链</TabsItem>
          <TabsItem id="realtime">实时</TabsItem>
          <TabsItem id="paths">路径漏斗</TabsItem>
        </TabsList>
        <TabsPanels>
          <TabsPanel id="trend">
            <TrendTab />
          </TabsPanel>
          <TabsPanel id="audience">
            <AudienceTab />
          </TabsPanel>
          <TabsPanel id="pages">
            <PagesTab />
          </TabsPanel>
          <TabsPanel id="friends">
            <FriendsTab />
          </TabsPanel>
          <TabsPanel id="realtime">
            <ComingSoon name="实时" />
          </TabsPanel>
          <TabsPanel id="paths">
            <ComingSoon name="路径漏斗" />
          </TabsPanel>
        </TabsPanels>
      </Tabs>
    </div>
  );
}
