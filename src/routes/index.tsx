import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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
          "Paste a campaign URL and check it against a wallet-signed record anchored on X Layer Testnet. No wallet connection required.",
      },
      { property: "og:title", content: "ClaimSeal - Verify a claim before you connect" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [contract, setContract] = useState("");
  const validUrl = /^https:\/\/[^\s]+\.[^\s]+/.test(url.trim());

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
        <header className="max-w-5xl mx-auto text-center pt-12 sm:pt-16 md:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium uppercase tracking-widest text-stone-500 mb-8">
            <span className="size-1.5 rounded-full bg-emerald-bold animate-pulse" />X Layer Testnet
            - public verifier
          </span>
          <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl leading-[1.02] mb-6 tracking-tight">
            Verify a claim <br />
            before you{" "}
            <span className="italic text-emerald-bold underline decoration-[6px] decoration-emerald-bold/20 underline-offset-8">
              connect
            </span>
            .
          </h1>
          <p className="text-base sm:text-lg text-stone-600 max-w-xl mx-auto leading-relaxed">
            A wallet-signed record for campaign URLs and contracts. Paste a link to get a clear
            MATCH, MISMATCH, or NOT PUBLISHED verdict.
          </p>
        </header>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 animate-fade-up stagger-2">
          <form
            onSubmit={submit}
            className="bg-white rounded-[28px] border border-stone-200 p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.2)]"
          >
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
                className="w-full bg-cream-100 rounded-2xl px-5 py-4 pr-24 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-bold/40 placeholder:text-stone-400"
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
              className="w-full bg-cream-100 rounded-2xl px-5 py-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-bold/40 placeholder:text-stone-400"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
              <button
                type="submit"
                disabled={!validUrl}
                className="w-full sm:w-auto px-6 py-3.5 bg-ink text-cream-50 rounded-full font-display text-base hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:hover:scale-100"
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

        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-20 sm:mt-32">
          <div className="bg-ink rounded-[32px] sm:rounded-[40px] p-7 sm:p-12 md:p-20 text-cream-50 relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold mb-4">
                For campaign issuers
              </p>
              <h2 className="font-display text-4xl md:text-5xl mb-6 leading-tight">
                Publish a campaign in under a minute.
              </h2>
              <p className="text-stone-400 mb-8">
                Connect once, sign your manifest, and anchor a verifiable record. The issuer wallet
                can revoke it at any time.
              </p>
              <IssuerConnectCallToAction />
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
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [connectIntent, setConnectIntent] = useState(false);

  useEffect(() => {
    if (!connectIntent || !isConnected || !address) return;
    window.localStorage.setItem("claimseal-issuer", address);
    navigate({ to: "/dashboard", search: { issuer: address } });
  }, [address, connectIntent, isConnected, navigate]);

  return (
    <ConnectButton.Custom>
      {({ account, mounted, openConnectModal }) => {
        if (account) {
          return (
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard", search: { issuer: account.address } })}
              className="px-8 py-4 bg-emerald-bold text-white rounded-full font-display text-lg inline-flex items-center gap-2 hover:scale-105 transition-transform"
            >
              Open issuer dashboard <span aria-hidden>&rarr;</span>
            </button>
          );
        }
        return (
          <button
            type="button"
            disabled={!mounted}
            onClick={() => {
              setConnectIntent(true);
              openConnectModal();
            }}
            className="px-8 py-4 bg-emerald-bold text-white rounded-full font-display text-lg inline-flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
          >
            Connect issuer wallet <span aria-hidden>&rarr;</span>
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
    <article className={`rounded-3xl border p-7 ${tone}`}>
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
    <article className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 hover:-translate-y-1 transition-transform">
      <div className={`font-display text-5xl mb-6 ${tone}`}>{number}</div>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
    </article>
  );
}
