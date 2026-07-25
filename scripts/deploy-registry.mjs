import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const artifactPath = path.join(root, "artifacts", "ClaimSealRegistry.json");
const rpcUrl = process.env.XLAYER_TESTNET_RPC_URL ?? "https://testrpc.xlayer.tech/terigon";
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Set DEPLOYER_PRIVATE_KEY to a dedicated funded X Layer testnet deployer key.");
}

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer-test" },
  },
  testnet: true,
});

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, chain: xLayerTestnet, transport: http(rpcUrl) });
const publicClient = createPublicClient({ chain: xLayerTestnet, transport: http(rpcUrl) });

console.log(`Deploying from ${account.address} to X Layer Testnet (1952)…`);
const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
console.log(`Transaction: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

if (!receipt.contractAddress) throw new Error("Deployment transaction did not create a contract.");

console.log(`Registry: ${receipt.contractAddress}`);
console.log(`Block: ${receipt.blockNumber}`);
console.log("Add these to .env.local and your deployment environment:");
console.log(`VITE_CLAIMSEAL_REGISTRY_ADDRESS=${receipt.contractAddress}`);
console.log(`CLAIMSEAL_REGISTRY_ADDRESS=${receipt.contractAddress}`);
console.log(`CLAIMSEAL_DEPLOYMENT_BLOCK=${receipt.blockNumber}`);
console.log(`VITE_CLAIMSEAL_DEPLOYMENT_BLOCK=${receipt.blockNumber}`);
