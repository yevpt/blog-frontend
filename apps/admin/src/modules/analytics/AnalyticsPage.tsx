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
    <div className="grid gap-7">
      <AdminPageHeader
        title="数据统计"
        description="站点流量、受众与来源、页面、友链、实时与路径分析"
        action={<AnalyticsRangeControl range={range} />}
      />
      <Tabs defaultSelectedKey="trend" className="grid gap-5">
        <TabsList
          variant="underline"
          aria-label="数据统计分类"
          className="w-full gap-6 border-border/70 px-1"
        >
          <TabsItem id="trend" variant="underline">
            趋势
          </TabsItem>
          <TabsItem id="audience" variant="underline">
            受众与来源
          </TabsItem>
          <TabsItem id="pages" variant="underline">
            页面
          </TabsItem>
          <TabsItem id="friends" variant="underline">
            友链
          </TabsItem>
          <TabsItem id="realtime" variant="underline">
            实时
          </TabsItem>
          <TabsItem id="paths" variant="underline">
            路径漏斗
          </TabsItem>
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
      <section aria-label="数据维护" className="border-t border-border/60 pt-7">
        <AnalyticsBackfillTool range={range.query} />
      </section>
    </div>
  );
}
