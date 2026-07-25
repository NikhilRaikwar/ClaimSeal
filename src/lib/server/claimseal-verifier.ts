import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbiItem,
  stringToHex,
  verifyTypedData,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { claimSealRegistryAbi } from "../claimseal-registry";
import {
  campaignIsActive,
  manifestHash,
  normalizeVerificationUrl,
  parseManifest,
  typedDataForManifest,
  type ClaimManifest,
} from "../claimseal-protocol";
import {
  DEFAULT_XLAYER_TESTNET_RPC,
  XLAYER_TESTNET_CHAIN_ID,
  XLAYER_TESTNET_EXPLORER,
} from "../xlayer";

const publishedEvent = parseAbiItem(
  "event ManifestPublished(bytes32 indexed campaignId, address indexed issuer, bytes32 manifestHash, uint64 validFrom, uint64 validUntil, uint64 revision)",
);

export type VerificationVerdict = "MATCH" | "MISMATCH" | "NOT_PUBLISHED";

export type VerificationCheck = {
  field: "host" | "path" | "claimContract" | "issuerSignature" | "registryAnchor" | "validity";
  status:
    | "match"
    | "mismatch"
    | "valid"
    | "invalid"
    | "active"
    | "inactive"
    | "not_supplied"
    | "not_found";
  expected?: string;
  actual?: string;
};

export type CampaignSummary = {
  campaignId: Hex;
  name: string;
  issuer: Address;
  canonicalHost: string;
  pathRule: string;
  claimContract: Address;
  validFrom: string;
  validUntil: string;
  revision: number;
  status: "active" | "revoked" | "expired" | "scheduled";
  registryAddress: Address;
};

export type VerifyResponse = {
  verdict: VerificationVerdict;
  summary: string;
  campaign?: CampaignSummary;
  checks: VerificationCheck[];
  limitations: string[];
};

type RegistryConfig = {
  address: Address;
  rpcUrl: string;
  deploymentBlock: bigint;
};

type OnchainRecord = {
  campaignId: Hex;
  issuer: Address;
  manifestHash: Hex;
  validFrom: bigint;
  validUntil: bigint;
  revision: bigint;
  revoked: boolean;
  manifest: ClaimManifest;
};

const limitation =
  "This verifies a wallet-signed campaign record. It does not audit a website or smart contract, or guarantee that a campaign is safe.";

export function readRegistryConfig(): RegistryConfig {
  const address = process.env.CLAIMSEAL_REGISTRY_ADDRESS;
  const deploymentBlock = process.env.CLAIMSEAL_DEPLOYMENT_BLOCK;
  const rpcUrl = process.env.XLAYER_TESTNET_RPC_URL ?? DEFAULT_XLAYER_TESTNET_RPC;

  if (!address || !isAddress(address) || /^0x0{40}$/i.test(address)) {
    throw new Error("ClaimSeal registry is not configured on this server.");
  }
  if (!deploymentBlock || !/^\d+$/.test(deploymentBlock) || BigInt(deploymentBlock) <= 0n) {
    throw new Error("ClaimSeal deployment block is not configured on this server.");
  }

  return { address: getAddress(address), rpcUrl, deploymentBlock: BigInt(deploymentBlock) };
}

function getClient(config: RegistryConfig) {
  return createPublicClient({ transport: http(config.rpcUrl) });
}

async function readRecord(
  config: RegistryConfig,
  campaignId: Hex,
): Promise<OnchainRecord | undefined> {
  const client = getClient(config);
  const result = await client.readContract({
    address: config.address,
    abi: claimSealRegistryAbi,
    functionName: "getCampaign",
    args: [campaignId],
  });
  const [issuer, anchoredHash, validFrom, validUntil, revision, revoked] = result;
  if (issuer.toLowerCase() === zeroAddress) return undefined;

  const rawManifest = await client.readContract({
    address: config.address,
    abi: claimSealRegistryAbi,
    functionName: "getManifest",
    args: [campaignId],
  });
  const manifest = parseManifest(JSON.parse(rawManifest));

  return {
    campaignId,
    issuer: getAddress(issuer),
    manifestHash: anchoredHash,
    validFrom,
    validUntil,
    revision,
    revoked,
    manifest,
  };
}

async function campaignIdsFromEvents(config: RegistryConfig, issuer?: Address): Promise<Hex[]> {
  const client = getClient(config);
  const logs = await client.getLogs({
    address: config.address,
    event: publishedEvent,
    args: issuer ? { issuer } : undefined,
    fromBlock: config.deploymentBlock,
    toBlock: "latest",
  });
  return [
    ...new Set(logs.map((log) => log.args.campaignId).filter((id): id is Hex => Boolean(id))),
  ];
}

async function candidatesForRequest(
  config: RegistryConfig,
  campaignId?: Hex,
  expectedIssuer?: Address,
): Promise<OnchainRecord[]> {
  const ids = campaignId ? [campaignId] : await campaignIdsFromEvents(config, expectedIssuer);
  const records = await Promise.all(
    ids.map(async (id) => {
      try {
        return await readRecord(config, id);
      } catch {
        return undefined;
      }
    }),
  );
  return records.filter((record): record is OnchainRecord => Boolean(record));
}

function statusFor(record: OnchainRecord) {
  const now = Math.floor(Date.now() / 1000);
  if (record.revoked) return "revoked" as const;
  if (Number(record.validUntil) < now) return "expired" as const;
  if (Number(record.validFrom) > now) return "scheduled" as const;
  return "active" as const;
}

function asSummary(record: OnchainRecord, registryAddress: Address): CampaignSummary {
  return {
    campaignId: record.campaignId,
    name: record.manifest.name,
    issuer: record.issuer,
    canonicalHost: record.manifest.canonicalHost,
    pathRule: record.manifest.pathRule,
    claimContract: record.manifest.claimContract,
    validFrom: new Date(Number(record.validFrom) * 1000).toISOString(),
    validUntil: new Date(Number(record.validUntil) * 1000).toISOString(),
    revision: Number(record.revision),
    status: statusFor(record),
    registryAddress,
  };
}

async function signatureIsValid(record: OnchainRecord, config: RegistryConfig) {
  if (record.manifest.issuer.toLowerCase() !== record.issuer.toLowerCase()) return false;
  if (record.manifest.campaignId.toLowerCase() !== record.campaignId.toLowerCase()) return false;
  if (record.manifest.revision !== Number(record.revision)) return false;
  if (record.manifest.validFrom !== Number(record.validFrom)) return false;
  if (record.manifest.validUntil !== Number(record.validUntil)) return false;
  if (manifestHash(record.manifest).toLowerCase() !== record.manifestHash.toLowerCase())
    return false;

  return verifyTypedData({
    address: record.issuer,
    ...typedDataForManifest(record.manifest, config.address),
    signature: record.manifest.signature,
  });
}

function checkRow(
  field: VerificationCheck["field"],
  expected: string,
  actual: string,
  valid: boolean,
): VerificationCheck {
  return { field, expected, actual, status: valid ? "match" : "mismatch" };
}

export async function verifyCampaign(input: {
  url: string;
  claimContract?: string;
  campaignId?: Hex;
  expectedIssuer?: string;
}): Promise<VerifyResponse> {
  const config = readRegistryConfig();
  const checked = normalizeVerificationUrl(input.url);
  if (input.claimContract && !isAddress(input.claimContract)) {
    throw new Error("claimContract must be a valid EVM address when supplied.");
  }
  if (input.expectedIssuer && !isAddress(input.expectedIssuer)) {
    throw new Error("expectedIssuer must be a valid EVM address when supplied.");
  }
  const suppliedContract = input.claimContract ? getAddress(input.claimContract) : undefined;
  const expectedIssuer = input.expectedIssuer ? getAddress(input.expectedIssuer) : undefined;
  const records = await candidatesForRequest(config, input.campaignId, expectedIssuer);

  const record =
    records.find(
      (candidate) =>
        candidate.manifest.canonicalHost === checked.canonicalHost &&
        (!candidate.manifest.pathRule || candidate.manifest.pathRule === checked.path),
    ) ??
    records.find((candidate) => candidate.manifest.canonicalHost === checked.canonicalHost) ??
    (input.campaignId ? records[0] : undefined);

  if (!record) {
    return {
      verdict: "NOT_PUBLISHED",
      summary: "No active issuer-signed record was found for this campaign URL.",
      checks: [
        { field: "host", actual: checked.canonicalHost, status: "not_found" },
        { field: "registryAnchor", actual: "no matching record", status: "not_found" },
      ],
      limitations: [limitation],
    };
  }

  const signatureValid = await signatureIsValid(record, config);
  const current = campaignIsActive(record.manifest, record.revoked);
  const hostMatches = checked.canonicalHost === record.manifest.canonicalHost;
  const pathMatches = !record.manifest.pathRule || checked.path === record.manifest.pathRule;
  const contractMatches =
    !suppliedContract ||
    suppliedContract.toLowerCase() === record.manifest.claimContract.toLowerCase();
  const checks: VerificationCheck[] = [
    checkRow("host", record.manifest.canonicalHost, checked.canonicalHost, hostMatches),
    checkRow("path", record.manifest.pathRule || "any path", checked.path, pathMatches),
    suppliedContract
      ? checkRow("claimContract", record.manifest.claimContract, suppliedContract, contractMatches)
      : { field: "claimContract", expected: record.manifest.claimContract, status: "not_supplied" },
    {
      field: "issuerSignature",
      expected: record.issuer,
      actual: signatureValid ? "valid EIP-712 signature" : "invalid EIP-712 signature",
      status: signatureValid ? "valid" : "invalid",
    },
    {
      field: "registryAnchor",
      expected: config.address,
      actual: record.revoked ? "revoked" : "active",
      status: record.revoked ? "inactive" : "active",
    },
    {
      field: "validity",
      expected: `${new Date(Number(record.validFrom) * 1000).toISOString()} → ${new Date(Number(record.validUntil) * 1000).toISOString()}`,
      actual: current ? "active now" : "inactive now",
      status: current ? "active" : "inactive",
    },
  ];

  const matches = hostMatches && pathMatches && contractMatches && signatureValid && current;
  return {
    verdict: matches ? "MATCH" : "MISMATCH",
    summary: matches
      ? "URL and supplied fields match the active issuer-signed record."
      : "This does not match the campaign's active issuer-signed record.",
    campaign: asSummary(record, config.address),
    checks,
    limitations: [limitation],
  };
}

export async function listIssuerCampaigns(issuer: string): Promise<CampaignSummary[]> {
  const config = readRegistryConfig();
  if (!isAddress(issuer)) throw new Error("Enter a valid issuer address.");
  const records = await candidatesForRequest(config, undefined, getAddress(issuer));
  const verified = await Promise.all(
    records.map(async (record) => ((await signatureIsValid(record, config)) ? record : undefined)),
  );
  return verified
    .filter((record): record is OnchainRecord => Boolean(record))
    .map((record) => asSummary(record, config.address))
    .sort((a, b) => b.validUntil.localeCompare(a.validUntil));
}

export async function getCampaign(campaignId: Hex): Promise<CampaignSummary | undefined> {
  const config = readRegistryConfig();
  const record = await readRecord(config, campaignId);
  if (!record || !(await signatureIsValid(record, config))) return undefined;
  return asSummary(record, config.address);
}

export function registryExplorerUrl(registryAddress: Address) {
  return `${XLAYER_TESTNET_EXPLORER}/address/${registryAddress}`;
}

export const networkMetadata = {
  chainId: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
};
