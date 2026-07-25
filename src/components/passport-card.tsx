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
    body: "This does not mean the campaign is a scam. It only means no issuer has published a signed manifest for it.",
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
  const copy = verdictCopy[verdict];
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_20px_60px_-30px_rgba(28,25,23,0.25)]">
      <div className={`h-2 w-full ${copy.bar}`} />
      <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1.6fr_1fr] md:gap-10 md:p-12">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">
                ClaimSeal / Campaign Record
              </p>
              <p className="font-display text-2xl break-words">
                {campaign?.name ?? "Unknown campaign"}
              </p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">
                Chain
              </p>
              <p className="font-mono text-xs">X Layer Testnet &middot; 1952</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className={`font-display text-2xl leading-tight sm:text-3xl ${copy.accent}`}>
              &ldquo;{copy.title}&rdquo;
            </p>
            <p className="max-w-lg leading-relaxed text-stone-600">{copy.body}</p>
          </div>

          <dl className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                Checked URL
              </dt>
              <dd className="break-all font-mono text-xs">{checkedUrl ?? "-"}</dd>
            </div>
            <div>
              <dt className="mb-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                Issuer
              </dt>
              <dd className="break-all font-mono text-xs">{campaign?.issuer ?? "-"}</dd>
            </div>
            {campaign?.validUntil && (
              <div className="sm:col-span-2">
                <dt className="mb-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  Valid
                </dt>
                <dd className="font-mono text-xs">
                  {campaign.validFrom} &rarr; {campaign.validUntil}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden rounded-3xl bg-cream-100 p-6 sm:min-h-[220px] sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]"
            aria-hidden
          >
            <div className="whitespace-nowrap font-display text-[110px] leading-none -rotate-12">
              VERIFIED &middot; VERIFIED
            </div>
          </div>
          <SealStamp verdict={verdict} />
        </div>
      </div>
      {children}
    </div>
  );
}
