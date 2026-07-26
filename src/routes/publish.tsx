import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileSignature, Network, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useChainId } from "wagmi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createUnsignedManifest, normalizeVerificationUrl } from "@/lib/claimseal-protocol";
import { publishManifest, signManifest, switchToXLayerTestnet } from "@/lib/wallet";
import { XLAYER_TESTNET_CHAIN_ID, XLAYER_TESTNET_EXPLORER } from "@/lib/xlayer";

export const Route = createFileRoute("/publish")({
  head: () => ({
    meta: [
      { title: "Publish a campaign - ClaimSeal" },
      {
        name: "description",
        content:
          "Sign an EIP-712 manifest and anchor a verifiable campaign record on X Layer Testnet.",
      },
    ],
  }),
  component: PublishPage,
});

type Step = 1 | 2 | 3 | 4;

function PublishPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wallet = address;
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [published, setPublished] = useState<{
    campaignId: `0x${string}`;
    txHash: `0x${string}`;
    verificationUrl: string;
  }>();
  const [form, setForm] = useState({
    name: "",
    url: "",
    contract: "",
    validFrom: "",
    validUntil: "",
  });

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Connect wallet" },
    { n: 2, label: "Network" },
    { n: 3, label: "Campaign details" },
    { n: 4, label: "Review & sign" },
  ];
  const onXLayer = chainId === XLAYER_TESTNET_CHAIN_ID;

  useEffect(() => {
    if (isConnected && address && step === 1) setStep(2);
  }, [address, isConnected, step]);

  async function switchNetwork() {
    setBusy(true);
    setError(undefined);
    try {
      await switchToXLayerTestnet();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  function review() {
    setError(undefined);
    try {
      if (!address) throw new Error("Connect the issuer wallet first.");
      const parsedUrl = normalizeVerificationUrl(form.url);
      createUnsignedManifest({
        issuer: address,
        name: form.name,
        canonicalHost: parsedUrl.canonicalHost,
        pathRule: parsedUrl.path,
        claimContract: form.contract as `0x${string}`,
        validFrom: startOfUtcDay(form.validFrom),
        validUntil: endOfUtcDay(form.validUntil),
        nonce: "preview",
      });
      setStep(4);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  async function signAndPublish() {
    if (!address) return;
    setBusy(true);
    setError(undefined);
    try {
      await switchToXLayerTestnet();
      const parsedUrl = normalizeVerificationUrl(form.url);
      const manifest = createUnsignedManifest({
        issuer: address,
        name: form.name,
        canonicalHost: parsedUrl.canonicalHost,
        pathRule: parsedUrl.path,
        claimContract: form.contract as `0x${string}`,
        validFrom: startOfUtcDay(form.validFrom),
        validUntil: endOfUtcDay(form.validUntil),
        nonce: createNonce(),
      });
      const signedManifest = await signManifest(address, manifest);
      const txHash = await publishManifest(address, signedManifest);
      window.localStorage.setItem("claimseal-issuer", address);
      setPublished({
        campaignId: signedManifest.campaignId,
        txHash,
        verificationUrl: `/verify?url=${encodeURIComponent(form.url)}&contract=${encodeURIComponent(form.contract)}&campaignId=${encodeURIComponent(signedManifest.campaignId)}`,
      });
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 text-ink">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-16 sm:pb-24">
        <div className="mb-10 rounded-[32px] bg-ink p-6 text-cream-50 sm:p-8 md:p-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold mb-2">
            Issuer flow
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Publish a campaign</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400">
            Sign a campaign manifest, anchor it on X Layer Testnet, and give users a public
            verification link before they connect wallets.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2">
          {steps.map((item, index) => (
            <div key={item.n} className="flex items-center gap-3 shrink-0">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  step === item.n
                    ? "bg-ink text-cream-50 border-ink"
                    : step > item.n
                      ? "bg-emerald-soft border-emerald-bold text-emerald-deep"
                      : "bg-white border-stone-200 text-stone-500"
                }`}
              >
                <span className="font-mono text-xs">
                  {step > item.n ? "OK" : String(item.n).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {index < steps.length - 1 && <div className="w-6 h-px bg-stone-300" />}
            </div>
          ))}
        </div>

        <section className="surface-card rounded-[28px] p-5 animate-fade-up sm:p-8 md:p-12">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-coral-soft border border-coral-bold/25 text-coral-deep text-sm">
              {error}
            </div>
          )}

          {published && (
            <div className="space-y-6">
              <div>
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
                  <CheckCircle2 aria-hidden className="size-6" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-bold">
                  Published on X Layer Testnet
                </p>
                <h2 className="mt-2 font-display text-3xl">Campaign record is live.</h2>
                <p className="mt-3 max-w-xl text-stone-600">
                  The signed manifest is anchored. Use this screen in the demo before moving to the
                  dashboard or verifier.
                </p>
              </div>
              <div className="grid gap-4 rounded-2xl border border-stone-200 bg-cream-100 p-5">
                <Detail label="Campaign ID" value={published.campaignId} />
                <Detail label="Publish transaction" value={published.txHash} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                <Link
                  to="/campaign/$id"
                  params={{ id: published.campaignId }}
                  className="seal-button bg-emerald-bold px-6 py-3 text-white"
                >
                  Open campaign record <span aria-hidden>&rarr;</span>
                </Link>
                <Link
                  to="/verify"
                  search={{
                    url: form.url,
                    contract: form.contract,
                    campaignId: published.campaignId,
                  }}
                  className="seal-button border border-stone-200 bg-white px-6 py-3"
                >
                  Open verification
                </Link>
                <Link
                  to="/dashboard"
                  search={{ issuer: address }}
                  className="seal-button border border-stone-200 bg-white px-6 py-3"
                >
                  Back to dashboard
                </Link>
                <a
                  href={`${XLAYER_TESTNET_EXPLORER}/tx/${published.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="seal-button border border-stone-200 bg-white px-6 py-3"
                >
                  View transaction
                </a>
              </div>
            </div>
          )}

          {!published && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
                      <Wallet aria-hidden className="size-6" />
                    </div>
                    <h2 className="font-display text-2xl mb-2">Connect your issuer wallet</h2>
                    <p className="text-stone-600">
                      Your browser wallet signs the manifest. ClaimSeal never receives a private key
                      and cannot publish for you.
                    </p>
                  </div>
                  <ConnectButton.Custom>
                    {({ mounted, openConnectModal }) => (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        disabled={!mounted || busy}
                        className="w-full rounded-2xl border border-stone-200 bg-cream-100 p-5 text-left transition-colors hover:border-emerald-bold disabled:opacity-60 sm:w-auto"
                      >
                        <div className="font-display text-lg mb-1">Connect with RainbowKit</div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                          Browser and WalletConnect wallets
                        </div>
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-amber-soft text-amber-bold">
                      <Network aria-hidden className="size-6" />
                    </div>
                    <h2 className="font-display text-2xl mb-2">Network check</h2>
                    <p className="text-stone-600">
                      Campaign records are anchored on X Layer Testnet (chain 1952).
                    </p>
                  </div>
                  <div className="p-5 bg-cream-100 rounded-2xl border border-stone-200 flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                        Connected wallet
                      </div>
                      <div className="font-mono text-sm">{short(wallet)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-1">
                        Current network
                      </div>
                      <div
                        className={`font-mono text-sm ${onXLayer ? "text-emerald-bold" : "text-coral-bold"}`}
                      >
                        {onXLayer ? "X Layer Testnet - 1952" : `Chain ${chainId ?? "unknown"}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!onXLayer ? (
                      <button
                        onClick={switchNetwork}
                        disabled={busy}
                        className="seal-button w-full bg-ink px-6 py-3 text-cream-50 disabled:opacity-60 sm:w-auto"
                      >
                        {busy ? "Waiting for wallet..." : "Switch to X Layer Testnet"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep(3)}
                        className="seal-button w-full bg-emerald-bold px-6 py-3 text-white sm:w-auto"
                      >
                        Continue <span aria-hidden>&rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
                      <FileSignature aria-hidden className="size-6" />
                    </div>
                    <h2 className="font-display text-2xl mb-2">Campaign details</h2>
                    <p className="text-stone-600">
                      These fields are signed by your wallet and compared during every verification.
                    </p>
                  </div>
                  <div className="grid gap-5">
                    <Field label="Campaign name">
                      <input
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Testnet token claim"
                        className="seal-input"
                      />
                    </Field>
                    <Field label="Official campaign URL">
                      <input
                        value={form.url}
                        onChange={(event) => setForm({ ...form, url: event.target.value })}
                        placeholder="https://claim.example.com/claim"
                        className="seal-input font-mono text-sm"
                      />
                    </Field>
                    <Field label="Claim contract address">
                      <input
                        value={form.contract}
                        onChange={(event) => setForm({ ...form, contract: event.target.value })}
                        placeholder="0x..."
                        className="seal-input font-mono text-sm"
                      />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Valid from (UTC)">
                        <input
                          type="date"
                          value={form.validFrom}
                          onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                          className="seal-input"
                        />
                      </Field>
                      <Field label="Valid until (UTC)">
                        <input
                          type="date"
                          value={form.validUntil}
                          onChange={(event) => setForm({ ...form, validUntil: event.target.value })}
                          className="seal-input"
                        />
                      </Field>
                    </div>
                  </div>
                  <button
                    onClick={review}
                    disabled={
                      !form.name ||
                      !form.url ||
                      !form.contract ||
                      !form.validFrom ||
                      !form.validUntil
                    }
                    className="seal-button w-full bg-ink px-6 py-3 text-cream-50 sm:w-auto"
                  >
                    Review <span aria-hidden>&rarr;</span>
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald-bold">
                      <CheckCircle2 aria-hidden className="size-6" />
                    </div>
                    <h2 className="font-display text-2xl mb-2">Review & sign</h2>
                    <p className="text-stone-600">
                      First your wallet signs the EIP-712 manifest, then it sends the registry
                      transaction.
                    </p>
                  </div>
                  <pre className="p-5 bg-cream-100 rounded-2xl border border-stone-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        name: form.name,
                        url: form.url,
                        claimContract: form.contract,
                        issuer: wallet,
                        chainId: 1952,
                        validFrom: form.validFrom,
                        validUntil: form.validUntil,
                      },
                      null,
                      2,
                    )}
                  </pre>
                  <p className="text-xs text-stone-500">
                    The registry stores the signed manifest and its hash. No token approval,
                    transfer, or custody is involved.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                    <button
                      onClick={signAndPublish}
                      disabled={busy}
                      className="seal-button w-full bg-emerald-bold px-6 py-3 text-white disabled:opacity-60 sm:w-auto"
                    >
                      {busy ? "Waiting for wallet and testnet..." : "Sign EIP-712 & anchor"}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={busy}
                      className="seal-button w-full border border-stone-200 bg-white px-6 py-3 disabled:opacity-60 sm:w-auto"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 block mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-stone-700">{value}</p>
    </div>
  );
}

function startOfUtcDay(value: string) {
  const seconds = Date.parse(`${value}T00:00:00.000Z`) / 1000;
  if (!Number.isFinite(seconds)) throw new Error("Choose a valid UTC start date.");
  return seconds;
}

function endOfUtcDay(value: string) {
  const seconds = Date.parse(`${value}T23:59:59.000Z`) / 1000;
  if (!Number.isFinite(seconds)) throw new Error("Choose a valid UTC end date.");
  return seconds;
}

function createNonce() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function short(value?: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "-";
}

function messageOf(cause: unknown) {
  return cause instanceof Error ? cause.message : "The wallet request could not be completed.";
}
