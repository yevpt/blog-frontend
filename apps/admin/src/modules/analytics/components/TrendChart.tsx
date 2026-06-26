import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsTrendPoint } from "@repo/api";

interface TrendChartProps {
  data: AnalyticsTrendPoint[];
}

/** 趋势折线：精致克制风格，单线、无竖向网格、细线。 */
export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid
          stroke="var(--color-border, #e5e7eb)"
          strokeDasharray="2 4"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-muted, #9ca3af)" }}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fontSize: 12, fill: "var(--color-text-muted, #9ca3af)" }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border, #e5e7eb)" }}
          contentStyle={{
            borderRadius: 8,
            border: "0.5px solid var(--color-border, #e5e7eb)",
            fontSize: 13,
          }}
          labelFormatter={(d) => `日期 ${String(d)}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-primary, #4f46e5)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
