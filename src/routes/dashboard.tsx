import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileSignature, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchIssuerCampaigns, type CampaignSummary } from "@/lib/claimseal-api";

const searchSchema = z.object({ issuer: z.string().optional() });

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Issuer dashboard - ClaimSeal" },
      { name: "description", content: "Your published issuer-signed ClaimSeal campaigns." },
    ],
  }),
  component: Dashboard,
});

const statusStyle: Record<CampaignSummary["status"], string> = {
  active: "bg-emerald-soft text-emerald-deep border-emerald-bold/30",
  revoked: "bg-coral-soft text-coral-deep border-coral-bold/30",
  expired: "bg-stone-100 text-stone-600 border-stone-300",
  scheduled: "bg-amber-soft text-amber-deep border-amber-bold/30",
};

function Dashboard() {
  const { issuer: searchIssuer } = Route.useSearch();
  const navigate = useNavigate();
  const { address, isConnected, status } = useAccount();
  const [issuer, setIssuer] = useState(searchIssuer);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(searchIssuer));
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;
    if (isConnected && address) {
      window.localStorage.setItem("claimseal-issuer", address);
      setIssuer(address);
      if (searchIssuer?.toLowerCase() !== address.toLowerCase()) {
        navigate({ to: "/dashboard", search: { issuer: address }, replace: true });
      }
      return;
    }
    setIssuer(undefined);
    setCampaigns([]);
    setLoading(false);
  }, [address, isConnected, navigate, searchIssuer, status]);

  useEffect(() => {
    if (!issuer) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void fetchIssuerCampaigns(issuer)
      .then((items) => {
        if (!cancelled) setCampaigns(items);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load issuer campaigns.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [issuer]);

  const stats = useMemo(
    () => ({
      published: campaigns.length,
      active: campaigns.filter((campaign) => campaign.status === "active").length,
      scheduled: campaigns.filter((campaign) => campaign.status === "scheduled").length,
      inactive: campaigns.filter(
        (campaign) => campaign.status === "expired" || campaign.status === "revoked",
      ).length,
    }),
    [campaigns],
  );

  return (
    <div className="min-h-screen bg-cream-100 text-ink">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 sm:pb-24">
        <div className="mb-10 rounded-[32px] bg-ink p-6 text-cream-50 shadow-[0_22px_70px_-45px_rgba(28,25,23,0.65)] sm:p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold mb-2">
                Issuer dashboard
              </p>
              <h1 className="font-display text-4xl md:text-5xl">Your campaigns</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-400">
                Manage issuer-signed manifests, test public verification links, and prove campaign
                authenticity before users connect wallets.
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-3">
              {issuer && (
                <Link
                  to="/publish"
                  className="seal-button bg-emerald-bold px-5 py-3 text-sm text-white"
                >
                  New campaign <Plus aria-hidden className="size-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {issuer && (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-coral-soft border border-coral-bold/25 text-coral-deep text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Stat label="Published" value={stats.published} tone="text-ink" />
              <Stat label="Active" value={stats.active} tone="text-emerald-bold" />
              <Stat label="Scheduled" value={stats.scheduled} tone="text-amber-bold" />
              <Stat label="Inactive" value={stats.inactive} tone="text-coral-bold" />
            </div>
            {loading && (
              <div className="surface-card rounded-[28px] p-10 text-center font-mono text-sm text-stone-500">
                Reading X Layer Testnet records...
              </div>
            )}
            {!loading && !error && campaigns.length === 0 && (
              <section className="surface-card rounded-[28px] p-6 text-center sm:p-10">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
                  <FileSignature aria-hidden className="size-7" />
                </div>
                <h2 className="font-display text-2xl">No published campaigns for this issuer.</h2>
                <p className="text-stone-600 mt-3">
                  Publish your first signed manifest to create a public verification record.
                </p>
                <Link
                  to="/publish"
                  className="seal-button mt-6 bg-emerald-bold px-5 py-2.5 text-sm text-white"
                >
                  Publish a campaign
                </Link>
              </section>
            )}
            {!loading && campaigns.length > 0 && (
              <section
                className={`grid gap-5 ${campaigns.length === 1 ? "max-w-3xl" : "lg:grid-cols-2"}`}
              >
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.campaignId}
                    to="/campaign/$id"
                    params={{ id: campaign.campaignId }}
                    className="group surface-card rounded-3xl p-6 hover:-translate-y-1 hover:border-emerald-bold/45 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-xl">{campaign.name}</p>
                        <p className="font-mono text-xs text-stone-500 mt-2 truncate max-w-[28rem]">
                          {campaign.canonicalHost}
                          {campaign.pathRule || "/"}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase ${statusStyle[campaign.status]}`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-stone-100 font-mono text-[10px] uppercase tracking-wider text-stone-400">
                      <span>
                        Revision{" "}
                        <b className="block mt-1 text-stone-700 text-xs">{campaign.revision}</b>
                      </span>
                      <span>
                        Expires{" "}
                        <b className="block mt-1 text-stone-700 text-xs normal-case tracking-normal">
                          {dateLabel(campaign.validUntil)}
                        </b>
                      </span>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-soft px-3 py-1.5 text-sm font-bold text-emerald-deep">
                      View campaign record{" "}
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}
        {!issuer && <IssuerAccess loading={status === "connecting" || status === "reconnecting"} />}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">{label}</p>
      <p className={`font-display text-3xl mt-2 ${tone}`}>{value}</p>
    </div>
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

function IssuerAccess({ loading }: { loading: boolean }) {
  return (
    <section className="surface-card mx-auto max-w-xl rounded-[28px] p-8 text-center sm:p-12">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
        <ShieldCheck aria-hidden className="size-7" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold">
        Issuer access
      </p>
      <h2 className="mt-3 font-display text-3xl">Connect a wallet to view campaigns.</h2>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Your dashboard only shows records published by the wallet you connect.
      </p>
      <ConnectButton.Custom>
        {({ mounted, openConnectModal }) => (
          <button
            type="button"
            onClick={openConnectModal}
            disabled={!mounted || loading}
            className="seal-button mt-7 bg-emerald-bold px-6 py-3 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Checking wallet..." : "Connect wallet"}
          </button>
        )}
      </ConnectButton.Custom>
    </section>
  );
}
