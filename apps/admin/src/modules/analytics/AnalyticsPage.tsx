import { Tabs, TabsItem, TabsList, TabsPanel, TabsPanels } from "@repo/ui";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AnalyticsBackfillTool } from "./components/AnalyticsBackfillTool";
import { AnalyticsRangeControl } from "./components/AnalyticsRangeControl";
import { useAnalyticsRange } from "./hooks/use-analytics-range";
import { TrendTab } from "./tabs/TrendTab";
import { AudienceTab } from "./tabs/AudienceTab";
import { PagesTab } from "./tabs/PagesTab";
import { FriendsTab } from "./tabs/FriendsTab";
import { RealtimeTab } from "./tabs/RealtimeTab";
import { PathsTab } from "./tabs/PathsTab";

export function AnalyticsPage() {
  const range = useAnalyticsRange();

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="数据统计"
        description="站点流量、受众与来源、页面、友链、实时与路径分析"
        action={<AnalyticsRangeControl range={range} />}
      />
      <AnalyticsBackfillTool range={range.query} />
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
            <TrendTab range={range.query} />
          </TabsPanel>
          <TabsPanel id="audience">
            <AudienceTab range={range.query} />
          </TabsPanel>
          <TabsPanel id="pages">
            <PagesTab range={range.query} />
          </TabsPanel>
          <TabsPanel id="friends">
            <FriendsTab range={range.query} />
          </TabsPanel>
          <TabsPanel id="realtime">
            <RealtimeTab />
          </TabsPanel>
          <TabsPanel id="paths">
            <PathsTab range={range.query} />
          </TabsPanel>
        </TabsPanels>
      </Tabs>
    </div>
  );
}
