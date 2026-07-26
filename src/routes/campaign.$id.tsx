import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { campaignUrl, fetchCampaign, type CampaignSummary } from "@/lib/claimseal-api";
import { connectIssuerWallet, revokeCampaign, switchToXLayerTestnet } from "@/lib/wallet";
import { XLAYER_TESTNET_EXPLORER } from "@/lib/xlayer";

export const Route = createFileRoute("/campaign/$id")({
  head: () => ({
    meta: [{ title: "Campaign record - ClaimSeal" }],
  }),
  component: CampaignPage,
});

function CampaignPage() {
  const { id } = Route.useParams();
  const { address: issuerWallet } = useAccount();
  const [campaign, setCampaign] = useState<CampaignSummary>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const record = await fetchCampaign(id);
      if (!record)
        throw new Error("This campaign record does not exist in the configured registry.");
      setCampaign(record);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const ownCampaign = Boolean(
    campaign && issuerWallet && campaign.issuer.toLowerCase() === issuerWallet.toLowerCase(),
  );
  const officialUrl = campaign ? campaignUrl(campaign) : "";
  const verifyUrl = campaign
    ? `/verify?url=${encodeURIComponent(officialUrl)}&contract=${encodeURIComponent(campaign.claimContract)}&campaignId=${encodeURIComponent(campaign.campaignId)}`
    : "/verify";

  async function revoke() {
    if (!campaign) return;
    setBusy(true);
    setError(undefined);
    try {
      const account = connectIssuerWallet();
      if (account.toLowerCase() !== campaign.issuer.toLowerCase()) {
        throw new Error(
          "Connect the issuer wallet that originally published this campaign to revoke it.",
        );
      }
      await switchToXLayerTestnet();
      await revokeCampaign(account, campaign.campaignId);
      setConfirming(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The revoke transaction could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function copyVerificationLink() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(`${window.location.origin}${verifyUrl}`).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="min-h-screen bg-cream-100 text-ink">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-16 sm:pb-24">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-ink transition-colors mb-6"
        >
          <span aria-hidden>&larr;</span> Dashboard
        </Link>

        {loading && (
          <div className="p-6 sm:p-12 bg-white rounded-[32px] border border-stone-200 text-center font-mono text-sm text-stone-500">
            Reading campaign record from X Layer Testnet...
          </div>
        )}
        {!loading && error && (
          <div className="p-6 sm:p-10 bg-white rounded-[32px] border border-coral-bold/30">
            <p className="font-mono text-[10px] uppercase tracking-widest text-coral-bold">
              Campaign unavailable
            </p>
            <h1 className="font-display text-3xl mt-3">Could not read this record.</h1>
            <p className="text-stone-600 mt-4">{error}</p>
          </div>
        )}
        {!loading && campaign && (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-coral-soft border border-coral-bold/25 text-coral-deep text-sm">
                {error}
              </div>
            )}
            <section className="surface-card rounded-[32px] p-5 animate-fade-up sm:p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    ClaimSeal / Campaign record
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl md:text-5xl mt-3 break-words">
                    {campaign.name}
                  </h1>
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-start gap-1 mt-4 font-mono text-sm text-emerald-deep hover:underline break-all"
                  >
                    <span>{officialUrl}</span>
                    <ArrowUpRight aria-hidden className="mt-0.5 size-4 shrink-0" />
                  </a>
                </div>
                <span
                  className={`inline-flex px-3 py-1.5 rounded-full font-mono text-xs uppercase border ${statusTone(campaign.status)}`}
                >
                  {campaign.status}
                </span>
              </div>

              <div className="grid gap-4 border-t border-stone-100 pt-8 sm:grid-cols-2 lg:gap-5">
                <Detail label="Campaign ID" value={campaign.campaignId} mono />
                <Detail
                  label="Publish transaction"
                  value={campaign.publishTransactionHash ?? "Indexing from X Layer event logs"}
                  mono
                  href={
                    campaign.publishTransactionHash
                      ? `${XLAYER_TESTNET_EXPLORER}/tx/${campaign.publishTransactionHash}`
                      : undefined
                  }
                />
                <Detail label="Issuer" value={campaign.issuer} mono />
                <Detail label="Claim contract reference" value={campaign.claimContract} mono />
                <Detail
                  label="Path rule"
                  value={campaign.pathRule || "Any path on the canonical host"}
                  mono
                />
                <Detail label="Manifest revision" value={String(campaign.revision)} />
                <Detail label="Valid from (UTC)" value={formatDate(campaign.validFrom)} />
                <Detail label="Valid until (UTC)" value={formatDate(campaign.validUntil)} />
              </div>
            </section>

            <section className="mt-8 grid md:grid-cols-[1.15fr_.85fr] gap-6">
              <div className="bg-ink rounded-3xl p-5 sm:p-8 text-cream-50">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold">
                  Public verification link
                </p>
                <h2 className="font-display text-2xl mt-3">
                  Let users verify this claim before they connect.
                </h2>
                <p className="text-stone-400 text-sm mt-3">
                  The verifier only reads the signed record. It never requests a visitor wallet
                  connection.
                </p>
                <div className="grid grid-cols-1 gap-3 mt-6 sm:flex sm:flex-wrap">
                  <Link
                    to="/verify"
                    search={{
                      url: officialUrl,
                      contract: campaign.claimContract,
                      campaignId: campaign.campaignId,
                    }}
                    className="seal-button w-full bg-emerald-bold px-5 py-3 text-sm text-white sm:w-auto"
                  >
                    Open verification
                  </Link>
                  <button
                    onClick={copyVerificationLink}
                    className="seal-button w-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white sm:w-auto"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  {campaign.publishTransactionHash && (
                    <a
                      href={`${XLAYER_TESTNET_EXPLORER}/tx/${campaign.publishTransactionHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="seal-button w-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white sm:w-auto"
                    >
                      View publish transaction
                    </a>
                  )}
                </div>
              </div>
              <div className="surface-card rounded-3xl p-5 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                  Issuer controls
                </p>
                {!ownCampaign && campaign.status !== "revoked" && (
                  <div className="mt-4">
                    <p className="text-sm text-stone-600">
                      Connect the original issuer wallet to revoke this campaign. ClaimSeal cannot
                      revoke it for you.
                    </p>
                    <ConnectButton.Custom>
                      {({ mounted, openConnectModal }) => (
                        <button
                          type="button"
                          onClick={openConnectModal}
                          disabled={!mounted}
                          className="seal-button mt-4 bg-ink px-5 py-2.5 text-sm text-cream-50 disabled:opacity-60"
                        >
                          Connect issuer wallet
                        </button>
                      )}
                    </ConnectButton.Custom>
                  </div>
                )}
                {campaign.status === "revoked" && (
                  <p className="text-sm text-coral-deep mt-4">
                    This onchain record has been revoked. Public verification returns MISMATCH.
                  </p>
                )}
                {ownCampaign && campaign.status !== "revoked" && !confirming && (
                  <button
                    onClick={() => setConfirming(true)}
                    className="seal-button mt-5 border border-coral-bold px-5 py-2.5 text-sm text-coral-bold hover:bg-coral-soft"
                  >
                    Revoke campaign
                  </button>
                )}
                {ownCampaign && confirming && (
                  <div className="mt-5">
                    <p className="text-sm font-medium">
                      Revoke &ldquo;{campaign.name}&rdquo; on X Layer Testnet?
                    </p>
                    <p className="text-xs text-stone-500 mt-2">
                      This cannot be undone. Future verification becomes MISMATCH.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button
                        onClick={revoke}
                        disabled={busy}
                        className="seal-button w-full bg-coral-bold px-4 py-2.5 text-sm text-white disabled:opacity-60 sm:w-auto"
                      >
                        {busy ? "Waiting for wallet..." : "Confirm revoke"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                        className="seal-button w-full border border-stone-200 bg-white px-4 py-2.5 text-sm sm:w-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <p className="mt-8 text-xs text-stone-500 max-w-3xl">
              ClaimSeal proves that the URL and optional contract match an issuer-signed record. It
              does not audit a website or smart contract, or guarantee that a campaign is safe.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  return (
    <div className="rounded-2xl bg-cream-100/70 px-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
        {label}
      </dt>
      <dd className={`${mono ? "font-mono text-xs leading-relaxed break-all" : "text-sm"}`}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-start gap-1 text-emerald-deep hover:underline"
          >
            <span className="break-all">{value}</span>
            <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function statusTone(status: CampaignSummary["status"]) {
  return {
    active: "bg-emerald-soft text-emerald-deep border-emerald-bold/30",
    revoked: "bg-coral-soft text-coral-deep border-coral-bold/30",
    expired: "bg-stone-100 text-stone-600 border-stone-300",
    scheduled: "bg-amber-soft text-amber-deep border-amber-bold/30",
  }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
