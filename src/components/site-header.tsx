import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

export function SiteHeader() {
  return (
    <nav className="sticky top-0 z-40 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 md:px-10">
      <Link to="/" className="flex min-w-0 shrink items-center gap-2.5 group">
        <div className="size-9 overflow-hidden rounded-xl rotate-12 bg-ink shadow-lg shadow-emerald-bold/20 transition-transform duration-500 group-hover:rotate-45">
          <img src="/claimseal-mark.svg" alt="" className="size-full" />
        </div>
        <span className="font-display text-xl tracking-tight">
          ClaimSeal<span className="text-emerald-bold">.</span>
        </span>
      </Link>
      <div className="hidden lg:flex items-center gap-8">
        <a
          href="/#verify"
          className="text-sm font-medium text-stone-700 hover:text-emerald-bold transition-colors"
        >
          Verify
        </a>
        <a
          href="/#issuers"
          className="text-sm font-medium text-stone-700 hover:text-emerald-bold transition-colors"
        >
          For issuers
        </a>
        <a
          href="/#how"
          className="text-sm font-medium text-stone-700 hover:text-emerald-bold transition-colors"
        >
          How it works
        </a>
      </div>
      <HeaderWalletAction />
    </nav>
  );
}

function HeaderWalletAction() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
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
            <details className="relative shrink-0">
              <summary className="seal-button cursor-pointer list-none bg-ink px-4 py-2.5 text-sm text-cream-50 shadow-[0_16px_35px_-24px_rgba(28,25,23,0.9)] [&::-webkit-details-marker]:hidden">
                <span className="hidden sm:inline">Issuer</span> Dashboard{" "}
                <ChevronDown aria-hidden className="size-4" />
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_18px_45px_-22px_rgba(28,25,23,0.35)]">
                <div className="border-b border-stone-100 px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
                    Connected wallet
                  </p>
                  <p
                    className="mt-1 break-all font-mono text-xs text-stone-700"
                    title={account.address}
                  >
                    {account.address}
                  </p>
                </div>
                <Link
                  to="/dashboard"
                  search={{ issuer: account.address }}
                  className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-cream-100"
                >
                  <WalletCards aria-hidden className="size-4 text-emerald-bold" />
                  Issuer dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    window.localStorage.removeItem("claimseal-issuer");
                    disconnect();
                    navigate({ to: "/", replace: true });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-coral-deep transition-colors hover:bg-coral-soft"
                >
                  <LogOut aria-hidden className="size-4" />
                  Disconnect wallet
                </button>
              </div>
            </details>
          );
        }
        return (
          <button
            type="button"
            onClick={() => {
              setConnectIntent(true);
              openConnectModal();
            }}
            disabled={!mounted}
            className="seal-button shrink-0 whitespace-nowrap bg-ink px-4 py-2.5 text-sm text-cream-50 disabled:opacity-50 sm:px-5"
          >
            Connect wallet
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
