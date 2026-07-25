import { ConnectButton } from "@rainbow-me/rainbowkit";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useChainId } from "wagmi";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createUnsignedManifest, normalizeVerificationUrl } from "@/lib/claimseal-protocol";
import { publishManifest, signManifest, switchToXLayerTestnet } from "@/lib/wallet";
import { XLAYER_TESTNET_CHAIN_ID } from "@/lib/xlayer";

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
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wallet = address;
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
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
      await publishManifest(address, signedManifest);
      window.localStorage.setItem("claimseal-issuer", address);
      navigate({ to: "/dashboard", search: { issuer: address } });
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
        <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400 mb-2">
          Issuer flow
        </p>
        <h1 className="font-display text-4xl md:text-5xl mb-10">Publish a campaign</h1>

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

        <section className="bg-white rounded-[28px] border border-stone-200 p-5 sm:p-8 md:p-12 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.15)] animate-fade-up">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-coral-soft border border-coral-bold/25 text-coral-deep text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl mb-2">Connect your issuer wallet</h2>
                <p className="text-stone-600">
                  Your browser wallet signs the manifest. ClaimSeal never receives a private key and
                  cannot publish for you.
                </p>
              </div>
              <ConnectButton.Custom>
                {({ mounted, openConnectModal }) => (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    disabled={!mounted || busy}
                    className="w-full sm:w-auto p-5 bg-cream-100 rounded-2xl border border-stone-200 text-left hover:border-ink transition-colors disabled:opacity-60"
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
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-ink text-cream-50 font-medium hover:scale-[1.02] transition-transform disabled:opacity-60"
                  >
                    {busy ? "Waiting for wallet..." : "Switch to X Layer Testnet"}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(3)}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-bold text-white font-medium hover:scale-[1.02] transition-transform"
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
                    className="input"
                  />
                </Field>
                <Field label="Official campaign URL">
                  <input
                    value={form.url}
                    onChange={(event) => setForm({ ...form, url: event.target.value })}
                    placeholder="https://claim.example.com/claim"
                    className="input font-mono text-sm"
                  />
                </Field>
                <Field label="Claim contract address">
                  <input
                    value={form.contract}
                    onChange={(event) => setForm({ ...form, contract: event.target.value })}
                    placeholder="0x..."
                    className="input font-mono text-sm"
                  />
                </Field>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Valid from (UTC)">
                    <input
                      type="date"
                      value={form.validFrom}
                      onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                      className="input"
                    />
                  </Field>
                  <Field label="Valid until (UTC)">
                    <input
                      type="date"
                      value={form.validUntil}
                      onChange={(event) => setForm({ ...form, validUntil: event.target.value })}
                      className="input"
                    />
                  </Field>
                </div>
              </div>
              <button
                onClick={review}
                disabled={
                  !form.name || !form.url || !form.contract || !form.validFrom || !form.validUntil
                }
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-ink text-cream-50 font-medium hover:scale-[1.02] transition-transform disabled:opacity-40"
              >
                Review <span aria-hidden>&rarr;</span>
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
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
                The registry stores the signed manifest and its hash. No token approval, transfer,
                or custody is involved.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                <button
                  onClick={signAndPublish}
                  disabled={busy}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-bold text-white font-medium hover:scale-[1.02] transition-transform disabled:opacity-60"
                >
                  {busy ? "Waiting for wallet and testnet..." : "Sign EIP-712 & anchor"}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={busy}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-white border border-stone-200 font-medium hover:border-ink transition-colors disabled:opacity-60"
                >
                  Back
                </button>
              </div>
            </div>
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
      <style>{`.input { width: 100%; background: var(--cream-100); border-radius: 1rem; padding: .9rem 1.1rem; border: 1px solid transparent; outline: none; } .input:focus { border-color: var(--emerald-bold); background: white; }`}</style>
    </label>
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
