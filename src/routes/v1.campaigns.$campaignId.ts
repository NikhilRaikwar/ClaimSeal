import { createFileRoute } from "@tanstack/react-router";
import { getCampaign } from "@/lib/server/claimseal-verifier";

const headers = {
  "access-control-allow-origin": "*",
  "content-type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/v1/campaigns/$campaignId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^0x[0-9a-fA-F]{64}$/.test(params.campaignId)) {
          return Response.json(
            { error: "campaignId must be a bytes32 hex value" },
            { status: 400, headers },
          );
        }
        try {
          const campaign = await getCampaign(params.campaignId as `0x${string}`);
          if (!campaign)
            return Response.json({ error: "Campaign not found" }, { status: 404, headers });
          return Response.json({ campaign }, { headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to load this campaign.";
          const status = /not configured|RPC|network|timeout/i.test(message) ? 503 : 400;
          return Response.json({ error: message }, { status, headers });
        }
      },
    },
  },
});
