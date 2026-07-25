import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyCampaign } from "@/lib/server/claimseal-verifier";

const requestSchema = z.object({
  url: z.string().trim().min(8).max(2048),
  claimContract: z.string().trim().optional(),
  campaignId: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  expectedIssuer: z.string().trim().optional(),
});

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/v1/verify-claim-manifest")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers }),
      GET: () =>
        Response.json(
          {
            name: "ClaimSeal Verify",
            tool: "verify_claim_manifest",
            method: "POST",
            input: {
              url: "https URL",
              claimContract: "optional EVM address",
              campaignId: "optional bytes32",
            },
          },
          { headers },
        ),
      POST: async ({ request }) => {
        try {
          const input = requestSchema.parse(await request.json());
          const result = await verifyCampaign(input);
          return Response.json(result, { headers });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to verify this campaign.";
          const status = /not configured|RPC|network|timeout/i.test(message) ? 503 : 400;
          return Response.json({ error: message }, { status, headers });
        }
      },
    },
  },
});
