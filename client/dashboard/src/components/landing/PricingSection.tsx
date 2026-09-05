"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight, Zap, HardDrive, Network, Clock } from "lucide-react";
import Link from "next/link";

const RATES = {
  storage:   0.030,
  egress:    0.015,
  transcode: 0.006,
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For side projects and prototypes.",
    badge: null as string | null,
    cta: "Get Started",
    ctaHref: "/signup",
    limits: [
      { icon: HardDrive, text: "5 GB storage" },
      { icon: Network,   text: "10 GB/month egress" },
      { icon: Zap,       text: "30 transcode min/month" },
      { icon: Clock,     text: "5 min max video · 200 MB max file" },
    ],
    features: ["20 videos max", "1 bucket", "2 API keys", "SD quality only", "Community support"],
    highlight: false,
    highlightColor: null as string | null,
    badgeBg: "",
  },
  {
    id: "starter",
    name: "Pay-as-you-go",
    price: "$0",
    period: "+ metered usage",
    desc: "No subscription. Pay only for what you use beyond free allowances.",
    badge: "Most Flexible",
    cta: "Start Building",
    ctaHref: "/signup",
    limits: [
      { icon: HardDrive, text: "10 GB free → $0.030/GB-month" },
      { icon: Network,   text: "20 GB free → $0.015/GB egress" },
      { icon: Zap,       text: "60 min free → $0.006/min SD" },
      { icon: Clock,     text: "60 min max video duration" },
    ],
    features: ["Unlimited videos", "3 buckets", "5 API keys", "HD quality", "Email support"],
    highlight: false,
    highlightColor: "#00C8A0",
    badgeBg: "#00C8A0",
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
      { icon: Zap,       text: "2,000 transcode min included" },
      { icon: Clock,     text: "4 hr max video · 10 GB max file" },
    ],
    features: ["Unlimited videos", "10 buckets", "20 API keys", "HD quality", "Priority support", "Custom CNAME"],
    highlight: true,
    highlightColor: "#00F0FF",
    badgeBg: "#00F0FF",
  },
  {
    id: "enterprise",
    name: "Scale",
    price: "Custom",
    period: "",
    desc: "Dedicated infrastructure for high-volume platforms.",
    badge: null as string | null,
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
    highlightColor: "#A78BFA",
    badgeBg: "#A78BFA",
  },
];

function PaygEstimator() {
  const [storageGb, setStorageGb]     = useState(200);
  const [transcodeMins, setTranscode] = useState(500);
  const [egressGb, setEgressGb]       = useState(100);

  const storageCost   = Math.max(0, storageGb - 10) * RATES.storage;
  const transcodeCost = Math.max(0, transcodeMins - 60) * RATES.transcode;
  const egressCost    = Math.max(0, egressGb - 20) * RATES.egress;
  const total         = storageCost + transcodeCost + egressCost;

  const sliders = [
    { label: "Storage (GB/month)",  value: storageGb,    setter: setStorageGb,   max: 5000, step: 10,  rate: RATES.storage,   unit: "GB",  free: 10,  color: "#8B5CF6", cost: storageCost },
    { label: "Transcode Minutes",   value: transcodeMins, setter: setTranscode,  max: 5000, step: 50,  rate: RATES.transcode, unit: "min", free: 60,  color: "#EC4899", cost: transcodeCost },
    { label: "Egress (GB/month)",   value: egressGb,     setter: setEgressGb,    max: 2000, step: 10,  rate: RATES.egress,    unit: "GB",  free: 20,  color: "#F59E0B", cost: egressCost },
  ];

  return (
    <div
      className="max-w-4xl mx-auto rounded-2xl p-8 md:p-12"
      style={{ border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,200,160,0.1)" }}>
          <Zap className="w-4 h-4" style={{ color: "#00C8A0" }} />
        </div>
        <h3 className="font-display text-2xl font-semibold">Pay-as-you-go Estimator</h3>
      </div>
      <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>Estimate your monthly bill beyond the free tier allowances.</p>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        <div className="w-full lg:w-2/3 space-y-8">
          {sliders.map(({ label, value, setter, max, step, rate, unit, free, color, cost }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-sm">{label}</label>
                <div className="text-right">
                  <span className="font-mono font-bold" style={{ color }}>
                    {value.toLocaleString()} {unit}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                    (+${cost.toFixed(2)})
                  </span>
                </div>
              </div>
              <input
                type="range" min="0" max={max} step={step} value={value}
                onChange={(e) => setter(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: color, background: "rgba(255,255,255,0.1)" }}
              />
              <div className="flex justify-between text-xs mt-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                <span>Free up to {free} {unit}</span>
                <span>${rate}/{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className="w-full lg:w-1/3 flex flex-col items-center justify-center p-8 rounded-xl sticky top-8"
          style={{ border: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)" }}
        >
          <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Estimated Monthly</span>
          <div className="text-5xl font-display font-bold mb-2">${total.toFixed(2)}</div>
          <p className="text-xs text-center mb-6" style={{ color: "var(--text-muted)" }}>Beyond pay-as-you-go free allowances</p>
          <div className="w-full space-y-2 text-xs mb-6">
            {[
              { label: "Storage",     cost: storageCost },
              { label: "Transcoding", cost: transcodeCost },
              { label: "Egress",      cost: egressCost },
            ].map(({ label, cost }) => (
              <div key={label} className="flex justify-between" style={{ color: "var(--text-muted)" }}>
                <span>{label}</span>
                <span className="font-mono">${cost.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <span>Total</span>
              <span className="font-mono">${total.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/signup" className="w-full block">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm"
              style={{ background: "#00F0FF", color: "#000" }}
            >
              Start Building <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="py-24" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div className="container mx-auto px-4 max-w-7xl">

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Simple, transparent pricing.
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Start free. Scale as you grow. Prices reflect real AWS infrastructure costs + 30% margin.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="relative flex flex-col p-7 rounded-2xl transition-all duration-300"
              style={{
                border: plan.highlight ? `2px solid ${plan.highlightColor}` : "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                boxShadow: plan.highlight ? `0 8px 40px ${plan.highlightColor}20` : undefined,
                transform: plan.highlight ? "scale(1.02)" : undefined,
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                  style={{ background: plan.badgeBg, color: "#000" }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <h3 className="font-display text-xl font-semibold mb-1">{plan.name}</h3>
                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-display font-bold">{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{plan.period}</span>
                </div>
              </div>

              {/* Resource limits */}
              <div className="space-y-2.5 mb-6 pb-6" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {plan.limits.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00F0FF" }} />
                    <span style={{ color: "var(--text-muted)" }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#22C55E" }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={plan.ctaHref} className="w-full block">
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                  style={
                    plan.highlight
                      ? { background: "#00F0FF", color: "#000" }
                      : { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }
                  }
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* Overage Rate Table */}
        <div className="max-w-3xl mx-auto mb-20">
          <h3 className="text-center font-display text-xl font-semibold mb-8">
            Overage Rates <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(beyond included quota)</span>
          </h3>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
            <table className="w-full text-sm">
              <thead style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.04)" }}>
                <tr>
                  {["Resource", "AWS Cost", "Our Rate (+30%)"].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-xs font-medium uppercase tracking-wider ${i === 0 ? "text-left" : "text-right"}`} style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { resource: "Storage",        unit: "per GB/month",  aws: "$0.023",       ours: "$0.030" },
                  { resource: "Egress (CDN)",   unit: "per GB",        aws: "$0.009–0.011", ours: "$0.015" },
                  { resource: "Transcoding SD", unit: "per minute",    aws: "$0.0045",      ours: "$0.006" },
                  { resource: "Transcoding HD", unit: "per minute",    aws: "$0.0090",      ours: "$0.012" },
                ].map((row, i) => (
                  <tr key={row.resource} style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{row.resource}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{row.unit}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs" style={{ color: "var(--text-muted)" }}>{row.aws}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold" style={{ color: "#00F0FF" }}>{row.ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYG Estimator */}
        <PaygEstimator />

      </div>
    </section>
  );
}
