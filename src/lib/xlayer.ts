import { defineChain, isAddress, type Address } from "viem";

export const XLAYER_TESTNET_CHAIN_ID = 1952;
export const DEFAULT_XLAYER_TESTNET_RPC = "https://testrpc.xlayer.tech/terigon";
export const XLAYER_TESTNET_EXPLORER = "https://www.oklink.com/x-layer-testnet";

export const xLayerTestnet = defineChain({
  id: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_XLAYER_TESTNET_RPC_URL || DEFAULT_XLAYER_TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: { name: "OKLink Explorer", url: XLAYER_TESTNET_EXPLORER },
  },
  testnet: true,
});

export function configuredRegistryAddress(): Address | undefined {
  const value = import.meta.env.VITE_CLAIMSEAL_REGISTRY_ADDRESS;
  if (!value || !isAddress(value) || /^0x0{40}$/i.test(value)) return undefined;
  return value as Address;
}

export function explorerTransactionUrl(transactionHash: string) {
  return `${XLAYER_TESTNET_EXPLORER}/tx/${transactionHash}`;
}
