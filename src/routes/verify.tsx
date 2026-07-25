import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { EvidenceTable, type EvidenceRow } from "@/components/evidence-table";
import { PassportCard } from "@/components/passport-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { toUiVerdict, verifyClaim, type VerifyResponse } from "@/lib/claimseal-api";
import { XLAYER_TESTNET_EXPLORER } from "@/lib/xlayer";

const searchSchema = z.object({
  url: z.string().default(""),
  contract: z.string().optional(),
});

export const Route = createFileRoute("/verify")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Verification result - ClaimSeal" },
      {
        name: "description",
        content: "ClaimSeal verification result with evidence read from X Layer Testnet.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { url, contract } = Route.useSearch();
  const [result, setResult] = useState<VerifyResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(url));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setResult(undefined);
      setError("Enter a campaign URL from the ClaimSeal homepage to verify it.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setResult(undefined);
    setError(undefined);
    void verifyClaim({ url, claimContract: contract || undefined })
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Unable to verify this campaign.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, contract]);

  const rows: EvidenceRow[] = useMemo(() => {
    if (!result) return [];
    return result.checks.map((check) => ({
      field: fieldName(check.field),
      expected: check.expected ?? "-",
      observed: check.actual ?? humanStatus(check.status),
      ok: ["match", "valid", "active", "not_supplied"].includes(check.status),
      href:
        check.field === "registryAnchor" && result.campaign
          ? `${XLAYER_TESTNET_EXPLORER}/address/${result.campaign.registryAddress}`
          : undefined,
    }));
  }, [result]);

  function copyLink() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="min-h-screen bg-cream-100 text-ink">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-16 sm:pb-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-ink transition-colors mb-6"
        >
          <span aria-hidden>&larr;</span> Verify another
        </Link>

        {loading && <LoadingResult url={url} />}
        {!loading && error && <ErrorResult error={error} />}
        {!loading && result && (
          <>
            <div className="animate-fade-up">
              <PassportCard
                verdict={toUiVerdict(result.verdict)}
                campaign={result.campaign}
                checkedUrl={url}
              />
            </div>

            <section className="mt-10 animate-fade-up stagger-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Evidence
                  </p>
                  <h2 className="font-display text-2xl">Field-by-field comparison</h2>
                </div>
                <button
                  onClick={copyLink}
                  className="self-start text-xs font-medium text-stone-600 hover:text-emerald-bold transition-colors sm:self-auto"
                >
                  {copied ? "Copied" : "Copy verification link"}
                </button>
              </div>
              <EvidenceTable rows={rows} verdict={toUiVerdict(result.verdict)} />
            </section>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              {result.campaign && (
                <a
                  href={`${XLAYER_TESTNET_EXPLORER}/address/${result.campaign.registryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="seal-button w-full border border-stone-200 bg-white px-5 py-3 text-sm sm:w-auto"
                >
                  View registry on testnet <ArrowUpRight aria-hidden className="size-4 shrink-0" />
                </a>
              )}
              <button
                onClick={copyLink}
                className="seal-button w-full bg-ink px-5 py-3 text-sm text-cream-50 sm:w-auto"
              >
                {copied ? "Link copied" : "Share result"}
              </button>
            </div>

            <p className="mt-8 text-xs text-stone-500 max-w-2xl leading-relaxed">
              {result.limitations[0]}
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadingResult({ url }: { url: string }) {
  return (
    <div className="surface-card rounded-[32px] p-6 animate-fade-up sm:p-10 md:p-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-stone-400">
        ClaimSeal / Verifying
      </p>
      <h1 className="font-display text-3xl md:text-4xl mt-4">
        Reading the issuer-signed record...
      </h1>
      <p className="font-mono text-sm text-stone-500 mt-4 break-all">{url}</p>
      <div className="mt-8 h-2 rounded-full bg-cream-100 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-emerald-bold animate-pulse" />
      </div>
    </div>
  );
}

function ErrorResult({ error }: { error: string }) {
  return (
    <div className="surface-card rounded-[32px] border-coral-bold/30 p-6 animate-fade-up sm:p-10 md:p-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-coral-bold">
        Verification unavailable
      </p>
      <h1 className="font-display text-3xl md:text-4xl mt-4">
        ClaimSeal could not read the registry.
      </h1>
      <p className="text-stone-600 mt-4 max-w-xl">{error}</p>
      <p className="text-xs text-stone-500 mt-6">
        This is not a verification verdict. Try again after the registry service is configured.
      </p>
    </div>
  );
}

function fieldName(field: string) {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function humanStatus(status: string) {
  return status.replace(/_/g, " ");
}
