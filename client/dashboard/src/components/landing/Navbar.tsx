"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, X, Github, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "#pricing" },
  { label: "Player", href: "/docs/player" },
  { label: "API Reference", href: "/docs/api-reference" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-borderSubtle bg-base/80 backdrop-blur-xl supports-[backdrop-filter]:bg-base/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-motion to-accent-mesh flex items-center justify-center shadow-[0_0_12px_rgba(255,138,61,0.25)] transition-shadow group-hover:shadow-[0_0_20px_rgba(77,217,232,0.35)]">
              <div className="w-4 h-4 bg-base rounded-[4px]" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-text-primary">
              Motionmesh
            </span>
          </Link>

          <div className="hidden md:flex gap-6 text-sm font-medium text-text-muted">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-text-primary ${
                  pathname?.startsWith(link.href) ? "text-text-primary" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/sanjeev0303/motionmesh"
            target="_blank"
            rel="noreferrer"
            aria-label="Motionmesh on GitHub"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="hidden lg:inline">Star on GitHub</span>
          </Link>

          <SignedOut>
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="sm:inline-flex hidden sm:flex">
              <Link href="/signup">
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </SignedOut>

          <SignedIn>
            <Button variant="ghost" size="sm" className="mr-1 hidden sm:inline-flex" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-borderSubtle bg-surface text-text-primary"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-borderSubtle bg-base/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-borderSubtle flex flex-col gap-2">
              <SignedOut>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </SignedIn>
              <Link
                href="https://github.com/sanjeev0303/motionmesh"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-colors inline-flex items-center gap-2"
              >
                <Github className="w-4 h-4" /> GitHub
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}