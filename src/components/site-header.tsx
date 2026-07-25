import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export function SiteHeader() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-6 max-w-7xl mx-auto">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="size-9 bg-emerald-bold rounded-full rotate-12 flex items-center justify-center text-white font-display font-bold text-lg shadow-lg shadow-emerald-bold/20 group-hover:rotate-45 transition-transform duration-500">
          C
        </div>
        <span className="font-display text-xl tracking-tight">
          ClaimSeal<span className="text-emerald-bold">.</span>
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <Link
          to="/"
          className="text-sm font-medium text-stone-700 hover:text-emerald-bold transition-colors"
        >
          Verify
        </Link>
        <Link
          to="/dashboard"
          className="text-sm font-medium text-stone-700 hover:text-emerald-bold transition-colors"
        >
          For issuers
        </Link>
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
            <Link
              to="/dashboard"
              search={{ issuer: account.address }}
              className="px-5 py-2.5 bg-ink text-cream-50 rounded-full text-sm font-medium hover:scale-105 transition-transform inline-flex items-center gap-1.5"
            >
              Dashboard <span aria-hidden>&rarr;</span>
            </Link>
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
            className="px-5 py-2.5 bg-ink text-cream-50 rounded-full text-sm font-medium hover:scale-105 transition-transform inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            Connect wallet
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
