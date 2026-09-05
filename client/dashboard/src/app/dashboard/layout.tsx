import { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Dashboard - MotionMesh",
  description: "Manage your video infrastructure.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-base text-text-primary relative">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60rem 30rem at 85% -10%, rgba(255,138,61,0.05), transparent 60%), radial-gradient(50rem 30rem at -5% 110%, rgba(77,217,232,0.04), transparent 60%)",
        }}
      />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <Toaster />
    </div>
  );
}
