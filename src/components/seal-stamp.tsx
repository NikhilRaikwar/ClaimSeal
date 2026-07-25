import type { Verdict } from "@/lib/claimseal-api";

const config: Record<Verdict, { label: string; ring: string; text: string; sub: string }> = {
  match: {
    label: "MATCH",
    ring: "border-emerald-bold text-emerald-bold",
    text: "text-emerald-bold",
    sub: "AUTHENTIC · SIGNED",
  },
  mismatch: {
    label: "MISMATCH",
    ring: "border-coral-bold text-coral-bold",
    text: "text-coral-bold",
    sub: "FIELDS DIFFER",
  },
  not_published: {
    label: "NOT PUBLISHED",
    ring: "border-amber-bold text-amber-bold border-dashed",
    text: "text-amber-bold",
    sub: "NO RECORD FOUND",
  },
};

export function SealStamp({ verdict }: { verdict: Verdict }) {
  const c = config[verdict];
  return (
    <div className="relative inline-block animate-stamp">
      <div
        className={`border-[5px] ${c.ring} rounded-2xl px-6 py-4 flex flex-col items-center bg-cream-50/40`}
      >
        <div
          className={`font-display font-bold text-4xl md:text-5xl leading-none tracking-tight ${c.text}`}
        >
          {c.label}
        </div>
        <div className={`mt-2 text-[10px] tracking-[0.3em] font-mono ${c.text}`}>{c.sub}</div>
      </div>
    </div>
  );
}
