import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { DEFAULT_XLAYER_TESTNET_RPC, xLayerTestnet } from "@/lib/xlayer";

// WalletConnect project IDs are public client identifiers, not private keys.
// Replace the fallback before enabling WalletConnect QR/mobile connections in production.
export const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "ClaimSeal",
  appDescription: "Verify an issuer-signed campaign record before connecting a wallet.",
  appUrl: "https://claimseal.app",
  projectId: walletConnectProjectId,
  chains: [xLayerTestnet],
  transports: {
    [xLayerTestnet.id]: http(
      import.meta.env.VITE_XLAYER_TESTNET_RPC_URL || DEFAULT_XLAYER_TESTNET_RPC,
    ),
  },
  ssr: true,
});
