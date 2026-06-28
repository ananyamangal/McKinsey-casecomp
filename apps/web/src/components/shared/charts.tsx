"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@halo/types";

export const CHART_COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#e11d48", "#475569"];

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AreaTrend({
  data,
  height = 240,
  color = CHART_COLORS[0],
  valueFormatter,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={valueFormatter} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#area-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({
  data,
  height = 240,
  color = CHART_COLORS[2],
  valueFormatter,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={valueFormatter} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Line type="monotone" dataKey="value" name="Value" stroke={color} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({
  data,
  height = 240,
  color = CHART_COLORS[0],
  valueFormatter,
}: {
  data: TrendPoint[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={48} tickFormatter={valueFormatter} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Bar dataKey="value" name="Value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  valueFormatter,
}: {
  data: TrendPoint[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ChartLegend({ data }: { data: TrendPoint[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-1.5 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
          />
          <span className="text-muted-foreground">{d.label}</span>
          <span className="font-medium text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
