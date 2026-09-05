"use client";

import { usePathname } from "next/navigation";
import { useCommandPalette } from "@/lib/store";
import { Search } from "lucide-react";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";

const PAGE_TITLES: [string, string][] = [
  ["/dashboard/media-convert", "Media Convert"],
  ["/dashboard/buckets", "Buckets"],
  ["/dashboard/videos", "Videos"],
  ["/dashboard/keys", "API Keys"],
  ["/dashboard/usage", "Usage & Billing"],
  ["/dashboard/billing", "Billing"],
  ["/dashboard/team", "Team"],
  ["/dashboard/activity", "Activity Log"],
  ["/dashboard/status", "Status"],
  ["/dashboard/changelog", "Changelog"],
  ["/dashboard/settings", "Settings"],
  ["/dashboard", "Overview"],
];

export function Topbar() {
  const { setOpen } = useCommandPalette();
  const pathname = usePathname();
  const pageTitle = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Dashboard";

  return (
    <div className="h-16 border-b border-borderSubtle bg-base/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-text-muted hidden sm:inline">MotionMesh</span>
        <span className="text-text-muted/40 hidden sm:inline">/</span>
        <span className="text-sm font-display font-semibold text-text-primary truncate">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-borderSubtle rounded-md text-sm text-text-muted hover:text-text-primary hover:border-accent-motion/50 transition-colors w-48 sm:w-64"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] font-medium opacity-100 bg-surface-raised px-1.5 py-0.5 rounded">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Notification Bell */}
        <NotificationDropdown />
      </div>
    </div>
  );
}