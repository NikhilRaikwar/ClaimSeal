import { ArrowUpRight } from "lucide-react";
import type { Verdict } from "@/lib/claimseal-api";

export interface EvidenceRow {
  field: string;
  expected: string;
  observed: string;
  ok: boolean;
  href?: string;
}

const dotColor: Record<Verdict, string> = {
  match: "bg-emerald-bold",
  mismatch: "bg-coral-bold",
  not_published: "bg-amber-bold",
};

export function EvidenceTable({ rows, verdict }: { rows: EvidenceRow[]; verdict: Verdict }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-cream-50">
      <div className="overflow-x-auto overscroll-x-contain">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[140px_1fr_1fr_40px] border-b border-stone-200 bg-cream-100 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-stone-400">
            <span>Field</span>
            <span>Expected</span>
            <span>Observed</span>
            <span className="text-right">Status</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.field}
              className={`grid grid-cols-[140px_1fr_1fr_40px] items-center px-5 py-4 font-mono text-[12px] ${
                index !== rows.length - 1 ? "border-b border-stone-100" : ""
              } ${!row.ok ? "relative overflow-hidden bg-coral-soft/40" : ""}`}
            >
              {!row.ok && (
                <div
                  className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-coral-bold/10 to-transparent"
                  style={{ animation: "scan-line 2s ease-in-out infinite" }}
                />
              )}
              <span className="relative text-stone-500">{row.field}</span>
              <span className="relative truncate text-stone-800">{row.expected}</span>
              <span
                className={`relative truncate ${row.ok ? "text-stone-800" : "font-semibold text-coral-bold"}`}
              >
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 hover:underline"
                  >
                    <span className="truncate">{row.observed}</span>
                    <ArrowUpRight aria-hidden className="size-3 shrink-0" />
                  </a>
                ) : (
                  row.observed
                )}
              </span>
              <span className="relative text-right">
                <span
                  className={`inline-block size-2 rounded-full ${row.ok ? dotColor[verdict] : "bg-coral-bold"}`}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
