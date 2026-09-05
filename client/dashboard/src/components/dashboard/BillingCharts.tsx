"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Wallet } from "lucide-react";
import { useApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

interface UsageEvent {
  id: string;
  date: string;
  type: string;
  resource: string;
  quantity: string;
  cost: number;
}

interface BillingChartsProps {
  subscription?: any;
}

const CustomTooltipCost = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-text-primary mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-text-muted capitalize">{p.name}:</span>
            <span className="font-mono font-bold text-text-primary">${Number(p.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function BillingCharts({ subscription }: BillingChartsProps) {
  const api = useApi();

  const { data: events, isLoading } = useQuery<UsageEvent[]>({
    queryKey: ["billing", "usage-events"],
    queryFn: async () => {
      const { data, response } = await api.GET("/v1/billing/usage-events" as any, {});
      if (!response.ok) return [];
      return (data as unknown as UsageEvent[]) ?? [];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const usageEvents = events ?? [];

  // "This month" recorded cost (events within the current calendar month)
  const monthCost = useMemo(() => {
    const now = new Date();
    return usageEvents.reduce((sum, ev) => {
      const d = new Date(ev.date);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        sum += ev.cost || 0;
      }
      return sum;
    }, 0);
  }, [usageEvents]);

  // Last 14 days cost timeline (mirrors the usage page bucketing)
  const costTimeline = useMemo(() => {
    const days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });
    const byDate = usageEvents.reduce((acc, ev) => {
      const d = ev.date?.split("T")[0];
      if (d && days.includes(d)) acc[d] = (acc[d] || 0) + (ev.cost || 0);
      return acc;
    }, {} as Record<string, number>);
    return days.map((date) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: byDate[date] || 0,
    }));
  }, [usageEvents]);

  const hasUsage = monthCost > 0 || costTimeline.some((d) => d.cost > 0);
  const prepaidBalance = subscription?.prepaidBalance ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 14-day cost timeline */}
      <Card className="lg:col-span-2 bg-bg-surface border-border-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display text-text-primary">Spend (14 days)</CardTitle>
          <CardDescription className="text-xs">Recorded usage cost over the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasUsage && !isLoading ? (
            <div className="h-[240px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
              No usage recorded yet
            </div>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costTimeline} margin={{ top: 10, right: 10, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} interval={1} />
                  <YAxis
                    stroke="#666"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                  />
                  <Tooltip content={<CustomTooltipCost />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#00F0FF"
                    strokeWidth={2}
                    fill="url(#costGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00F0FF", stroke: "#000", strokeWidth: 2 }}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right column: month cost + prepaid balance */}
      <div className="space-y-6">
        <Card className="bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">This Month Cost</CardTitle>
            <CardDescription className="text-xs">Recorded usage this calendar month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-motion/10 text-accent-motion">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className={`text-2xl font-display font-bold tracking-tight text-text-primary ${isLoading && !hasUsage ? "animate-pulse" : ""}`}>
                  ${monthCost.toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-text-muted">Billed via Stripe invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">Prepaid Balance</CardTitle>
            <CardDescription className="text-xs">Funds available for usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-2xl font-display font-bold tracking-tight text-text-primary">
                  ${prepaidBalance.toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-text-muted">Load funds on the billing page</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}