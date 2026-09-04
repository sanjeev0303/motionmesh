"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HardDrive, Video as VideoIcon, Activity, Clock,
  PlayCircle, BookOpen, Key, Database, CheckCircle2,
  AlertCircle, Loader2, ArrowUpRight, Zap, FileVideo,
} from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";
import { useApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Video } from "@/lib/types";
import { motionmesh } from "@motionmesh/sdk";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export default function DashboardClient({
  initialBuckets,
  initialApiKeys,
  initialSubscription,
}: {
  initialBuckets: any[];
  initialApiKeys: any[];
  initialSubscription: any;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const api = useApi();

  useEffect(() => { setIsMounted(true); }, []);

  const { data: serverVideos, isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: async () => motionmesh.videos.list() as unknown as Video[],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: serverBuckets } = useQuery({
    queryKey: ["buckets"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/buckets", {});
      if (error) return [];
      return data as unknown as any[];
    },
    initialData: initialBuckets,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const { data: serverApiKeys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/api-keys", {});
      if (error) return [];
      return data as unknown as any[];
    },
    initialData: initialApiKeys,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const { data: subscription } = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/billing/subscription", {});
      if (error || !response.ok) return null;
      return data as any;
    },
    initialData: initialSubscription,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const videos = serverVideos ?? [];

  /* ── Derived Stats ─────────────────────────────────── */
  const storageUsedBytes = (serverBuckets ?? []).reduce(
    (a: number, b: any) => a + (Number(b.storageUsedBytes) || 0), 0,
  );
  const egressUsedBytes = (serverBuckets ?? []).reduce(
    (a: number, b: any) => a + (Number(b.egressUsedBytes) || 0), 0,
  );
  const totalSizeBytes = videos.reduce((a, v) => a + (Number(v.size_bytes) || 0), 0);

  const readyCount      = videos.filter(v => v.status === "ready").length;
  const processingCount = videos.filter(v => v.status === "processing").length;
  const failedCount     = videos.filter(v => v.status === "failed").length;
  const queuedCount     = videos.filter(v => v.status === "queued").length;
  const activeJobs      = processingCount + queuedCount;

  const totalDurationSec = videos.reduce((a, v) => a + (Number(v.duration) || 0), 0);
  const transcodeMinutes = totalDurationSec / 60;

  // New videos in last 7 days
  const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newVideos7d = videos.filter(v => new Date(v.created_at).getTime() > cutoff7d).length;

  const recentVideos = useMemo(() => [...videos]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5), [videos]);

  const recentActivity = useMemo(() => [
    ...(serverVideos ?? []).map(v => ({
      id: `vid-${v.id}`,
      icon: <FileVideo className="w-3.5 h-3.5 text-accent-motion" />,
      action: "Video uploaded",
      resource: v.title,
      timestamp: v.created_at,
    })),
    ...(serverBuckets ?? []).map((b: any) => ({
      id: `bkt-${b.id}`,
      icon: <Database className="w-3.5 h-3.5 text-accent-mesh" />,
      action: "Bucket created",
      resource: b.name,
      timestamp: b.createdAt ?? b.created_at ?? "1970-01-01T00:00:00Z",
    })),
    ...(serverApiKeys ?? []).map((k: any) => ({
      id: `key-${k.id}`,
      icon: <Key className="w-3.5 h-3.5 text-warning" />,
      action: "API key created",
      resource: k.name ?? "default",
      timestamp: k.createdAt ?? k.created_at ?? "1970-01-01T00:00:00Z",
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6), [serverVideos, serverBuckets, serverApiKeys]);

  if (!isMounted) return null;

  /* ── Stat Card helper ─────────────────────────────── */
  const StatCard = ({
    title, value, icon: Icon, color, sub, loading = false, href,
  }: {
    title: string; value: React.ReactNode; icon: any; color: string;
    sub?: React.ReactNode; loading?: boolean; href?: string;
  }) => {
    const inner = (
      <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-${color}/10 hover:border-${color}/40 bg-bg-surface border-border-subtle`}>
        {/* subtle glow */}
        <div className={`absolute inset-0 bg-gradient-to-br from-${color}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
          <CardTitle className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</CardTitle>
          <div className={`p-2 rounded-lg bg-${color}/10 text-${color} group-hover:bg-${color}/20 transition-colors`}>
            <Icon className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="h-8 w-20 bg-bg-surface-raised animate-pulse rounded-md" />
          ) : (
            <div className={`text-2xl font-display font-bold tracking-tight text-text-primary`}>{value}</div>
          )}
          {sub && <div className="mt-1.5 text-xs text-text-muted">{sub}</div>}
        </CardContent>
        {href && (
          <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" />
          </div>
        )}
      </Card>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
  };

  return (
    <div className="space-y-8 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-muted mt-1">Welcome back to MotionMesh.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {activeJobs > 0 && (
            <div className="flex items-center gap-2 bg-accent-motion/10 text-accent-motion px-3 py-1.5 rounded-full text-xs font-medium border border-accent-motion/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-motion opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-motion" />
              </span>
              {activeJobs} active job{activeJobs !== 1 ? "s" : ""}
            </div>
          )}
          <Link href="/dashboard/videos">
            <Button size="sm" className="bg-accent-motion text-black hover:bg-accent-motion/90 font-medium text-xs h-8 px-4 gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Manage Videos
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards (6) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Videos"
          value={videos.length}
          icon={VideoIcon}
          color="accent-motion"
          loading={videosLoading}
          sub={newVideos7d > 0 ? <span className="text-success">+{newVideos7d} this week</span> : "No new this week"}
          href="/dashboard/videos"
        />
        <StatCard
          title="Ready"
          value={readyCount}
          icon={CheckCircle2}
          color="success"
          loading={videosLoading}
          sub={videos.length > 0 ? `${Math.round((readyCount / videos.length) * 100)}% of total` : "—"}
        />
        <StatCard
          title="Processing"
          value={processingCount + queuedCount}
          icon={Loader2}
          color="accent-mesh"
          loading={videosLoading}
          sub={failedCount > 0 ? <span className="text-danger">{failedCount} failed</span> : "No failures"}
          href="/dashboard/media-convert"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(storageUsedBytes)}
          icon={HardDrive}
          color="violet-500"
          sub={`${(serverBuckets ?? []).length} bucket${(serverBuckets ?? []).length !== 1 ? "s" : ""}`}
          href="/dashboard/buckets"
        />
        <StatCard
          title="Egress"
          value={formatBytes(egressUsedBytes)}
          icon={Activity}
          color="warning"
          sub="This billing period"
        />
        <StatCard
          title="Transcode Min"
          value={`${transcodeMinutes.toFixed(1)}`}
          icon={PlayCircle}
          color="pink-500"
          loading={videosLoading}
          sub={`~${formatBytes(totalSizeBytes)} total content`}
          href="/dashboard/media-convert"
        />
      </div>


      {/* ── Quota Strip ── */}
      {subscription && (() => {
        const sub = subscription as any;
        const plan = (sub.plan ?? "free").toLowerCase();
        const storageLimit = sub.storageLimitBytes ?? 0;
        const egressLimit  = sub.egressLimitBytes  ?? 0;
        const txLimit      = sub.transcodeMinutesLimit ?? 0;
        const storagePct   = storageLimit > 0 ? Math.min((sub.storageUsedBytes / storageLimit) * 100, 100) : 0;
        const egressPct    = egressLimit  > 0 ? Math.min((sub.egressUsedBytes  / egressLimit)  * 100, 100) : 0;
        const txPct        = txLimit      > 0 ? Math.min(((sub.transcodeMinutesUsed ?? 0) / txLimit) * 100, 100) : 0;

        const planDotColor = plan === "free" ? "#F59E0B" : plan === "pro" ? "#22C55E" : "#00F0FF";

        const bar = (label: string, pct: number, used: string, limit: string, barColor: string) => {
          const isOver = pct >= 95;
          const isWarn = pct >= 75 && !isOver;
          const fillColor = isOver ? "#EF4444" : isWarn ? "#F59E0B" : barColor;
          const textColor = isOver ? "#EF4444" : isWarn ? "#F59E0B" : undefined;
          return (
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-text-muted font-medium">{label}</span>
                <span className="text-[10px] font-mono text-text-muted" style={textColor ? { color: textColor } : {}}>
                  {used} / {limit}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-surface-raised overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: fillColor }}
                />
              </div>
            </div>
          );
        };

        return (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 px-5 py-4 rounded-xl bg-bg-surface border border-border-subtle">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: planDotColor }} />
              <span className="text-xs font-semibold text-text-primary capitalize">{plan} Plan</span>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:gap-6">
              {storageLimit > 0
                ? bar("Storage",   storagePct, formatBytes(sub.storageUsedBytes ?? 0),        formatBytes(storageLimit), "#8B5CF6")
                : <div className="flex-1 text-[11px] text-text-muted">Storage: ∞</div>}
              {egressLimit > 0
                ? bar("Egress",    egressPct,  formatBytes(sub.egressUsedBytes  ?? 0),        formatBytes(egressLimit),  "#F59E0B")
                : <div className="flex-1 text-[11px] text-text-muted">Egress: ∞</div>}
              {txLimit > 0
                ? bar("Transcode", txPct, `${(sub.transcodeMinutesUsed ?? 0).toFixed(1)} min`, `${txLimit} min`,          "#EC4899")
                : <div className="flex-1 text-[11px] text-text-muted">Transcode: ∞</div>}
            </div>
            {plan === "free" && (
              <Link href="/dashboard/billing">
                <span className="flex items-center gap-1 text-xs font-medium whitespace-nowrap hover:underline" style={{ color: "#00F0FF" }}>
                  Upgrade <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>
            )}
          </div>
        );
      })()}

      {/* ── Charts ── */}
      <DashboardCharts buckets={serverBuckets ?? []} videos={videos} />


      {/* ── Bottom: Recent Videos + Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Videos Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-text-primary">Recent Videos</h2>
            <Link href="/dashboard/videos" className="text-xs text-accent-mesh hover:text-accent-mesh/80 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-border-subtle bg-bg-surface overflow-hidden divide-y divide-border-subtle">
            {videosLoading && videos.length === 0 ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-20 h-12 bg-bg-surface-raised rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 bg-bg-surface-raised rounded" />
                    <div className="h-3 w-1/4 bg-bg-surface-raised rounded" />
                  </div>
                  <div className="h-5 w-16 bg-bg-surface-raised rounded-full" />
                </div>
              ))
            ) : recentVideos.length > 0 ? (
              recentVideos.map(video => {
                const statusStyle = {
                  ready:      "bg-success/15 text-success",
                  processing: "bg-accent-mesh/15 text-accent-mesh",
                  failed:     "bg-danger/15 text-danger",
                  queued:     "bg-warning/15 text-warning",
                }[video.status] ?? "bg-bg-surface-raised text-text-muted";

                return (
                  <div key={video.id} className="p-4 flex items-center gap-4 hover:bg-bg-surface-raised/50 transition-colors group">
                    {/* Thumbnail placeholder */}
                    <div className="w-20 h-12 bg-bg-surface-raised rounded-md flex-shrink-0 flex items-center justify-center border border-border-subtle relative overflow-hidden">
                      <VideoIcon className="w-5 h-5 text-text-muted/40" />
                      <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-white font-mono">
                        {Math.floor((video.duration || 0) / 60)}:{Math.floor((video.duration || 0) % 60).toString().padStart(2, "0")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{video.title}</p>
                      <p className="text-xs text-text-muted font-mono mt-0.5" suppressHydrationWarning>
                        {new Date(video.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {video.size_bytes ? ` · ${formatBytes(video.size_bytes)}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusStyle}`}>
                      {video.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-10 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                <FileVideo className="w-8 h-8 opacity-30" />
                <p>No videos yet. Upload your first video to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div>
            <h2 className="text-base font-display font-semibold text-text-primary mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/dashboard/buckets",      icon: Database,   label: "Buckets",      color: "text-violet-400" },
                { href: "/dashboard/api-keys",     icon: Key,        label: "API Keys",     color: "text-warning" },
                { href: "/dashboard/media-convert",icon: PlayCircle, label: "Transcode",    color: "text-accent-motion" },
                { href: "/docs",                   icon: BookOpen,   label: "Docs",         color: "text-accent-mesh", external: true },
              ].map(({ href, icon: Icon, label, color, external }) => (
                external ? (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                    <button className="w-full h-20 flex flex-col items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-surface hover:bg-bg-surface-raised hover:border-border-default transition-all duration-200 group">
                      <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs text-text-muted group-hover:text-text-primary">{label}</span>
                    </button>
                  </a>
                ) : (
                  <Link key={label} href={href}>
                    <button className="w-full h-20 flex flex-col items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-surface hover:bg-bg-surface-raised hover:border-border-default transition-all duration-200 group">
                      <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
                      <span className="text-xs text-text-muted group-hover:text-text-primary">{label}</span>
                    </button>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <h2 className="text-base font-display font-semibold text-text-primary mb-3">Activity</h2>
            <div className="rounded-xl border border-border-subtle bg-bg-surface overflow-hidden">
              <div className="divide-y divide-border-subtle">
                {recentActivity.length === 0 ? (
                  <div className="p-6 text-center text-text-muted text-xs">No activity yet</div>
                ) : recentActivity.map(act => (
                  <div key={act.id} className="px-4 py-3 flex items-start gap-3 hover:bg-bg-surface-raised/40 transition-colors">
                    <div className="mt-0.5 p-1.5 rounded-md bg-bg-surface-raised flex-shrink-0">
                      {act.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary">{act.action}</p>
                      <p className="text-xs text-text-muted truncate">{act.resource}</p>
                      <p className="text-[10px] text-text-muted/60 mt-0.5 flex items-center gap-1" suppressHydrationWarning>
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(act.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
