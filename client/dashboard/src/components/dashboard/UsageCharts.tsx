"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

interface UsageEvent {
  id: string;
  date: string;
  type: string;
  resource: string;
  quantity: string;
  cost: number;
}

interface UsageChartsProps {
  events: UsageEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  storage: "#8B5CF6",    // violet-500
  egress: "#F59E0B",     // warning
  transcode: "#EC4899",  // pink-500
  default: "#00F0FF",    // accent-motion
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-borderSubtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-text-primary mb-2 capitalize">{label} Cost</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-text-muted">Cost:</span>
            <span className="font-mono font-bold text-text-primary">${p.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function UsageCharts({ events }: UsageChartsProps) {
  // Aggregate cost by type
  const costByType = useMemo(() => {
    const agg = events.reduce((acc, ev) => {
      const t = ev.type.toLowerCase();
      acc[t] = (acc[t] || 0) + ev.cost;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(agg)
      .map(([type, cost]) => ({
        type,
        cost,
        fill: TYPE_COLORS[type] || TYPE_COLORS.default,
      }))
      .filter((d) => d.cost > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [events]);

  if (costByType.length === 0) return null;

  return (
    <Card className="bg-surface border-borderSubtle shadow-sm col-span-full mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display text-text-primary">Cost Breakdown</CardTitle>
        <CardDescription className="text-xs">Total cost by resource type this billing cycle</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis 
                dataKey="type" 
                stroke="#666" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
              />
              <YAxis 
                stroke="#666" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar 
                dataKey="cost" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={60}
                animationDuration={1200}
              >
                {costByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
