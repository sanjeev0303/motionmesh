"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatBytes } from "@/lib/utils";
import { Bucket, Video } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

interface DashboardChartsProps {
  buckets: Bucket[];
  videos: Video[];
}

const STATUS_COLORS = {
  ready:      "#10B981",
  processing: "#00F0FF",
  queued:     "#F59E0B",
  failed:     "#EF4444",
};

const BUCKET_COLORS = ["#00F0FF", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

const CustomTooltipArea = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-text-primary mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-text-muted capitalize">{p.name}:</span>
            <span className="font-mono font-bold text-text-primary">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold text-text-primary">{payload[0].name}</p>
        <p className="text-text-muted font-mono">{formatBytes(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ buckets, videos }: DashboardChartsProps) {
  // Last 14 days: video uploads + processing activity
  const timelineData = useMemo(() => {
    const days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });

    const uploadsByDate = videos.reduce((acc, v) => {
      const d = v.created_at.split("T")[0];
      if (days.includes(d)) acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return days.map((date) => {
      const d = new Date(date);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        uploaded: uploadsByDate[date] || 0,
      };
    });
  }, [videos]);

  // Video status breakdown
  const statusData = useMemo(() => {
    const counts = { ready: 0, processing: 0, queued: 0, failed: 0 };
    videos.forEach((v) => { if (v.status in counts) counts[v.status as keyof typeof counts]++; });
    return Object.entries(counts)
      .filter(([, val]) => val > 0)
      .map(([name, value]) => ({ name, value }));
  }, [videos]);

  // Storage by bucket (donut)
  const storageData = useMemo(() => {
    return buckets
      .filter((b) => Number(b.storageUsedBytes) > 0)
      .map((b) => ({ name: b.name, value: Number(b.storageUsedBytes) }));
  }, [buckets]);

  // Total storage for centre label
  const totalStorage = storageData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      {/* Row 1: Upload timeline (wide) + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Activity – Area Chart */}
        <Card className="lg:col-span-2 bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">Upload Activity</CardTitle>
            <CardDescription className="text-xs">Videos uploaded over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} interval={1} />
                  <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltipArea />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="uploaded"
                    stroke="#00F0FF"
                    strokeWidth={2}
                    fill="url(#uploadGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00F0FF", stroke: "#000", strokeWidth: 2 }}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Video Status Breakdown */}
        <Card className="bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">Video Status</CardTitle>
            <CardDescription className="text-xs">Breakdown by processing state</CardDescription>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
                No video data
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {(["ready", "processing", "queued", "failed"] as const).map((status) => {
                  const count = videos.filter((v) => v.status === status).length;
                  const pct = videos.length > 0 ? Math.round((count / videos.length) * 100) : 0;
                  const icons = {
                    ready:      <CheckCircle2 className="w-3.5 h-3.5" />,
                    processing: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
                    queued:     <Clock className="w-3.5 h-3.5" />,
                    failed:     <AlertCircle className="w-3.5 h-3.5" />,
                  };
                  return (
                    <div key={status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5" style={{ color: STATUS_COLORS[status] }}>
                          {icons[status]}
                          <span className="capitalize font-medium">{status}</span>
                        </div>
                        <span className="text-text-muted font-mono">{count} <span className="text-text-muted/50">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-surface-raised overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: STATUS_COLORS[status] }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
                  <div className="text-center">
                    <p className="text-2xl font-display font-bold text-text-primary">{videos.length}</p>
                    <p className="text-xs text-text-muted">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display font-bold text-success">
                      {videos.length > 0 ? Math.round((videos.filter((v) => v.status === "ready").length / videos.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-text-muted">Ready</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Storage donut + Bucket storage bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Distribution Donut */}
        <Card className="bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">Storage Distribution</CardTitle>
            <CardDescription className="text-xs">Total: {formatBytes(totalStorage)}</CardDescription>
          </CardHeader>
          <CardContent>
            {storageData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
                No storage data
              </div>
            ) : (
              <div className="h-[240px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storageData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1200}
                    >
                      {storageData.map((_, i) => (
                        <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span className="text-text-muted text-xs">{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-10%" }}>
                  <div className="text-center">
                    <p className="text-lg font-display font-bold text-text-primary">{formatBytes(totalStorage, 0)}</p>
                    <p className="text-[10px] text-text-muted">used</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-Bucket Storage Bar */}
        <Card className="bg-bg-surface border-border-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display text-text-primary">Bucket Storage</CardTitle>
            <CardDescription className="text-xs">Storage used per bucket (bytes)</CardDescription>
          </CardHeader>
          <CardContent>
            {buckets.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
                No buckets found
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={buckets.map((b) => ({ name: b.name.slice(0, 14), storage: Number(b.storageUsedBytes) }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#666"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatBytes(v, 0)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#666"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(v: any) => [formatBytes(Number(v)), "Storage"]}
                      contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="storage" radius={[0, 4, 4, 0]} maxBarSize={18} animationDuration={1200}>
                      {buckets.map((_, i) => (
                        <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
