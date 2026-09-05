"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Download, CheckCircle2, AlertCircle, ArrowUpRight, Loader2, FileText, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

interface BillingClientProps {
  initialSubscription: any;
  initialInvoices: any[];
}

export function BillingClient({ initialSubscription, initialInvoices }: BillingClientProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [amountValue, setAmountValue] = useState("100");
  const api = useApi();

  const { data: subscription, isLoading: subLoading, isRefetching: subRefetching } = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/billing/subscription", {
        cache: "no-store"
      });
      if (error || !response.ok) {
        if (response?.status === 401 || response?.status === 403) {
          toast.error("Unauthorized to view billing. Please log in.");
        } else if (response?.status === 429) {
          toast.error("Rate limited. Try again later.");
        }
        throw new Error("Failed to load subscription");
      }
      return data as any;
    },
    initialData: initialSubscription,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: invoices = [], isLoading: invLoading, isRefetching: invRefetching } = useQuery({
    queryKey: ["billing", "invoices"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/billing/invoices", {
        cache: "no-store"
      });
      if (error || !response.ok) {
        throw new Error("Failed to load invoices");
      }
      return (data as unknown as any[]) ?? [];
    },
    initialData: initialInvoices,
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const balance = subscription?.balance !== undefined ? subscription.balance / 100 : (subscription?.prepaidBalance ?? 0);
  const isRefetching = subRefetching || invRefetching;
  const showSkeleton = (subLoading || invLoading) && !subscription && invoices.length === 0;

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountValue);

    if (amount && amount > 0) {
      toast.info("Processing payment...");
      try {
        const { error, response } = await api.POST("/v1/billing/funds", {
          body: { amount: Math.round(amount * 100) }
        });

        if (error || !response.ok) {
          toast.error("Failed to add funds.");
          return;
        }

        setIsTopUpOpen(false);
        toast.success(`Successfully added $${amount.toFixed(2)} to your balance.`);
      } catch (err) {
        toast.error("An error occurred while processing payment.");
      }
    }
  };

  const handlePortalRedirect = async () => {
    try {
      toast.info("Redirecting to billing portal...");
      const { data, error, response } = await api.POST("/v1/billing/portal", {
        body: { return_url: window.location.href }
      });
      if (error || !response.ok) {
        toast.error("Failed to open billing portal.");
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error("An error occurred.");
    }
  };

  if (showSkeleton) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-4 border border-borderSubtle border-dashed rounded-xl bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-accent-motion" />
        <p className="text-sm font-medium">Loading billing data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-borderSubtle pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Billing</h1>
            {isRefetching && (
              <div className="h-4 w-4 rounded-full border-2 border-accent-motion border-t-transparent animate-spin opacity-50" />
            )}
          </div>
          <p className="text-text-muted mt-1">Manage your subscription, balance, and invoices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Current Plan / Balance ── */}
        <Card className="relative overflow-hidden border-borderSubtle bg-surface group hover:border-accent-motion/40 transition-all duration-300">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent-motion/10 rounded-full blur-3xl group-hover:bg-accent-motion/20 transition-colors duration-500 pointer-events-none" />
          <CardHeader className="relative z-10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-display flex items-center gap-2 text-text-primary">
                <div className="p-2 bg-accent-motion/10 text-accent-motion rounded-lg">
                  <Wallet className="w-5 h-5" />
                </div>
                Current Plan
              </CardTitle>
            </div>
            <CardDescription className="pt-2 text-sm">
              You are on the <span className="font-semibold text-accent-motion capitalize">{subscription?.plan || 'Pay-as-you-go'}</span> tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-1 p-5 rounded-xl border border-borderSubtle bg-surface-raised/50">
              <p className="text-sm font-medium text-text-muted uppercase tracking-wider">Prepaid Balance</p>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-4xl font-display font-bold tracking-tight text-text-primary">${balance.toFixed(2)}</span>
              </div>
              <p className="text-xs text-text-muted mt-2">Usage is automatically drawn from this balance.</p>
            </div>
            
            <div className="flex gap-3">
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1 gap-2 bg-accent-motion text-black hover:bg-accent-motion/90">
                    <ArrowUpRight className="w-4 h-4" /> Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-surface border-borderSubtle">
                  <DialogHeader>
                    <DialogTitle className="text-text-primary">Add to Balance</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTopUp} className="space-y-6 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[25, 50, 100, 250, 500, 1000].map(amt => (
                        <Button 
                          key={amt} 
                          type="button" 
                          variant="outline" 
                          className={`font-mono border-borderSubtle hover:bg-surface-raised ${amountValue === amt.toString() ? 'border-accent-motion text-accent-motion bg-accent-motion/10' : 'text-text-primary'}`}
                          onClick={() => setAmountValue(amt.toString())}
                        >
                          ${amt}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="number" 
                        min="10" 
                        step="1" 
                        placeholder="Enter custom amount" 
                        required 
                        value={amountValue}
                        onChange={(e) => setAmountValue(e.target.value)}
                        className="text-text-primary bg-surface-raised border-borderSubtle focus-visible:ring-accent-motion"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-borderSubtle">
                      <Button type="button" variant="outline" className="text-text-primary border-borderSubtle hover:bg-surface-raised" onClick={() => setIsTopUpOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-accent-motion text-black hover:bg-accent-motion/90">Process Payment</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="flex-1 text-text-primary border-borderSubtle hover:bg-surface-raised" onClick={handlePortalRedirect}>Change Plan</Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Payment Method ── */}
        <Card className="relative overflow-hidden border-borderSubtle bg-surface group hover:border-accent-mesh/40 transition-all duration-300">
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent-mesh/10 rounded-full blur-3xl group-hover:bg-accent-mesh/20 transition-colors duration-500 pointer-events-none" />
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-display flex items-center gap-2 text-text-primary">
              <div className="p-2 bg-accent-mesh/10 text-accent-mesh rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              Payment Method
            </CardTitle>
            <CardDescription className="pt-2 text-sm">Primary card used for auto-recharge and billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-borderSubtle bg-surface-raised/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 bg-surface rounded-md border border-borderSubtle flex items-center justify-center shadow-sm">
                  <CreditCard className="w-6 h-6 text-text-muted" />
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold text-text-primary">•••• •••• •••• 4242</p>
                  <p className="text-xs text-text-muted mt-0.5">Expires 12/26</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-success/15 text-success border border-success/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Default
              </span>
            </div>
            <Button variant="outline" className="w-full text-text-primary border-borderSubtle hover:bg-surface-raised gap-2" onClick={handlePortalRedirect}>
              Update Payment Method <ArrowUpRight className="w-4 h-4 text-text-muted" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Invoice History ── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-display font-semibold text-text-primary">Invoice History</h3>
            <p className="text-text-muted text-xs mt-0.5">Past billing statements and receipts.</p>
          </div>
          <Button variant="outline" className="text-text-primary text-xs h-8 gap-1.5 border-borderSubtle hover:bg-surface-raised" onClick={handlePortalRedirect}>
            View All in Stripe <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {invoices.length > 0 ? (
          <div className="rounded-xl border border-borderSubtle bg-surface overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-surface-raised/50">
                <TableRow className="border-borderSubtle hover:bg-transparent">
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider w-[220px]">Date</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="text-text-muted font-medium text-xs uppercase tracking-wider text-right w-[140px]">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-borderSubtle hover:bg-surface-raised/50 transition-colors group">
                    <TableCell className="text-text-primary text-sm font-medium" suppressHydrationWarning>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-text-muted" />
                        {new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider border ${
                        inv.status === 'paid' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                      }`}>
                        {inv.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm text-text-primary">
                      ${inv.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-2 text-text-muted hover:text-text-primary hover:bg-surface-raised" onClick={() => toast.success("Downloading invoice...")}>
                        <Download className="w-4 h-4" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-borderSubtle border-dashed rounded-xl bg-surface">
            <div className="p-4 bg-surface-raised rounded-full mb-3">
              <FileText className="h-8 w-8 text-text-muted opacity-50" />
            </div>
            <h4 className="text-text-primary font-medium mb-1">No Invoices Found</h4>
            <p className="text-text-muted text-sm max-w-sm">
              You haven't generated any invoices yet. Invoices will appear here once you make a payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
