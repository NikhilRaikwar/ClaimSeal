import type { ReactNode } from "react";
import type { CampaignSummary, Verdict } from "@/lib/claimseal-api";
import { SealStamp } from "./seal-stamp";

const verdictCopy: Record<Verdict, { title: string; body: string; accent: string; bar: string }> = {
  match: {
    title: "This URL and contract match the active issuer-signed record.",
    body: "Every checked field aligns with the wallet-signed manifest anchored on X Layer Testnet.",
    accent: "text-emerald-bold",
    bar: "bg-emerald-bold",
  },
  mismatch: {
    title: "A known campaign exists, but one or more fields differ.",
    body: "The record on X Layer Testnet does not match what you pasted. Do not connect a wallet here.",
    accent: "text-coral-bold",
    bar: "bg-coral-bold",
  },
  not_published: {
    title: "No active ClaimSeal record was found.",
    body: "This does not mean the campaign is a scam — only that no issuer has published a signed manifest for it.",
    accent: "text-amber-bold",
    bar: "bg-amber-bold",
  },
};

export function PassportCard({
  verdict,
  campaign,
  checkedUrl,
  children,
}: {
  verdict: Verdict;
  campaign?: CampaignSummary;
  checkedUrl?: string;
  children?: ReactNode;
}) {
  const c = verdictCopy[verdict];
  return (
    <div className="relative bg-white rounded-[32px] border border-stone-200 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.25)] overflow-hidden">
      <div className={`h-2 w-full ${c.bar}`} />
      <div className="p-8 md:p-12 grid md:grid-cols-[1.6fr_1fr] gap-10">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">
                ClaimSeal / Campaign Record
              </p>
              <p className="font-display text-2xl">{campaign?.name ?? "Unknown campaign"}</p>
            </div>
            <div className="text-right space-y-1 hidden md:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">
                Chain
              </p>
              <p className="font-mono text-xs">X Layer Testnet · 1952</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className={`font-display text-2xl md:text-3xl leading-tight ${c.accent}`}>
              &ldquo;{c.title}&rdquo;
            </p>
            <p className="text-stone-600 max-w-lg leading-relaxed">{c.body}</p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                Checked URL
              </dt>
              <dd className="font-mono text-xs truncate">{checkedUrl ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                Issuer
              </dt>
              <dd className="font-mono text-xs truncate">{campaign?.issuer ?? "—"}</dd>
            </div>
            {campaign?.validUntil && (
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                  Valid
                </dt>
                <dd className="font-mono text-xs">
                  {campaign.validFrom} → {campaign.validUntil}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="relative flex items-center justify-center bg-cream-100 rounded-3xl p-8 min-h-[220px] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center overflow-hidden"
            aria-hidden
          >
            <div className="font-display text-[110px] whitespace-nowrap -rotate-12 leading-none">
              VERIFIED · VERIFIED
            </div>
          </div>
          <SealStamp verdict={verdict} />
        </div>
      </div>
      {children}
    </div>
  );
}
