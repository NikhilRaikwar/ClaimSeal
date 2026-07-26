import type { Address, Hex } from "viem";

export type Verdict = "match" | "mismatch" | "not_published";

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
  publishTransactionHash?: Hex;
};

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

export type VerifyResponse = {
  verdict: "MATCH" | "MISMATCH" | "NOT_PUBLISHED";
  summary: string;
  campaign?: CampaignSummary;
  checks: VerificationCheck[];
  limitations: string[];
};

type ApiError = { error?: string };

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(body.error ?? "ClaimSeal could not complete that request.");
  return body;
}

export function toUiVerdict(verdict: VerifyResponse["verdict"]): Verdict {
  return verdict.toLowerCase() as Verdict;
}

export function campaignUrl(campaign: CampaignSummary): string {
  return `https://${campaign.canonicalHost}${campaign.pathRule || "/"}`;
}

export async function verifyClaim(input: {
  url: string;
  claimContract?: string;
  campaignId?: Hex;
  expectedIssuer?: string;
}): Promise<VerifyResponse> {
  const response = await fetch("/v1/verify-claim-manifest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<VerifyResponse>(response);
}

export async function fetchIssuerCampaigns(issuer: string): Promise<CampaignSummary[]> {
  const response = await fetch(`/v1/campaigns?issuer=${encodeURIComponent(issuer)}`);
  const body = await jsonOrThrow<{ campaigns: CampaignSummary[] }>(response);
  return body.campaigns;
}

export async function fetchCampaign(campaignId: string): Promise<CampaignSummary | undefined> {
  const response = await fetch(`/v1/campaigns/${campaignId}`);
  if (response.status === 404) return undefined;
  const body = await jsonOrThrow<{ campaign: CampaignSummary }>(response);
  return body.campaign;
}
