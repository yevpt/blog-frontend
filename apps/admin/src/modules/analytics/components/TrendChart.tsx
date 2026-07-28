import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsTrendPoint } from "@repo/api";

interface TrendChartProps {
  data: AnalyticsTrendPoint[];
}

/** 趋势面积图：品牌紫渐变填充、无竖向网格、细线。 */
export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="var(--color-border, #e5e7eb)"
          strokeDasharray="2 4"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground, #9ca3af)" }}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground, #9ca3af)" }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border, #e5e7eb)" }}
          contentStyle={{
            borderRadius: 8,
            border: "0.5px solid var(--color-border, #e5e7eb)",
            background: "var(--color-card, #fff)",
            color: "var(--color-card-foreground, inherit)",
            fontSize: 13,
          }}
          labelFormatter={(d) => `日期 ${String(d)}`}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
