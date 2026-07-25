import {
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { z } from "zod";

export const CLAIMSEAL_SCHEMA_VERSION = "1";
export const CLAIMSEAL_TYPED_DATA_NAME = "ClaimSeal";
export const CLAIMSEAL_TYPED_DATA_VERSION = "1";

const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const selector = z.string().regex(/^0x[0-9a-fA-F]{8}$/);

const manifestSchema = z.object({
  schemaVersion: z.literal(CLAIMSEAL_SCHEMA_VERSION),
  campaignId: bytes32,
  revision: z.number().int().positive(),
  issuer: z.string().refine(isAddress, "Issuer must be an EVM address."),
  name: z.string().trim().min(3).max(80),
  canonicalHost: z.string().trim().min(3).max(253),
  pathRule: z.string().max(512),
  xHandle: z.string().trim().max(64).optional(),
  chainId: z.literal(1952),
  claimContract: z.string().refine(isAddress, "Claim contract must be an EVM address."),
  allowedSelectors: z.array(selector).max(8),
  validFrom: z.number().int().nonnegative(),
  validUntil: z.number().int().positive(),
  termsHash: bytes32.default(zeroHash),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
});

export type ClaimManifest = Omit<
  z.infer<typeof manifestSchema>,
  "issuer" | "campaignId" | "termsHash" | "signature"
> & {
  issuer: Address;
  campaignId: Hex;
  termsHash: Hex;
  signature: Hex;
};

export type UnsignedClaimManifest = Omit<ClaimManifest, "signature">;

export const claimManifestTypes = {
  ClaimManifest: [
    { name: "campaignId", type: "bytes32" },
    { name: "revision", type: "uint64" },
    { name: "canonicalHost", type: "string" },
    { name: "pathRuleHash", type: "bytes32" },
    { name: "chainId", type: "uint256" },
    { name: "claimContract", type: "address" },
    { name: "allowedSelectorsHash", type: "bytes32" },
    { name: "validFrom", type: "uint64" },
    { name: "validUntil", type: "uint64" },
    { name: "termsHash", type: "bytes32" },
  ],
} as const;

export function parseManifest(input: unknown): ClaimManifest {
  const parsed = manifestSchema.parse(input);
  if (parsed.validUntil <= parsed.validFrom) {
    throw new Error("The campaign validity window is invalid.");
  }
  return {
    ...parsed,
    issuer: getAddress(parsed.issuer),
    campaignId: parsed.campaignId as Hex,
    termsHash: parsed.termsHash as Hex,
    signature: parsed.signature as Hex,
  };
}

export function normalizeHost(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.includes("://") || trimmed.includes("/") || trimmed.includes("@")) {
    throw new Error("Enter a hostname only, for example claim.example.com.");
  }
  const probe = new URL(`https://${trimmed}`);
  if (probe.hostname !== trimmed || !probe.hostname.includes(".")) {
    throw new Error("Enter a valid public hostname.");
  }
  return probe.hostname;
}

export function normalizePathRule(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("/") || trimmed.includes("//") || trimmed.includes("?")) {
    throw new Error("The optional path must begin with one slash and contain no query string.");
  }
  return trimmed === "/" ? "/" : trimmed.replace(/\/+$/, "");
}

export function normalizeVerificationUrl(input: string): {
  canonicalHost: string;
  path: string;
  origin: string;
} {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a complete HTTPS URL.");
  }
  if (url.protocol !== "https:") throw new Error("ClaimSeal only verifies HTTPS URLs.");
  if (url.username || url.password)
    throw new Error("URLs containing login credentials are not allowed.");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.includes(":")) {
    throw new Error("Use a public hostname, not an IP address.");
  }
  const canonicalHost = normalizeHost(url.hostname);
  const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  return { canonicalHost, path, origin: `https://${canonicalHost}${path}` };
}

export function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    // Match JSON.stringify semantics: optional fields that have no value are
    // omitted instead of becoming the invalid token `undefined` on-chain.
    return `{${Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function manifestJson(manifest: ClaimManifest): string {
  return canonicalStringify(manifest);
}

export function manifestHash(manifest: ClaimManifest): Hex {
  return keccak256(stringToHex(manifestJson(manifest)));
}

export function hashText(value: string): Hex {
  return keccak256(stringToHex(value));
}

export function createCampaignId(
  issuer: Address,
  canonicalHost: string,
  claimContract: Address,
  nonce: string,
): Hex {
  return keccak256(
    stringToHex(
      [
        "claimseal",
        issuer.toLowerCase(),
        canonicalHost.toLowerCase(),
        claimContract.toLowerCase(),
        nonce,
      ].join(":"),
    ),
  );
}

export function typedDataForManifest(manifest: UnsignedClaimManifest, verifyingContract: Address) {
  return {
    domain: {
      name: CLAIMSEAL_TYPED_DATA_NAME,
      version: CLAIMSEAL_TYPED_DATA_VERSION,
      chainId: 1952,
      verifyingContract,
    },
    types: claimManifestTypes,
    primaryType: "ClaimManifest" as const,
    message: {
      campaignId: manifest.campaignId,
      revision: BigInt(manifest.revision),
      canonicalHost: manifest.canonicalHost,
      pathRuleHash: hashText(manifest.pathRule),
      chainId: BigInt(manifest.chainId),
      claimContract: manifest.claimContract,
      allowedSelectorsHash: hashText(manifest.allowedSelectors.join(",")),
      validFrom: BigInt(manifest.validFrom),
      validUntil: BigInt(manifest.validUntil),
      termsHash: manifest.termsHash,
    },
  };
}

export function createUnsignedManifest(input: {
  issuer: Address;
  name: string;
  canonicalHost: string;
  pathRule: string;
  xHandle?: string;
  claimContract: Address;
  allowedSelectors?: Hex[];
  validFrom: number;
  validUntil: number;
  nonce: string;
  revision?: number;
}): UnsignedClaimManifest {
  const canonicalHost = normalizeHost(input.canonicalHost);
  const pathRule = normalizePathRule(input.pathRule);
  const issuer = getAddress(input.issuer);
  const claimContract = getAddress(input.claimContract);
  const name = input.name.trim();
  const revision = input.revision ?? 1;
  if (name.length < 3 || name.length > 80) {
    throw new Error("Campaign name must be between 3 and 80 characters.");
  }
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error("Manifest revision must be a positive integer.");
  }
  if (input.validUntil <= input.validFrom)
    throw new Error("Choose an end date after the start date.");
  return {
    schemaVersion: CLAIMSEAL_SCHEMA_VERSION,
    campaignId: createCampaignId(issuer, canonicalHost, claimContract, input.nonce),
    revision,
    issuer,
    name,
    canonicalHost,
    pathRule,
    xHandle: input.xHandle?.trim() || undefined,
    chainId: 1952,
    claimContract,
    allowedSelectors: input.allowedSelectors ?? [],
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    termsHash: zeroHash,
  };
}

export function campaignIsActive(
  manifest: ClaimManifest,
  revoked: boolean,
  now = Math.floor(Date.now() / 1000),
) {
  return !revoked && manifest.validFrom <= now && now <= manifest.validUntil;
}

export function formatAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
