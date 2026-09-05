const STACK = [
  "Go",
  "TypeScript",
  "Python",
  "FFmpeg",
  "Next.js",
  "Docker",
  "Kubernetes",
  "NATS",
  "Redis",
  "S3",
  "Cloudflare",
];

export function BuiltWithBand() {
  return (
    <section className="py-16 border-t border-borderSubtle bg-base relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-40 rounded-full bg-accent-mesh/5 blur-[100px]" />
      </div>
      <div className="relative container mx-auto px-4">
        <p className="text-center text-xs font-mono uppercase tracking-[0.2em] text-text-muted mb-8">
          Built on a modern media stack
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {STACK.map((tech) => (
            <span
              key={tech}
              className="font-mono text-sm text-text-muted/70 transition-colors duration-300 hover:text-text-primary cursor-default select-none"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}