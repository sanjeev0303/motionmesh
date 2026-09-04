"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity, CreditCard, HardDrive, Loader2, Zap, Network,
  ArrowUpRight, DollarSign, Receipt, AlertCircle, CheckCircle2, Lock,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";
import { formatBytes } from "@/lib/utils";

interface Subscription {
  plan: string;
  status: string;
  // Usage (from API)
  storageUsedBytes?: number;
  storageLimitBytes?: number;
  egressUsedBytes?: number;
  egressLimitBytes?: number;
  transcodeMinutesUsed?: number;
  transcodeMinutesLimit?: number;
  prepaidBalance?: number;
  maxVideos?: number;
  maxBuckets?: number;
  maxAPIKeys?: number;
  transcodeQuality?: string;
  maxVideoSizeMB?: number;
  maxVideoDurationSec?: number;
}

interface UsageEvent {
  id: string;
  date: string;
  type: string;
  resource: string;
  quantity: string;
  cost: number;
}

interface UsageClientProps {
  initialSubscription: Subscription | null;
  initialInvoices: UsageEvent[];
}

const OVERAGE_RATES = { storage: 0.030, egress: 0.015, transcode: 0.006 };

const COST_COLORS: Record<string, string> = {
  storage: "#8B5CF6", egress: "#F59E0B", transcode: "#EC4899", default: "#00F0FF",
};

function QuotaMeter({
  label, used, limitVal, icon: Icon, color, formatFn, unit, isUnlimited, isExceeded,
}: {
  label: string; used: number; limitVal: number; icon: any; color: string;
  formatFn: (v: number) => string; unit: string; isUnlimited: boolean; isExceeded: boolean;
}) {
  const pct = isUnlimited || limitVal <= 0 ? 0 : Math.min((used / limitVal) * 100, 100);
  const isWarning = pct >= 75 && pct < 95;
  const isDanger  = pct >= 95 || isExceeded;

  return (
    <div className={`p-6 rounded-xl border transition-all duration-300 relative overflow-hidden group ${
      isDanger ? "border-danger/50 bg-danger/5 shadow-sm shadow-danger/10" :
      isWarning ? "border-warning/40 bg-warning/5" :
      "border-border-subtle bg-bg-surface hover:border-border-default"
    }`}>
      <div className="absolute -top-8 -right-8 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
        <Icon className={`w-40 h-40`} />
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{label}</p>
            <p className="text-xs text-text-muted">{unit}</p>
          </div>
        </div>
        {isDanger && !isUnlimited && (
          <span className="flex items-center gap-1 text-danger text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {isExceeded ? "Limit reached" : "Near limit"}
          </span>
        )}
        {isUnlimited && (
          <span className="text-xs text-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Unlimited
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="flex justify-between text-sm mb-2">
          <span className={`font-mono font-bold ${isDanger ? "text-danger" : isWarning ? "text-warning" : "text-text-primary"}`}>
            {formatFn(used)}
          </span>
          <span className="text-text-muted text-xs">
            {isUnlimited ? "∞" : `/ ${formatFn(limitVal)}`}
          </span>
        </div>

        {!isUnlimited && (
          <>
            <div className="h-2 rounded-full bg-bg-surface-raised overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isDanger ? "bg-danger" : isWarning ? "bg-warning" : `bg-${color}`
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-text-muted font-mono">{pct.toFixed(1)}% used</span>
              {isDanger && (
                <Link href="/dashboard/billing">
                  <span className="text-[10px] text-accent-motion font-medium flex items-center gap-0.5 hover:underline">
                    Upgrade <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold capitalize mb-1">{label}</p>
        <p className="font-mono text-text-primary">${payload[0].value.toFixed(4)}</p>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-lg shadow-xl text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-text-muted capitalize">{p.name}:</span>
            <span className="font-mono font-bold">${p.value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function UsageClient({ initialSubscription, initialInvoices }: UsageClientProps) {
  const api = useApi();

  const { data: subscription, isLoading: subLoading, isRefetching: subRefetching } = useQuery<Subscription | null>({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data, response } = await api.GET("/v1/billing/subscription", {});
      if (!response.ok) return null;
      return (data as unknown as Subscription) ?? null;
    },
    initialData: initialSubscription,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: invoices, isLoading: invLoading, isRefetching: invRefetching } = useQuery({
    queryKey: ["billing", "usage-events"],
    queryFn: async () => {
      const { data, response } = await api.GET("/v1/billing/usage-events" as any, {});
      if (!response.ok) return [];
      return (data as unknown as UsageEvent[]) ?? [];
    },
    initialData: initialInvoices,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const plan   = (subscription?.plan ?? "free").toLowerCase();
  const events: UsageEvent[] = invoices ?? [];

  // Limits come directly from the API (plan-aware, single source of truth)
  const storageLimitBytes   = subscription?.storageLimitBytes   ?? 0;
  const egressLimitBytes    = subscription?.egressLimitBytes    ?? 0;
  const transcodeMinLimit   = subscription?.transcodeMinutesLimit ?? 0;

  const billing = {
    prepaidBalance:       subscription?.prepaidBalance ?? 0,
    storageUsedBytes:     subscription?.storageUsedBytes ?? 0,
    egressUsedBytes:      subscription?.egressUsedBytes ?? 0,
    transcodeMinutesUsed: subscription?.transcodeMinutesUsed ?? 0,
  };

  const storageUsedGB    = billing.storageUsedBytes / (1024 ** 3);
  const egressUsedGB     = billing.egressUsedBytes  / (1024 ** 3);
  const transcodeUsedMin = billing.transcodeMinutesUsed;
  const storageLimitGB   = storageLimitBytes / (1024 ** 3);
  const egressLimitGB    = egressLimitBytes  / (1024 ** 3);

  // Overages beyond included quota
  const storageOverage   = storageLimitGB   > 0 ? Math.max(0, storageUsedGB    - storageLimitGB)   : 0;
  const egressOverage    = egressLimitGB    > 0 ? Math.max(0, egressUsedGB     - egressLimitGB)    : 0;
  const transcodeOverage = transcodeMinLimit > 0 ? Math.max(0, transcodeUsedMin - transcodeMinLimit) : 0;
  const estimatedOverage = storageOverage * OVERAGE_RATES.storage + egressOverage * OVERAGE_RATES.egress + transcodeOverage * OVERAGE_RATES.transcode;

  const currentMonthCost = useMemo(() => events.reduce((s, ev) => s + (ev.cost || 0), 0), [events]);

  // Cost breakdown bar chart data
  const costByType = useMemo(() => {
    const agg = events.reduce((acc, ev) => {
      const t = ev.type.toLowerCase();
      acc[t] = (acc[t] || 0) + ev.cost;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(agg).filter(([, v]) => v > 0).map(([type, cost]) => ({ type, cost }));
  }, [events]);

  // Last 14 days cost area chart
  const costTimeline = useMemo(() => {
    const days = [...Array(14)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });
    const byDate = events.reduce((acc, ev) => {
      const d = ev.date?.split("T")[0];
      if (d && days.includes(d)) acc[d] = (acc[d] || 0) + ev.cost;
      return acc;
    }, {} as Record<string, number>);
    return days.map(date => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: byDate[date] || 0,
    }));
  }, [events]);

  const showSkeleton = (subLoading || invLoading) && !subscription && events.length === 0;
  const isRefetching = subRefetching || invRefetching;

  if (showSkeleton) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-4 border border-border-subtle border-dashed rounded-xl bg-bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-accent-motion" />
        <p className="text-sm font-medium">Loading usage data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Usage &amp; Billing</h1>
            {isRefetching && <div className="h-4 w-4 rounded-full border-2 border-accent-motion border-t-transparent animate-spin opacity-50" />}
          </div>
          <p className="text-text-muted mt-1">
            Plan: <span className="capitalize font-semibold text-text-primary">{plan}</span>
            {plan === "free" && (
              <Link href="/dashboard/billing" className="ml-3 text-xs text-accent-motion hover:underline flex items-center gap-0.5 inline-flex">
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </p>
        </div>
        <Link href="/dashboard/billing">
          <Button className="bg-accent-motion text-black hover:bg-accent-motion/90 h-9 px-4 gap-1.5 text-xs font-medium">
            <CreditCard className="w-4 h-4" /> Add Funds
          </Button>
        </Link>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Prepaid Balance", value: `$${billing.prepaidBalance.toFixed(2)}`, icon: CreditCard, color: "accent-motion", sub: "Available for usage" },
          { title: "This Month Cost",  value: `$${currentMonthCost.toFixed(4)}`, icon: DollarSign, color: "warning", sub: "Accrued this billing cycle" },
          { title: "Est. Overage",     value: `$${estimatedOverage.toFixed(4)}`, icon: Receipt, color: estimatedOverage > 0 ? "danger" : "success", sub: estimatedOverage > 0 ? "Beyond included limits" : "Within plan limits" },
        ].map(({ title, value, icon: Icon, color, sub }) => (
          <Card key={title} className={`bg-bg-surface border-border-subtle hover:shadow-md transition-all group`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
              <CardTitle className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</CardTitle>
              <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}><Icon className="w-4 h-4" /></div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="text-2xl font-display font-bold text-text-primary">{value}</div>
              <p className="text-xs text-text-muted mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quota Meters ── */}
      <div>
        <h2 className="text-base font-display font-semibold text-text-primary mb-4">Resource Quotas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuotaMeter
            label="Storage" unit="per month" icon={HardDrive} color="violet-500"
            used={billing.storageUsedBytes} limitVal={storageLimitBytes}
            formatFn={(v) => formatBytes(v)} isUnlimited={storageLimitBytes === -1}
            isExceeded={storageLimitBytes > 0 && billing.storageUsedBytes >= storageLimitBytes}
          />
          <QuotaMeter
            label="Egress" unit="outbound bandwidth" icon={Network} color="warning"
            used={billing.egressUsedBytes} limitVal={egressLimitBytes}
            formatFn={(v) => formatBytes(v)} isUnlimited={egressLimitBytes === -1}
            isExceeded={egressLimitBytes > 0 && billing.egressUsedBytes >= egressLimitBytes}
          />
          <QuotaMeter
            label="Transcoding" unit="compute minutes" icon={Zap} color="pink-500"
            used={transcodeUsedMin} limitVal={transcodeMinLimit}
            formatFn={(v) => `${v.toFixed(1)} min`} isUnlimited={transcodeMinLimit === -1}
            isExceeded={transcodeMinLimit > 0 && transcodeUsedMin >= transcodeMinLimit}
          />
        </div>
        {plan === "free" && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>You're on the <strong>Free</strong> plan. Operations will be blocked when limits are reached.{" "}
              <Link href="/dashboard/billing" className="underline">Upgrade</Link> for higher limits and HD transcoding.
            </span>
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost timeline area chart */}
          <Card className="bg-bg-surface border-border-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Cost Timeline</CardTitle>
              <CardDescription className="text-xs">Daily spend over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costTimeline} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} interval={2} />
                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={2} fill="url(#costGrad)" dot={false}
                      activeDot={{ r: 4, fill: "#F59E0B", stroke: "#000", strokeWidth: 2 }} animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cost by resource type bar chart */}
          <Card className="bg-bg-surface border-border-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Cost by Resource</CardTitle>
              <CardDescription className="text-xs">Breakdown by resource type this cycle</CardDescription>
            </CardHeader>
            <CardContent>
              {costByType.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle rounded-lg">
                  No billed usage yet
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="type" stroke="#666" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                      <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="cost" radius={[4, 4, 0, 0]} maxBarSize={60} animationDuration={1200}>
                        {costByType.map((_, i) => (
                          <Cell key={i} fill={COST_COLORS[costByType[i].type] || COST_COLORS.default} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Usage Activity Table ── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-display font-semibold text-text-primary">Recent Usage Activity</h3>
            <p className="text-text-muted text-xs mt-0.5">
              {events.length > 0 ? `Showing ${events.length} events this billing cycle.` : "No events recorded this billing cycle."}
            </p>
          </div>
          <Button variant="outline" className="text-text-primary text-xs h-8 gap-1.5 border-border-subtle hover:bg-bg-surface-raised">
            Export CSV <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {events.length > 0 ? (
          <div className="rounded-xl border border-border-subtle bg-bg-surface overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-bg-surface-raised/50">
                <TableRow className="border-border-subtle hover:bg-transparent">
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[180px]">Date</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[140px]">Type</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider">Resource</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right w-[130px]">Quantity</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right w-[120px]">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => {
                  const typeIcon = {
                    storage: <HardDrive className="h-3.5 w-3.5 text-violet-500" />,
                    egress: <Network className="h-3.5 w-3.5 text-warning" />,
                    transcode: <Zap className="h-3.5 w-3.5 text-pink-500" />,
                  }[event.type?.toLowerCase()] || <Activity className="h-3.5 w-3.5 text-text-muted" />;

                  return (
                    <TableRow key={event.id} className="border-border-subtle hover:bg-bg-surface-raised/50 transition-colors group">
                      <TableCell className="text-text-muted text-xs whitespace-nowrap" suppressHydrationWarning>
                        {new Date(event.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="p-1 rounded bg-bg-surface-raised">{typeIcon}</span>
                          <span className="font-medium text-text-primary text-xs capitalize">{event.type}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-text-muted max-w-[200px] truncate" title={event.resource}>{event.resource}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-text-primary">{event.quantity}</TableCell>
                      <TableCell className="text-right">
                        {event.cost > 0 ? (
                          <span className="font-mono text-xs font-semibold text-text-primary">${event.cost.toFixed(4)}</span>
                        ) : (
                          <span className="text-success text-[10px] font-medium uppercase tracking-wider bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">Included</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-border-subtle border-dashed rounded-xl bg-bg-surface">
            <div className="p-4 bg-bg-surface-raised rounded-full mb-3">
              <Activity className="h-8 w-8 text-text-muted opacity-50" />
            </div>
            <h4 className="text-text-primary font-medium mb-1">No Usage Events</h4>
            <p className="text-text-muted text-sm max-w-sm">No billable usage events this billing cycle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
