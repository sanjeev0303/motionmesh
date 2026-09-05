"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, HardDrive, Video, FileCode2, Key, Gauge,
  CreditCard, Users, ScrollText, BookOpen, Settings, Server,
  History, Sparkles, ArrowUpRight,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useApi } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  match: (p: string) => boolean;
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.match(pathname);
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-all ${
        isActive
          ? "bg-surface-raised text-text-primary border-l-2 border-accent-motion"
          : "text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent"
      }`}
    >
      <item.icon className={`w-4 h-4 ${isActive ? "text-accent-motion" : "text-text-muted group-hover:text-text-primary"}`} />
      <span className="font-medium text-sm">{item.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const api = useApi();

  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/v1/billing/subscription", {});
      if (error || !response.ok) return null;
      return data as any;
    },
  });

  const isPro = subscription?.plan === "pro";

  const overviewItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
    { name: "Buckets", href: "/dashboard/buckets", icon: HardDrive, match: (p: string) => p.startsWith("/dashboard/buckets") },
    { name: "Videos", href: "/dashboard/videos", icon: Video, match: (p: string) => p.startsWith("/dashboard/videos") },
    { name: "Media Convert", href: "/dashboard/media-convert", icon: FileCode2, match: (p: string) => p.startsWith("/dashboard/media-convert") },
  ];

  const infraItems = [
    { name: "API Keys", href: "/dashboard/keys", icon: Key, match: (p: string) => p.startsWith("/dashboard/keys") },
    { name: "Status", href: "/dashboard/status", icon: Server, match: (p: string) => p.startsWith("/dashboard/status") },
  ];

  const accountItems = [
    { name: "Usage", href: "/dashboard/usage", icon: Gauge, match: (p: string) => p.startsWith("/dashboard/usage") },
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard, match: (p: string) => p.startsWith("/dashboard/billing") },
    { name: "Team", href: "/dashboard/team", icon: Users, match: (p: string) => p.startsWith("/dashboard/team") },
    { name: "Activity Log", href: "/dashboard/activity", icon: ScrollText, match: (p: string) => p.startsWith("/dashboard/activity") },
  ];

  return (
    <div className="w-64 flex-shrink-0 border-r border-borderSubtle bg-base hidden md:flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-borderSubtle">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-motion to-accent-mesh flex items-center justify-center shadow-sm shadow-accent-motion/20 group-hover:shadow-accent-motion/40 transition-shadow">
            <div className="w-3.5 h-3.5 bg-base rounded-sm" />
          </div>
          <span className="font-display font-semibold tracking-tight text-lg">Motionmesh</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          <div className="mb-6">
            <div className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Overview</div>
            {overviewItems.map((item) => (
              <SidebarLink key={item.name} item={item} pathname={pathname} />
            ))}
          </div>

          <div className="mb-6">
            <div className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Infrastructure</div>
            {infraItems.map((item) => (
              <SidebarLink key={item.name} item={item} pathname={pathname} />
            ))}
          </div>

          <div className="mb-6">
            <div className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Account</div>
            {accountItems.map((item) => (
              <SidebarLink key={item.name} item={item} pathname={pathname} />
            ))}
          </div>

          <div className="my-6 border-t border-borderSubtle" />

          <div className="mb-6 px-3">
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent"
            >
              <BookOpen className="w-4 h-4 text-text-muted group-hover:text-text-primary" />
              <span className="font-medium text-sm">Docs</span>
            </a>
            <Link
              href="/dashboard/changelog"
              className={`flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors ${
                pathname.startsWith("/dashboard/changelog")
                  ? "bg-surface-raised text-text-primary border-l-2 border-accent-motion"
                  : "text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent"
              }`}
            >
              <History className={`w-4 h-4 ${pathname.startsWith("/dashboard/changelog") ? "text-accent-motion" : "text-text-muted"}`} />
              <span className="font-medium text-sm">Changelog</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-colors ${
                pathname.startsWith("/dashboard/settings")
                  ? "bg-surface-raised text-text-primary border-l-2 border-accent-motion"
                  : "text-text-muted hover:text-text-primary hover:bg-surface border-l-2 border-transparent"
              }`}
            >
              <Settings className={`w-4 h-4 ${pathname.startsWith("/dashboard/settings") ? "text-accent-motion" : "text-text-muted"}`} />
              <span className="font-medium text-sm">Settings</span>
            </Link>
          </div>
        </nav>
      </div>

      {!isPro && (
        <div className="px-3 pb-2">
          <Link
            href="/dashboard/billing"
            className="flex items-start gap-2.5 p-3 rounded-xl border border-borderSubtle bg-gradient-to-br from-accent-motion/10 to-accent-mesh/5 hover:border-accent-motion/40 transition-colors group"
          >
            <Sparkles className="w-4 h-4 text-accent-motion mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary">Upgrade to Pro</p>
              <p className="text-[10px] text-text-muted mt-0.5">Higher limits, HD transcoding.</p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-motion transition-colors flex-shrink-0" />
          </Link>
        </div>
      )}

      <div className="p-4 border-t border-borderSubtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-primary truncate">My Account</span>
            <Badge variant={isPro ? "default" : "secondary"} className={`text-[9px] uppercase h-[18px] px-1.5 mt-0.5 w-fit rounded-sm ${isPro ? 'bg-accent-motion hover:bg-accent-motion/90 text-black' : 'bg-surface-raised text-text-muted hover:bg-surface-raised/80'}`}>
              {isPro ? 'PRO' : 'FREE'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}