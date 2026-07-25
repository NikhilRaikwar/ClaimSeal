const baseUrl = process.env.CLAIMSEAL_BASE_URL;
const url = process.env.CLAIMSEAL_DEMO_URL;

if (!baseUrl || !url) {
  throw new Error("Set CLAIMSEAL_BASE_URL and CLAIMSEAL_DEMO_URL before running this smoke test.");
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/verify-claim-manifest`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url }),
});
const body = await response.text();
console.log(`HTTP ${response.status}`);
console.log(body);
if (!response.ok) process.exit(1);
