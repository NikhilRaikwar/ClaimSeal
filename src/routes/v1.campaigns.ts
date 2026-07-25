import { createFileRoute } from "@tanstack/react-router";
import { listIssuerCampaigns } from "@/lib/server/claimseal-verifier";

const headers = {
  "access-control-allow-origin": "*",
  "content-type": "application/json; charset=utf-8",
};

export const Route = createFileRoute("/v1/campaigns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const issuer = new URL(request.url).searchParams.get("issuer");
        if (!issuer)
          return Response.json({ error: "issuer is required" }, { status: 400, headers });
        try {
          return Response.json({ campaigns: await listIssuerCampaigns(issuer) }, { headers });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to load issuer campaigns.";
          const status = /not configured|RPC|network|timeout/i.test(message) ? 503 : 400;
          return Response.json({ error: message }, { status, headers });
        }
      },
    },
  },
});
