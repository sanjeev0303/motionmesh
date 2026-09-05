import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 border-t border-borderSubtle relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[50rem] h-[30rem] rounded-full bg-accent-motion/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[20rem] rounded-full bg-accent-mesh/8 blur-[120px]" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-borderSubtle bg-surface/60 backdrop-blur px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
            Start shipping video today.
          </h2>
          <p className="text-lg text-text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Store once, transcode once, stream everywhere. Free tier included — no credit card
            required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-12 px-8 text-base font-semibold group" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/docs">
                <BookOpen className="w-4 h-4" />
                Read the Docs
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}