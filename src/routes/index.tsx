import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileSignature, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClaimSeal - Verify a claim before you connect" },
      {
        name: "description",
        content:
          "Paste a campaign URL and contract to verify them against an issuer-signed record anchored on X Layer Testnet. No wallet connection required.",
      },
      { property: "og:title", content: "ClaimSeal - Verify a claim before you connect" },
      {
        property: "og:description",
        content:
          "A public verifier for token claim links: MATCH, MISMATCH, or NOT PUBLISHED before users connect a wallet.",
      },
      { property: "og:url", content: "https://claimseal.vercel.app" },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content: "https://claimseal.vercel.app/claimseal-social-banner.png",
      },
      { property: "og:image:width", content: "1600" },
      { property: "og:image:height", content: "900" },
      {
        property: "og:image:alt",
        content: "ClaimSeal - Verify a claim before you connect",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://claimseal.vercel.app/claimseal-social-banner.png",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { address, isConnected, status } = useAccount();
  const [url, setUrl] = useState("");
  const [contract, setContract] = useState("");
  const validUrl = /^https:\/\/[^\s]+\.[^\s]+/.test(url.trim());

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting" || !isConnected || !address) return;
    navigate({ to: "/dashboard", search: { issuer: address }, replace: true });
  }, [address, isConnected, navigate, status]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validUrl) return;
    navigate({
      to: "/verify",
      search: { url: url.trim(), contract: contract.trim() || undefined },
    });
  }

  return (
    <div className="min-h-screen bg-cream-100 text-ink">
      <SiteHeader />
      <main>
        <header className="relative max-w-6xl mx-auto text-center pt-12 sm:pt-16 md:pt-24 pb-10 sm:pb-14 px-4 sm:px-6 animate-fade-up">
          <div className="pointer-events-none absolute inset-x-4 top-10 -z-0 mx-auto h-48 max-w-3xl rounded-full bg-emerald-bold/10 blur-3xl" />
          <span className="relative inline-flex items-center gap-2 px-4 py-1.5 bg-white/90 border border-stone-200 rounded-full text-[11px] font-bold uppercase tracking-[0.22em] text-stone-500 mb-8 shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-bold animate-pulse" />X Layer Testnet
            - public verifier
          </span>
          <h1 className="relative font-display font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.97] mb-6 tracking-[-0.04em]">
            Verify a claim <br />
            before you{" "}
            <span className="relative inline-block italic text-emerald-bold">
              connect
              <span className="absolute inset-x-1 -bottom-1 -z-10 h-3 rounded-full bg-emerald-bold/14" />
            </span>
            .
          </h1>
          <p className="relative text-base sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
            An issuer-signed record for campaign URLs and contracts. Paste a link to get a clear
            MATCH, MISMATCH, or NOT PUBLISHED verdict.
          </p>
          <div className="relative mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <ProofPill icon={<FileSignature className="size-4" />} text="Issuer-signed" />
            <ProofPill icon={<ShieldCheck className="size-4" />} text="No wallet needed" />
            <ProofPill icon={<CheckCircle2 className="size-4" />} text="Onchain evidence" />
          </div>
        </header>

        <section
          id="verify"
          className="max-w-3xl mx-auto px-4 sm:px-6 scroll-mt-8 animate-fade-up stagger-2"
        >
          <form onSubmit={submit} className="surface-card rounded-[30px] p-5 sm:p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-bold">
                  Public verifier
                </p>
                <h2 className="mt-2 font-display text-2xl">Check before signing anything.</h2>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1.5 text-xs font-medium text-amber-deep">
                <TriangleAlert className="size-3.5" /> Read-only
              </span>
            </div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-stone-400 block mb-2">
              Campaign URL
            </label>
            <div className="relative">
              <input
                autoFocus
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                type="url"
                placeholder="https://claim.example.com/claim"
                className="seal-input pr-24 font-mono text-sm placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setUrl(text);
                  } catch {
                    /* Clipboard permission is optional. */
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-ink transition-colors"
              >
                Paste
              </button>
            </div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-stone-400 block mb-2 mt-5">
              Optional claim contract
            </label>
            <input
              value={contract}
              onChange={(event) => setContract(event.target.value)}
              placeholder="0x..."
              className="seal-input font-mono text-sm placeholder:text-stone-400"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
              <button
                type="submit"
                disabled={!validUrl}
                className="seal-button w-full bg-ink px-6 py-3.5 text-cream-50 shadow-[0_16px_35px_-22px_rgba(28,25,23,0.8)] sm:w-auto"
              >
                Verify campaign <span aria-hidden>&rarr;</span>
              </button>
              <p className="text-xs text-stone-500">
                Verification never asks you to connect a wallet.
              </p>
            </div>
          </form>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-24 animate-fade-up stagger-3">
          <div className="text-center mb-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
              One verdict. Never ambiguous.
            </p>
            <h2 className="font-display text-3xl md:text-4xl">Three possible outcomes.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <Outcome
              label="MATCH"
              tone="border-emerald-bold/30 bg-emerald-soft"
              title="The details line up."
              body="URL, optional contract, signer, registry record, and active dates all match."
            />
            <Outcome
              label="MISMATCH"
              tone="border-coral-bold/30 bg-coral-soft"
              title="A known detail differs."
              body="The public record exists, but at least one field does not match what was checked."
            />
            <Outcome
              label="NOT PUBLISHED"
              tone="border-amber-bold/30 bg-amber-soft"
              title="No record was found."
              body="This is not a safety verdict; the issuer may simply not have published a ClaimSeal manifest."
            />
          </div>
        </section>

        <section id="how" className="max-w-5xl mx-auto px-4 sm:px-6 mt-20 sm:mt-32">
          <h2 className="font-display text-3xl md:text-4xl mb-12 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Step
              number="01"
              title="Issuer signs"
              description="The campaign owner signs an EIP-712 manifest with their wallet: the source of truth."
              tone="text-emerald-bold"
            />
            <Step
              number="02"
              title="ClaimSeal anchors"
              description="The signed manifest and its hash are anchored on X Layer Testnet with validity dates."
              tone="text-amber-bold"
            />
            <Step
              number="03"
              title="You compare"
              description="Paste any URL. ClaimSeal reads the onchain record and checks every signed field."
              tone="text-coral-bold"
            />
          </div>
        </section>

        <section id="issuers" className="max-w-7xl mx-auto px-4 sm:px-6 mt-20 sm:mt-32 scroll-mt-8">
          <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden rounded-[32px] bg-ink p-7 text-center text-cream-50 sm:rounded-[40px] sm:p-12 md:p-20">
            <div className="relative z-10 max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold mb-4">
                For campaign issuers
              </p>
              <h2 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
                Publish a campaign in under a minute.
              </h2>
              <p className="mx-auto mb-8 max-w-lg text-stone-400">
                Connect once, sign your manifest, and anchor a verifiable record. The issuer wallet
                can revoke it at any time.
              </p>
              <div className="flex justify-center">
                <IssuerConnectCallToAction />
              </div>
            </div>
            <div className="absolute -right-32 -bottom-32 size-[500px] bg-emerald-bold/10 rounded-full blur-3xl" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function IssuerConnectCallToAction() {
  return (
    <ConnectButton.Custom>
      {({ mounted, openConnectModal }) => {
        return (
          <button
            type="button"
            disabled={!mounted}
            onClick={openConnectModal}
            className="seal-button bg-emerald-bold px-8 py-4 text-lg text-white shadow-[0_16px_45px_-22px_rgba(5,150,105,0.9)] disabled:opacity-50"
          >
            Connect wallet <span aria-hidden>&rarr;</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function Outcome({
  label,
  tone,
  title,
  body,
}: {
  label: string;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <article className={`rounded-3xl border p-7 transition-transform hover:-translate-y-1 ${tone}`}>
      <p className="font-mono text-xs uppercase tracking-widest">{label}</p>
      <h3 className="font-display text-xl mt-5">{title}</h3>
      <p className="text-sm text-stone-600 mt-2 leading-relaxed">{body}</p>
    </article>
  );
}

function Step({
  number,
  title,
  description,
  tone,
}: {
  number: string;
  title: string;
  description: string;
  tone: string;
}) {
  return (
    <article className="surface-card rounded-3xl p-6 sm:p-8 hover:-translate-y-1 transition-transform">
      <div className={`font-display text-5xl mb-6 ${tone}`}>{number}</div>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
    </article>
  );
}

function ProofPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur">
      <span className="text-emerald-bold">{icon}</span>
      {text}
    </div>
  );
}
