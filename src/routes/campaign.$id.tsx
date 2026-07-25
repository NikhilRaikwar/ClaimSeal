import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, Link } from "@tanstack/react-router";
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
    ? `/verify?url=${encodeURIComponent(officialUrl)}&contract=${encodeURIComponent(campaign.claimContract)}`
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
      <main className="max-w-5xl mx-auto px-6 pt-4 pb-24">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-ink transition-colors mb-6"
        >
          <span aria-hidden>&larr;</span> Dashboard
        </Link>

        {loading && (
          <div className="p-12 bg-white rounded-[32px] border border-stone-200 text-center font-mono text-sm text-stone-500">
            Reading campaign record from X Layer Testnet...
          </div>
        )}
        {!loading && error && (
          <div className="p-10 bg-white rounded-[32px] border border-coral-bold/30">
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
            <section className="bg-white rounded-[32px] border border-stone-200 p-8 md:p-12 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.2)] animate-fade-up">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    ClaimSeal / Campaign record
                  </p>
                  <h1 className="font-display text-4xl md:text-5xl mt-3">{campaign.name}</h1>
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 font-mono text-sm text-emerald-deep hover:underline break-all"
                  >
                    {officialUrl} <span aria-hidden>&nearr;</span>
                  </a>
                </div>
                <span
                  className={`inline-flex px-3 py-1.5 rounded-full font-mono text-xs uppercase border ${statusTone(campaign.status)}`}
                >
                  {campaign.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6 mt-10 pt-8 border-t border-stone-100">
                <Detail label="Issuer" value={campaign.issuer} mono />
                <Detail
                  label="Claim contract"
                  value={campaign.claimContract}
                  mono
                  href={`${XLAYER_TESTNET_EXPLORER}/address/${campaign.claimContract}`}
                />
                <Detail
                  label="Path rule"
                  value={campaign.pathRule || "Any path on the canonical host"}
                  mono
                />
                <Detail label="Manifest revision" value={String(campaign.revision)} />
                <Detail label="Valid from (UTC)" value={formatDate(campaign.validFrom)} />
                <Detail label="Valid until (UTC)" value={formatDate(campaign.validUntil)} />
                <Detail label="Campaign ID" value={campaign.campaignId} mono />
                <Detail
                  label="Registry"
                  value={campaign.registryAddress}
                  mono
                  href={`${XLAYER_TESTNET_EXPLORER}/address/${campaign.registryAddress}`}
                />
              </div>
            </section>

            <section className="mt-8 grid md:grid-cols-[1.15fr_.85fr] gap-6">
              <div className="bg-ink rounded-3xl p-8 text-cream-50">
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
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link
                    to="/verify"
                    search={{ url: officialUrl, contract: campaign.claimContract }}
                    className="px-5 py-3 rounded-full bg-emerald-bold text-white text-sm font-medium"
                  >
                    Open verification
                  </Link>
                  <button
                    onClick={copyVerificationLink}
                    className="px-5 py-3 rounded-full bg-white/10 text-white text-sm font-medium border border-white/10"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-stone-200">
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
                          className="mt-4 px-5 py-2.5 rounded-full bg-ink text-cream-50 text-sm font-medium disabled:opacity-60"
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
                    className="mt-5 px-5 py-2.5 rounded-full border border-coral-bold text-coral-bold text-sm font-medium hover:bg-coral-soft"
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
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={revoke}
                        disabled={busy}
                        className="px-4 py-2.5 rounded-full bg-coral-bold text-white text-sm font-medium disabled:opacity-60"
                      >
                        {busy ? "Waiting for wallet..." : "Confirm revoke"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                        className="px-4 py-2.5 rounded-full bg-white border border-stone-200 text-sm font-medium"
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
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
        {label}
      </dt>
      <dd className={`${mono ? "font-mono text-xs break-all" : "text-sm"}`}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="hover:underline text-emerald-deep"
          >
            {value} <span aria-hidden>&nearr;</span>
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
