import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
      { name: "description", content: "Your published wallet-signed ClaimSeal campaigns." },
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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
              Issuer dashboard
            </p>
            <h1 className="font-display text-4xl md:text-5xl">Your campaigns</h1>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            {issuer && (
              <Link
                to="/publish"
                className="px-5 py-2.5 rounded-full bg-ink text-cream-50 text-sm font-medium hover:scale-[1.02] transition-transform"
              >
                New campaign +
              </Link>
            )}
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
              <div className="p-10 text-center font-mono text-sm text-stone-500">
                Reading X Layer Testnet records...
              </div>
            )}
            {!loading && !error && campaigns.length === 0 && (
              <section className="bg-white rounded-[28px] border border-stone-200 p-6 sm:p-10 text-center">
                <h2 className="font-display text-2xl">No published campaigns for this issuer.</h2>
                <p className="text-stone-600 mt-3">
                  Publish your first signed manifest to create a public verification record.
                </p>
                <Link
                  to="/publish"
                  className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-emerald-bold text-white text-sm font-medium"
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
                    className="group bg-white rounded-3xl border border-stone-200 p-6 hover:border-ink hover:-translate-y-0.5 transition-all"
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
                    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-deep">
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
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
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
    <section className="mx-auto max-w-xl rounded-[28px] border border-stone-200 bg-white p-8 text-center shadow-[0_20px_60px_-35px_rgba(28,25,23,0.24)] sm:p-12">
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
            className="mt-7 rounded-full bg-emerald-bold px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? "Checking wallet..." : "Connect wallet"}
          </button>
        )}
      </ConnectButton.Custom>
    </section>
  );
}
