# ClaimSeal X Layer Testnet deployment runbook

This is the final setup required to turn the built project into a public, live ClaimSeal ASP. The contract deployment wallet must be a **dedicated testnet-only wallet** with testnet OKB. Never send a mainnet key, seed phrase, or private key through chat or commit it to this repository.

## 1. Prepare the deployer

- Add X Layer Testnet to a browser wallet: chain ID `1952`, RPC `https://testrpc.xlayer.tech/terigon`, currency `OKB`.
- Fund the dedicated wallet with testnet OKB from the official X Layer testnet faucet.
- Compile the fixed registry artifact.

```powershell
npm run contract:compile
```

## 2. Deploy the ClaimSeal registry

Set the key only in the current PowerShell session, run the deployment, then close that terminal when finished.

```powershell
$env:DEPLOYER_PRIVATE_KEY = "0xYOUR_TESTNET_PRIVATE_KEY"
npm run contract:deploy:testnet
Remove-Item Env:DEPLOYER_PRIVATE_KEY
```

The script prints a registry contract address and the deployment block. Record those two values. Do not record or share the private key.

## 3. Configure the app

Create `.env.local` from `.env.example` and replace the placeholders with the output from step 2.

```dotenv
VITE_XLAYER_TESTNET_RPC_URL=https://testrpc.xlayer.tech/terigon
VITE_WALLETCONNECT_PROJECT_ID=YOUR_PUBLIC_WALLETCONNECT_PROJECT_ID
VITE_CLAIMSEAL_REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS
VITE_CLAIMSEAL_DEPLOYMENT_BLOCK=YOUR_DEPLOYMENT_BLOCK

XLAYER_TESTNET_RPC_URL=https://testrpc.xlayer.tech/terigon
CLAIMSEAL_REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS
CLAIMSEAL_DEPLOYMENT_BLOCK=YOUR_DEPLOYMENT_BLOCK
```

`VITE_` variables are intentionally public browser configuration. The server variables are needed for the A2MCP verification endpoint. Keep `.env.local` private; it is ignored by Git.

Create the WalletConnect project at [Reown WalletConnect Cloud](https://cloud.reown.com/) and copy its project ID into `VITE_WALLETCONNECT_PROJECT_ID`. This ID is a public browser identifier, not a secret. It enables the RainbowKit mobile/QR wallet option; browser-extension wallets are also supported.

## 4. Test the full user flow

```powershell
npm run dev
```

1. Open `/`, click **Connect issuer wallet**, complete the RainbowKit connection, and confirm the redirect to `/dashboard?issuer=YOUR_ADDRESS`.
2. Open `/publish`, then switch the connected testnet issuer wallet to X Layer Testnet.
3. Publish a campaign using a real HTTPS URL you control and a valid testnet contract address.
4. Wait for the transaction confirmation, then open the issuer dashboard.
5. Open the campaign's public verification link. It should return `MATCH` without connecting the verifier wallet.
6. Change one path segment or the contract in the verification link. It should return `MISMATCH`.
7. Verify a different HTTPS host. It should return `NOT PUBLISHED`.
8. From the issuer campaign page, revoke the record and re-run the verification. It should return `MISMATCH`.

## 5. Deploy the web app and verify the ASP endpoint

Deploy the TanStack Start app to a public HTTPS host that supports a Node server runtime. Set the same five non-secret environment variables in that host, rebuild, and use the deployed base URL below.

```powershell
$env:CLAIMSEAL_BASE_URL = "https://YOUR_PUBLIC_DOMAIN"
$env:CLAIMSEAL_DEMO_URL = "https://YOUR_OFFICIAL_CAMPAIGN_URL/path"
npm run api:smoke
```

The endpoint to list as the free A2MCP service is:

```text
POST https://YOUR_PUBLIC_DOMAIN/v1/verify-claim-manifest
Content-Type: application/json

{"url":"https://YOUR_OFFICIAL_CAMPAIGN_URL/path","claimContract":"0xOPTIONAL_CONTRACT"}
```

The free API returns HTTP 200 with `MATCH`, `MISMATCH`, or `NOT_PUBLISHED`. A deployment/RPC configuration failure returns HTTP 503, deliberately not a misleading verification result.

## 6. Build X submission handoff

1. Submit the live free `verify_claim_manifest` ASP to OKX.AI and wait for approval/listing.
2. Capture a 90-second X demo: paste official URL -> `MATCH`; change one character -> `MISMATCH`; show no verifier wallet request; show testnet registry link.
3. Post the demo on X with `#OKXAI` and a clear service description.
4. Submit the approved ASP URL and X post URL through the official Google Form before the deadline.

Use the more detailed checklist in [../CLAIMSEAL_BUILD_X_SUBMISSION.md](../CLAIMSEAL_BUILD_X_SUBMISSION.md).
