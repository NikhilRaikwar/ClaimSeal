import { getAddress, type Address, type Hex } from "viem";
import {
  getAccount,
  getChainId,
  signTypedData,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { claimSealRegistryAbi } from "@/lib/claimseal-registry";
import {
  manifestHash,
  manifestJson,
  typedDataForManifest,
  type ClaimManifest,
  type UnsignedClaimManifest,
} from "@/lib/claimseal-protocol";
import { wagmiConfig } from "@/lib/rainbowkit";
import { configuredRegistryAddress, XLAYER_TESTNET_CHAIN_ID } from "@/lib/xlayer";

function registryAddress(): Address {
  const address = configuredRegistryAddress();
  if (!address) {
    throw new Error("ClaimSeal's X Layer Testnet registry has not been configured yet.");
  }
  return address;
}

export function connectIssuerWallet(): Address {
  const account = getAccount(wagmiConfig);
  if (!account.isConnected || !account.address) {
    throw new Error("Connect an issuer wallet with the RainbowKit button first.");
  }
  return getAddress(account.address);
}

export function currentWalletChainId(): number | undefined {
  const account = getAccount(wagmiConfig);
  return account.chainId ?? getChainId(wagmiConfig);
}

export async function switchToXLayerTestnet(): Promise<void> {
  await switchChain(wagmiConfig, { chainId: XLAYER_TESTNET_CHAIN_ID });
  if (getChainId(wagmiConfig) !== XLAYER_TESTNET_CHAIN_ID) {
    throw new Error("Your wallet is not connected to X Layer Testnet (chain 1952).");
  }
}

export async function signManifest(
  account: Address,
  manifest: UnsignedClaimManifest,
): Promise<ClaimManifest> {
  const connectedIssuer = connectIssuerWallet();
  if (connectedIssuer.toLowerCase() !== account.toLowerCase()) {
    throw new Error("The connected wallet does not match the issuer manifest.");
  }
  const signature = await signTypedData(wagmiConfig, {
    account,
    ...typedDataForManifest(manifest, registryAddress()),
  });
  return { ...manifest, signature };
}

export async function publishManifest(account: Address, manifest: ClaimManifest): Promise<Hex> {
  const connectedIssuer = connectIssuerWallet();
  if (connectedIssuer.toLowerCase() !== account.toLowerCase()) {
    throw new Error("The connected wallet does not match the issuer manifest.");
  }
  const hash = await writeContract(wagmiConfig, {
    account,
    address: registryAddress(),
    abi: claimSealRegistryAbi,
    functionName: "publish",
    args: [
      manifest.campaignId,
      manifestHash(manifest),
      manifestJson(manifest),
      BigInt(manifest.validFrom),
      BigInt(manifest.validUntil),
      BigInt(manifest.revision),
    ],
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  if (receipt.status !== "success") throw new Error("The publish transaction did not succeed.");
  return hash;
}

export async function revokeCampaign(account: Address, campaignId: Hex): Promise<Hex> {
  const connectedIssuer = connectIssuerWallet();
  if (connectedIssuer.toLowerCase() !== account.toLowerCase()) {
    throw new Error("The connected wallet does not own this campaign.");
  }
  const hash = await writeContract(wagmiConfig, {
    account,
    address: registryAddress(),
    abi: claimSealRegistryAbi,
    functionName: "revoke",
    args: [campaignId],
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  if (receipt.status !== "success") throw new Error("The revoke transaction did not succeed.");
  return hash;
}
