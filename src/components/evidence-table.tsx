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
    <div className="rounded-2xl border border-stone-200 bg-cream-50 overflow-hidden">
      <div className="grid grid-cols-[140px_1fr_1fr_40px] px-5 py-3 bg-cream-100 text-[10px] font-mono uppercase tracking-widest text-stone-400 border-b border-stone-200">
        <span>Field</span>
        <span>Expected</span>
        <span>Observed</span>
        <span className="text-right">·</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.field}
          className={`grid grid-cols-[140px_1fr_1fr_40px] px-5 py-4 items-center font-mono text-[12px] ${
            i !== rows.length - 1 ? "border-b border-stone-100" : ""
          } ${!r.ok ? "bg-coral-soft/40 relative overflow-hidden" : ""}`}
        >
          {!r.ok && (
            <div
              className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-coral-bold/10 to-transparent"
              style={{ animation: "scan-line 2s ease-in-out infinite" }}
            />
          )}
          <span className="text-stone-500 relative">{r.field}</span>
          <span className="truncate text-stone-800 relative">{r.expected}</span>
          <span
            className={`truncate relative ${r.ok ? "text-stone-800" : "text-coral-bold font-semibold"}`}
          >
            {r.href ? (
              <a href={r.href} target="_blank" rel="noreferrer" className="hover:underline">
                {r.observed} ↗
              </a>
            ) : (
              r.observed
            )}
          </span>
          <span className="text-right relative">
            <span
              className={`inline-block size-2 rounded-full ${r.ok ? dotColor[verdict] : "bg-coral-bold"}`}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
