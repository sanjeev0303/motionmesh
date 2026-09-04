"use client";

import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMeter } from "@/components/dashboard/UsageMeter";
import { Activity, CreditCard, HardDrive, Loader2, Zap, Network, ArrowUpRight, DollarSign, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-client";
import { formatBytes } from "@/lib/utils";
import { UsageCharts } from "@/components/dashboard/UsageCharts";

interface Subscription {
  plan: string;
  status: string;
  storageUsedBytes?: number;
  egressUsedBytes?: number;
  transcodeMinutesUsed?: number;
  transcodeMinutesLimit?: number;
  prepaidBalance?: number;
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

  const billing = {
    prepaidBalance: subscription?.prepaidBalance ?? 0,
    storageUsedBytes: subscription?.storageUsedBytes ?? 0,
    egressUsedBytes: subscription?.egressUsedBytes ?? 0,
    transcodeMinutesUsed: subscription?.transcodeMinutesUsed ?? 0,
    transcodeMinutesLimit: subscription?.transcodeMinutesLimit ?? 5000,
  };

  const events: UsageEvent[] = invoices ?? [];
  const currentMonthCost = useMemo(() => events.reduce((sum, ev) => sum + (ev.cost || 0), 0), [events]);

  const showSkeleton = (subLoading || invLoading) && !subscription && events.length === 0;
  const isRefetching = subRefetching || invRefetching;

  const StatCard = ({
    title, value, icon: Icon, color, sub,
  }: {
    title: string; value: React.ReactNode; icon: any; color: string; sub?: React.ReactNode;
  }) => (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-${color}/10 hover:border-${color}/40 bg-bg-surface border-border-subtle`}>
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5">
        <CardTitle className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-${color}/10 text-${color} group-hover:bg-${color}/20 transition-colors`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="text-2xl font-display font-bold tracking-tight text-text-primary">{value}</div>
        {sub && <div className="mt-1.5 text-xs text-text-muted">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Usage &amp; Billing</h1>
            {isRefetching && (
              <div className="h-4 w-4 rounded-full border-2 border-accent-motion border-t-transparent animate-spin opacity-50" />
            )}
          </div>
          <p className="text-text-muted mt-1">Monitor your resource consumption and billing details.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Button className="bg-accent-motion text-black hover:bg-accent-motion/90 font-medium text-xs h-9 px-4 gap-1.5 shadow-md shadow-accent-motion/20 transition-all">
            <CreditCard className="w-4 h-4" />
            Add Funds
          </Button>
        </div>
      </div>

      {showSkeleton ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-4 border border-border-subtle border-dashed rounded-xl bg-bg-surface">
          <Loader2 className="w-8 h-8 animate-spin text-accent-motion" />
          <p className="text-sm font-medium">Loading usage data…</p>
        </div>
      ) : (
        <>
          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Prepaid Balance"
              value={`$${billing.prepaidBalance.toFixed(2)}`}
              icon={CreditCard}
              color="accent-motion"
              sub="Available for current and future charges"
            />
            <StatCard
              title="Current Month Cost"
              value={`$${currentMonthCost.toFixed(2)}`}
              icon={DollarSign}
              color="warning"
              sub="Total accrued this billing cycle"
            />
            <StatCard
              title="Plan Status"
              value={<span className="capitalize">{subscription?.status || "Active"}</span>}
              icon={Receipt}
              color="success"
              sub={`Current plan: ${subscription?.plan || "Pay-as-you-go"}`}
            />
          </div>

          <UsageCharts events={events} />

          {/* ── Resource Meters ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Storage */}
            <div className="p-6 rounded-xl border border-border-subtle bg-bg-surface space-y-5 relative overflow-hidden group hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300">
              <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <HardDrive className="w-40 h-40 text-violet-500" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-lg group-hover:bg-violet-500/20 transition-colors">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium text-text-primary font-display">Storage</h3>
              </div>
              <div className="relative z-10">
                <UsageMeter
                  label="Total Data Stored"
                  used={billing.storageUsedBytes}
                  limit={1024 * 1024 * 1024 * 1024 * 5} // 5TB example
                  formatAs="bytes"
                />
              </div>
              <p className="text-xs text-text-muted pt-3 border-t border-border-subtle/50 relative z-10">
                $0.023 per GB/month after limit
              </p>
            </div>

            {/* Egress */}
            <div className="p-6 rounded-xl border border-border-subtle bg-bg-surface space-y-5 relative overflow-hidden group hover:border-warning/40 hover:shadow-lg hover:shadow-warning/5 transition-all duration-300">
              <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <Network className="w-40 h-40 text-warning" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2.5 bg-warning/10 text-warning rounded-lg group-hover:bg-warning/20 transition-colors">
                  <Network className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium text-text-primary font-display">Egress</h3>
              </div>
              <div className="relative z-10">
                <UsageMeter
                  label="Outbound Bandwidth"
                  used={billing.egressUsedBytes}
                  limit={1024 * 1024 * 1024 * 1024 * 10} // 10TB example
                  formatAs="bytes"
                />
              </div>
              <p className="text-xs text-text-muted pt-3 border-t border-border-subtle/50 relative z-10">
                $0.01 per GB after limit
              </p>
            </div>

            {/* Transcoding */}
            <div className="p-6 rounded-xl border border-border-subtle bg-bg-surface space-y-5 relative overflow-hidden group hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/5 transition-all duration-300">
              <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                <Zap className="w-40 h-40 text-pink-500" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-lg group-hover:bg-pink-500/20 transition-colors">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium text-text-primary font-display">Transcoding</h3>
              </div>
              <div className="relative z-10">
                <UsageMeter
                  label="Compute Minutes"
                  used={billing.transcodeMinutesUsed}
                  limit={billing.transcodeMinutesLimit}
                  formatAs="minutes"
                />
              </div>
              <p className="text-xs text-text-muted pt-3 border-t border-border-subtle/50 relative z-10">
                $0.005 per min after limit
              </p>
            </div>
          </div>

          {/* ── Recent Usage Activity ── */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-display font-semibold text-text-primary">Recent Usage Activity</h3>
                <p className="text-text-muted text-xs mt-0.5">
                  {events.length > 0
                    ? `Showing the last ${events.length} events this billing cycle.`
                    : "No events recorded this billing cycle."}
                </p>
              </div>
              <Button variant="outline" className="text-text-primary text-xs h-8 gap-1.5 border-border-subtle hover:bg-bg-surface-raised">
                View Full History <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {events.length > 0 ? (
              <div className="rounded-xl border border-border-subtle bg-bg-surface overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-bg-surface-raised/50">
                    <TableRow className="border-border-subtle hover:bg-transparent">
                      <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[180px]">Date</TableHead>
                      <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[140px]">Event Type</TableHead>
                      <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider">Resource</TableHead>
                      <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right w-[140px]">Quantity</TableHead>
                      <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right w-[120px]">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const typeIcon = {
                        storage: <HardDrive className="h-3.5 w-3.5 text-violet-500" />,
                        egress: <Network className="h-3.5 w-3.5 text-warning" />,
                        transcode: <Zap className="h-3.5 w-3.5 text-pink-500" />,
                      }[event.type.toLowerCase()] || <Activity className="h-3.5 w-3.5 text-text-muted" />;

                      return (
                        <TableRow
                          key={event.id}
                          className="border-border-subtle hover:bg-bg-surface-raised/50 transition-colors group"
                        >
                          <TableCell className="text-text-muted text-xs whitespace-nowrap" suppressHydrationWarning>
                            {new Date(event.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <span className="p-1 rounded bg-bg-surface-raised group-hover:bg-bg-surface transition-colors">
                                {typeIcon}
                              </span>
                              <span className="font-medium text-text-primary text-xs capitalize">{event.type}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-text-muted max-w-[200px] truncate" title={event.resource}>
                            {event.resource}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-text-primary">
                            {event.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {event.cost > 0 ? (
                              <span className="font-mono text-xs font-semibold text-text-primary">
                                ${event.cost.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-success text-[10px] font-medium uppercase tracking-wider bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                                Included
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
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
                <p className="text-text-muted text-sm max-w-sm">
                  You haven't incurred any billable usage events during the current billing cycle.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
