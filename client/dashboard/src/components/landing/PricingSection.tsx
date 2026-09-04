"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Zap, HardDrive, Network, Clock } from "lucide-react";

const RATES = {
  storage:   0.030,  // $0.030/GB-month
  egress:    0.015,  // $0.015/GB
  transcode: 0.006,  // $0.006/min SD
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
    ctaHref: "/signup",
    limits: [
      { icon: HardDrive, text: "5 GB storage" },
      { icon: Network,   text: "10 GB/month egress" },
      { icon: Zap,       text: "30 transcode minutes/month" },
      { icon: Clock,     text: "5 min max video, 200 MB max file" },
    ],
    features: ["20 videos max", "1 bucket", "2 API keys", "SD quality only", "Community support"],
    highlight: false,
    badgeStyle: "",
    cardStyle: "border-border-subtle bg-surface hover:shadow-lg",
  },
  {
    id: "starter",
    name: "Pay-as-you-go",
    price: "$0",
    period: "+ metered usage",
    desc: "No subscription. Pay only for what you use beyond the free allowances.",
    badge: "Most Flexible",
    cta: "Start Building",
    ctaHref: "/signup",
    limits: [
      { icon: HardDrive, text: "10 GB free → $0.030/GB-month" },
      { icon: Network,   text: "20 GB free → $0.015/GB egress" },
      { icon: Zap,       text: "60 min free → $0.006/min (SD)" },
      { icon: Clock,     text: "60 min max video duration" },
    ],
    features: ["Unlimited videos", "3 buckets", "5 API keys", "HD quality", "Email support"],
    highlight: false,
    badgeStyle: "bg-[#00C8A0] text-black",
    cardStyle: "border-border-subtle bg-surface hover:shadow-lg",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For production apps with high-volume workloads.",
    badge: "Most Popular",
    cta: "Upgrade to Pro",
    ctaHref: "/signup?plan=pro",
    limits: [
      { icon: HardDrive, text: "500 GB storage included" },
      { icon: Network,   text: "200 GB/month egress included" },
      { icon: Zap,       text: "2,000 transcode minutes included" },
      { icon: Clock,     text: "4 hour max video, 10 GB max file" },
    ],
    features: ["Unlimited videos", "10 buckets", "20 API keys", "HD quality", "Priority support", "Custom CNAME"],
    highlight: true,
    badgeStyle: "bg-[#00F0FF] text-black",
    cardStyle: "border-[#00F0FF] bg-surface shadow-xl shadow-[#00F0FF]/10 scale-[1.02]",
  },
  {
    id: "enterprise",
    name: "Scale",
    price: "Custom",
    period: "",
    desc: "For high-volume platforms needing dedicated infrastructure.",
    badge: null,
    cta: "Contact Sales",
    ctaHref: "mailto:sales@motionmesh.co.in",
    limits: [
      { icon: HardDrive, text: "Unlimited storage" },
      { icon: Network,   text: "Unlimited egress" },
      { icon: Zap,       text: "Unlimited transcoding" },
      { icon: Clock,     text: "Unlimited video duration" },
    ],
    features: ["Everything in Pro", "Custom ingest endpoints", "Volume discounts", "Dedicated Slack", "SLA guarantees", "SOC 2 reports"],
    highlight: false,
    badgeStyle: "bg-purple-500 text-white",
    cardStyle: "border-border-subtle bg-surface hover:shadow-lg",
  },
];

export function PricingSection() {
  const router = useRouter();
  const [storageGb, setStorageGb]       = useState(200);
  const [transcodeMins, setTranscodeMins] = useState(500);
  const [egressGb, setEgressGb]         = useState(100);

  const storageCharge   = Math.max(0, storageGb - 10) * RATES.storage;
  const transcodeCharge = Math.max(0, transcodeMins - 60) * RATES.transcode;
  const egressCharge    = Math.max(0, egressGb - 20) * RATES.egress;
  const totalPayg       = storageCharge + transcodeCharge + egressCharge;

  return (
    <section id="pricing" className="py-24 border-t border-borderSubtle bg-base">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Start free. Scale as you grow. Prices reflect real AWS infrastructure costs + 30% margin.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-24">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-300 ${plan.cardStyle}`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${plan.badgeStyle}`}>
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
                    <Icon className="w-3.5 h-3.5 text-[#00F0FF] mt-0.5 flex-shrink-0" />
                    <span className="text-text-muted">{text}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full gap-2 ${plan.highlight ? "bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90" : ""}`}
                onClick={() => router.push(plan.ctaHref)}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Overage rate table */}
        <div className="max-w-3xl mx-auto mb-20">
          <h3 className="text-center font-display text-xl font-semibold mb-8">Overage Rates (beyond included quota)</h3>
          <div className="rounded-xl border border-borderSubtle overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-borderSubtle bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-text-muted font-medium text-xs uppercase tracking-wider">Resource</th>
                  <th className="px-6 py-4 text-right text-text-muted font-medium text-xs uppercase tracking-wider">AWS Cost</th>
                  <th className="px-6 py-4 text-right text-text-muted font-medium text-xs uppercase tracking-wider">Our Rate (+30%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {[
                  { resource: "Storage",        unit: "per GB/month",  awsCost: "$0.025",       ourRate: "$0.030" },
                  { resource: "Egress (CDN)",   unit: "per GB",        awsCost: "$0.009–0.011", ourRate: "$0.015" },
                  { resource: "Transcoding SD", unit: "per minute",    awsCost: "$0.0045",      ourRate: "$0.006" },
                  { resource: "Transcoding HD", unit: "per minute",    awsCost: "$0.0090",      ourRate: "$0.012" },
                ].map((row) => (
                  <tr key={row.resource} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.resource}</div>
                      <div className="text-xs text-text-muted">{row.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-text-muted text-xs">{row.awsCost}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#00F0FF]">{row.ourRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYG Estimator */}
        <div className="max-w-4xl mx-auto border border-borderSubtle rounded-2xl p-8 md:p-12 bg-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00C8A0]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#00C8A0]" />
            </div>
            <h3 className="font-display text-2xl font-semibold">Pay-as-you-go Estimator</h3>
          </div>
          <p className="text-text-muted text-sm mb-10">Estimate your monthly bill beyond the free tier allowances.</p>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="w-full lg:w-2/3 space-y-8">
              {[
                { label: "Storage (GB/month)",    value: storageGb,    setter: setStorageGb,    max: 5000, step: 10,  rate: RATES.storage,   unit: "GB",  freeAllowance: 10,  color: "#8B5CF6" },
                { label: "Transcode Minutes",      value: transcodeMins, setter: setTranscodeMins, max: 5000, step: 50,  rate: RATES.transcode, unit: "min", freeAllowance: 60,  color: "#EC4899" },
                { label: "Egress (GB/month)",      value: egressGb,     setter: setEgressGb,     max: 2000, step: 10,  rate: RATES.egress,    unit: "GB",  freeAllowance: 20,  color: "#F59E0B" },
              ].map(({ label, value, setter, max, step, rate, unit, freeAllowance, color }) => {
                const billable = Math.max(0, value - freeAllowance);
                const cost = billable * rate;
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="font-semibold text-sm">{label}</label>
                      <div className="text-right">
                        <span className="font-mono font-bold" style={{ color }}>{value.toLocaleString()} {unit}</span>
                        <span className="text-text-muted text-xs ml-2">(+${cost.toFixed(2)})</span>
                      </div>
                    </div>
                    <input
                      type="range" min="0" max={max} step={step} value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
                      style={{ accentColor: color }}
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1.5 font-mono">
                      <span>Free up to {freeAllowance} {unit}</span>
                      <span>${rate}/{unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full lg:w-1/3 flex flex-col items-center justify-center p-8 rounded-xl border border-borderSubtle bg-black/20 sticky top-8">
              <span className="text-text-muted text-sm mb-1">Estimated Monthly</span>
              <div className="text-5xl font-display font-bold mb-2">${totalPayg.toFixed(2)}</div>
              <p className="text-xs text-text-muted text-center mb-6">Beyond pay-as-you-go free allowances</p>
              <div className="w-full space-y-2 text-xs mb-6">
                <div className="flex justify-between text-text-muted"><span>Storage</span><span className="font-mono">${storageCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Transcoding</span><span className="font-mono">${transcodeCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-text-muted"><span>Egress</span><span className="font-mono">${egressCharge.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold border-t border-borderSubtle pt-2"><span>Total</span><span className="font-mono">${totalPayg.toFixed(2)}</span></div>
              </div>
              <Button
                className="w-full bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90"
                onClick={() => router.push("/signup")}
              >
                Start Building <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
