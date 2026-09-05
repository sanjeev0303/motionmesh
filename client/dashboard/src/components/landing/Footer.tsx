import Link from "next/link";
import { Github, MessageSquare, Users, Mail, Heart } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Documentation", href: "/docs" },
  { label: "API Reference", href: "/docs/api-reference" },
  { label: "Player", href: "/docs/player" },
  { label: "Pricing", href: "#pricing" },
];

const DEVELOPER_LINKS = [
  { label: "Getting Started", href: "/docs/getting-started" },
  { label: "JavaScript SDK", href: "/docs/javascript" },
  { label: "Deployment", href: "/docs/deployment" },
];

const SYSTEM_LINKS = [
  { label: "Changelog", href: "/docs/changelog" },
  { label: "GitHub", href: "https://github.com/sanjeev0303/motionmesh" },
  {
    label: "Discussions",
    href: "https://github.com/sanjeev0303/motionmesh/discussions",
  },
  { label: "Discord", href: "https://discord.gg/motionmesh" },
];

export function Footer() {
  return (
    <footer className="border-t border-borderSubtle bg-base">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-accent-motion to-accent-mesh flex items-center justify-center">
                <div className="w-3 h-3 bg-base rounded-[3px]" />
              </div>
              <span className="font-display font-semibold tracking-tight text-lg text-text-primary">
                Motionmesh
              </span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Self-hosted video infrastructure. Store once, transcode once, stream everywhere.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://github.com/sanjeev0303/motionmesh"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="w-8 h-8 rounded-lg border border-borderSubtle bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent-mesh/50 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://discord.gg/motionmesh"
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="w-8 h-8 rounded-lg border border-borderSubtle bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent-mesh/50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/sanjeev0303/motionmesh/discussions"
                target="_blank"
                rel="noreferrer"
                aria-label="Discussions"
                className="w-8 h-8 rounded-lg border border-borderSubtle bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-accent-mesh/50 transition-colors"
              >
                <Users className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-text-primary">Product</h3>
            <ul className="space-y-3 text-sm text-text-muted">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-text-primary">Developers</h3>
            <ul className="space-y-3 text-sm text-text-muted">
              {DEVELOPER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4 text-text-primary">Community</h3>
            <ul className="space-y-3 text-sm text-text-muted">
              {SYSTEM_LINKS.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("http") ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-text-primary transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" />
                All systems operational
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-borderSubtle flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Motionmesh · Open-source video infrastructure
          </p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:support@motionmesh.co.in"
              className="hover:text-text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              support@motionmesh.co.in
            </a>
            <span className="inline-flex items-center gap-1.5">
              Built with
              <Heart className="w-3.5 h-3.5 text-accent-motion fill-accent-motion" />
              and FFmpeg
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}