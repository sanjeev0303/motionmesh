"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Zap, HardDrive, Network, Clock } from "lucide-react";

const RATES = {
  storage: 0.030,    // $0.030/GB-month  (AWS $0.025 + 30% margin)
  egress:  0.015,    // $0.015/GB        (AWS CDN blended + 30%)
  transcode: 0.006,  // $0.006/min SD    (AWS MediaConvert $0.0045 + 30%)
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For side projects and prototypes.",
    badge: null,
    cta: "Get Started",
    limits: [
      { icon: HardDrive,  text: "5 GB storage" },
      { icon: Network,    text: "10 GB/month egress" },
      { icon: Zap,        text: "30 transcode minutes/month" },
      { icon: Clock,      text: "5 min max video duration" },
    ],
    features: ["20 videos max", "1 bucket", "2 API keys", "SD quality only", "Community support"],
    priceId: null,
    highlight: false,
  },
  {
    id: "starter",
    name: "Pay-as-you-go",
    price: "$0",
    period: "+ metered usage",
    desc: "No subscription. Pay only for what you use beyond the free tier.",
    badge: "Most Flexible",
    cta: "Start Building",
    limits: [
      { icon: HardDrive,  text: "10 GB free, then $0.030/GB-month" },
      { icon: Network,    text: "20 GB free, then $0.015/GB" },
      { icon: Zap,        text: "60 min free, then $0.006/min" },
      { icon: Clock,      text: "60 min max video duration" },
    ],
    features: ["Unlimited videos", "3 buckets", "5 API keys", "HD quality", "Email support"],
    priceId: null,
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For production applications with high volume workloads.",
    badge: "Most Popular",
    cta: "Upgrade to Pro",
    limits: [
      { icon: HardDrive,  text: "500 GB storage included" },
      { icon: Network,    text: "200 GB/month egress included" },
      { icon: Zap,        text: "2,000 transcode minutes included" },
      { icon: Clock,      text: "4 hour max video duration" },
    ],
    features: ["Unlimited videos", "10 buckets", "20 API keys", "HD quality", "Priority support", "Custom CNAME"],
    priceId: "price_1TzqevRmntiG21b1f8dlmnJf",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Scale",
    price: "Custom",
    period: "",
    desc: "For high-volume platforms needing dedicated infrastructure.",
    badge: null,
    cta: "Contact Sales",
    limits: [
      { icon: HardDrive,  text: "Unlimited storage" },
      { icon: Network,    text: "Unlimited egress" },
      { icon: Zap,        text: "Unlimited transcoding" },
      { icon: Clock,      text: "Unlimited video duration" },
    ],
    features: ["Everything in Pro", "Custom ingest endpoints", "Volume discounts", "Dedicated Slack", "SLA guarantees", "SOC 2 reports"],
    priceId: null,
    highlight: false,
  },
];

export function PricingSection() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [storageGb, setStorageGb] = useState(200);
  const [transcodeMins, setTranscodeMins] = useState(500);
  const [egressGb, setEgressGb] = useState(100);

  // Pay-as-you-go estimated cost (beyond free tier)
  const storageCharge   = Math.max(0, storageGb - 10) * RATES.storage;
  const transcodeCharge = Math.max(0, transcodeMins - 60) * RATES.transcode;
  const egressCharge    = Math.max(0, egressGb - 20) * RATES.egress;
  const totalPayg       = storageCharge + transcodeCharge + egressCharge;

  const handleClick = async (plan: typeof PLANS[0]) => {
    if (plan.id === "enterprise") {
      window.location.href = "mailto:sales@motionmesh.co.in";
      return;
    }
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=" + encodeURIComponent("/dashboard/billing"));
      return;
    }
    if (!plan.priceId) {
      router.push("/dashboard");
      return;
    }
    setLoadingTier(plan.id);
    try {
      const api = createAuthClient(getToken);
      const { data, error, response } = await api.POST("/v1/billing/checkout", {
        body: { price_id: plan.priceId, return_url: window.location.origin + "/dashboard/billing" }
      });
      if (error || !response.ok) {
        toast.error("Failed to start checkout process.");
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className="py-24 border-t border-borderSubtle bg-base">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Start free. Scale as you grow. No hidden fees — prices reflect real AWS infrastructure costs with 30% margin.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-24">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-300 ${
                plan.highlight
                  ? "border-accent-motion bg-surface shadow-xl shadow-accent-motion/10 scale-[1.02]"
                  : "border-borderSubtle bg-surface hover:border-borderSubtle/80 hover:shadow-lg"
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  plan.highlight ? "bg-accent-motion text-base" : "bg-accent-mesh text-base"
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-text-muted text-xs mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">{plan.price}</span>
                  <span className="text-text-muted text-sm">{plan.period}</span>
                </div>
              </div>

              {/* Resource limits */}
              <div className="space-y-2.5 mb-6 pb-6 border-b border-borderSubtle/50">
                {plan.limits.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Icon className="w-3.5 h-3.5 text-accent-motion mt-0.5 flex-shrink-0" />
                    <span className="text-text-muted">{text}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full gap-2 ${plan.highlight ? "bg-accent-motion text-base hover:bg-accent-motion/90" : ""}`}
                disabled={loadingTier === plan.id}
                onClick={() => handleClick(plan)}
              >
                {loadingTier === plan.id ? "Loading…" : plan.cta}
                {loadingTier !== plan.id && <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Overage rates table */}
        <div className="max-w-3xl mx-auto mb-20">
          <h3 className="text-center font-display text-xl font-semibold mb-8">Overage Rates (beyond included quota)</h3>
          <div className="rounded-xl border border-borderSubtle bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised border-b border-borderSubtle">
                <tr>
                  <th className="px-6 py-4 text-left text-text-muted font-medium text-xs uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-right text-text-muted font-medium text-xs uppercase tracking-wider">AWS Cost</th>
                  <th className="px-6 py-4 text-right text-text-muted font-medium text-xs uppercase tracking-wider">Our Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {[
                  { resource: "Storage", unit: "per GB/month", awsCost: "$0.025", ourRate: "$0.030" },
                  { resource: "Egress (CDN)", unit: "per GB", awsCost: "$0.009–0.011", ourRate: "$0.015" },
                  { resource: "Transcoding SD", unit: "per minute", awsCost: "$0.0045", ourRate: "$0.006" },
                  { resource: "Transcoding HD", unit: "per minute", awsCost: "$0.0090", ourRate: "$0.012" },
                ].map((row) => (
                  <tr key={row.resource} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.resource}</div>
                      <div className="text-xs text-text-muted">{row.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted text-xs">{row.awsCost}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-accent-motion">{row.ourRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Pay-as-you-go estimator */}
        <div className="max-w-4xl mx-auto bg-surface border border-borderSubtle rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-mesh/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-mesh" />
            </div>
            <h3 className="font-display text-2xl font-semibold">Pay-as-you-go Estimator</h3>
          </div>
          <p className="text-text-muted text-sm mb-10">Estimate your monthly bill beyond the free tier allowances.</p>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="w-full lg:w-2/3 space-y-8">
              {[
                { label: "Storage (GB)", icon: HardDrive, color: "accent-motion", key: "storage", value: storageGb, setter: setStorageGb, max: 5000, step: 10, rate: RATES.storage, unit: "GB/month", freeAllowance: 10 },
                { label: "Transcode Minutes", icon: Zap, color: "warning", key: "transcode", value: transcodeMins, setter: setTranscodeMins, max: 5000, step: 50, rate: RATES.transcode, unit: "min", freeAllowance: 60 },
                { label: "Egress (GB)", icon: Network, color: "accent-mesh", key: "egress", value: egressGb, setter: setEgressGb, max: 2000, step: 10, rate: RATES.egress, unit: "GB", freeAllowance: 20 },
              ].map(({ label, icon: Icon, color, value, setter, max, step, rate, unit, freeAllowance }) => {
                const billable = Math.max(0, value - freeAllowance);
                const cost = billable * rate;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="flex items-center gap-2 font-semibold text-sm">
                        <Icon className={`w-4 h-4 text-${color}`} />
                        {label}
                      </label>
                      <div className="text-right">
                        <span className={`font-mono font-bold text-${color}`}>{value.toLocaleString()} {unit}</span>
                        <span className="text-text-muted text-xs ml-2">(+${cost.toFixed(2)})</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className={`w-full h-2 bg-base rounded-lg appearance-none cursor-pointer accent-${color}`}
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1.5 font-mono">
                      <span>Free up to {freeAllowance} {unit}</span>
                      <span>${rate}/{unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full lg:w-1/3 flex flex-col items-center justify-center p-8 bg-surface-raised rounded-xl border border-borderSubtle sticky top-8">
              <span className="text-text-muted text-sm mb-1">Estimated Monthly</span>
              <div className="text-5xl font-display font-bold text-text-primary mb-2">
                ${totalPayg.toFixed(2)}
              </div>
              <p className="text-xs text-text-muted text-center mb-6">Beyond pay-as-you-go free allowances</p>
              <div className="w-full space-y-2 text-xs mb-6">
                <div className="flex justify-between text-text-muted"><span>Storage</span><span className="font-mono">${storageCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Transcoding</span><span className="font-mono">${transcodeCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Egress</span><span className="font-mono">${egressCharge.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold text-text-primary border-t border-borderSubtle pt-2"><span>Total</span><span className="font-mono">${totalPayg.toFixed(2)}</span></div>
              </div>
              <Button className="w-full bg-accent-motion text-base hover:bg-accent-motion/90" onClick={() => router.push("/sign-up")}>
                Start Building <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
