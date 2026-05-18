/**
 * Seeds 4 realistic commerce cases into the LexNet contract on Studionet.
 *
 * Usage:
 *   1. Put a funded test private key in frontend/.env.local:
 *        LEXNET_SEEDER_PRIVATE_KEY=0x....   (DO NOT use a wallet with real funds)
 *   2. Optional override: LEXNET_SEEDER_CONTRACT_ADDRESS=0x...
 *      Otherwise NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS is used.
 *   3. From frontend/: npm run contract:seed
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const envFile = path.resolve(__dirname, "..", ".env.local");
if (existsSync(envFile)) {
  loadDotenv({ path: envFile });
}

const privateKey = (process.env.LEXNET_SEEDER_PRIVATE_KEY ?? "").trim();
if (!privateKey || !privateKey.startsWith("0x")) {
  console.error("LEXNET_SEEDER_PRIVATE_KEY must be set to a 0x-prefixed test private key in frontend/.env.local");
  process.exit(1);
}

const contractAddress = (
  process.env.LEXNET_SEEDER_CONTRACT_ADDRESS ??
  process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS ??
  ""
).trim();
if (!contractAddress.startsWith("0x")) {
  console.error("LEXNET_SEEDER_CONTRACT_ADDRESS or NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS must be set");
  process.exit(1);
}

interface SeedCase {
  title: string;
  seller: string;
  agreementText: string;
  acceptanceCriteria: string[];
  amountReference: number;
  evidenceUrls: string[];
  verifyAfterSubmit: boolean;
}

const seedCases: SeedCase[] = [
  {
    title: "Custom marketing landing page delivery",
    seller: "0x000000000000000000000000000000000000a001",
    agreementText:
      "Seller delivers a custom 3-page marketing landing site for buyer's Q2 product launch. Includes responsive layout, copy review, and 2 rounds of revisions. Final files delivered as a hosted preview URL plus archived source.",
    acceptanceCriteria: [
      "Hosted preview URL is reachable",
      "Pages render on mobile and desktop without layout breaks",
      "Source archive is provided",
    ],
    amountReference: 4500,
    evidenceUrls: [
      "https://en.wikipedia.org/wiki/Landing_page",
      "https://en.wikipedia.org/wiki/Responsive_web_design",
    ],
    verifyAfterSubmit: true,
  },
  {
    title: "Wholesale cold-press juice bottles, 1200 units",
    seller: "0x000000000000000000000000000000000000a002",
    agreementText:
      "Seller supplies 1200 cold-pressed orange juice bottles (350ml each) to buyer's distribution center. Delivery within 7 business days. Cold-chain handling required. Invoice payable on shelf-stock confirmation.",
    acceptanceCriteria: [
      "Delivery manifest signed by buyer's receiving team",
      "Bottle count matches invoice",
      "Cold-chain log shows storage at or below 4 degrees Celsius end-to-end",
    ],
    amountReference: 9800,
    evidenceUrls: [
      "https://en.wikipedia.org/wiki/Cold_chain",
    ],
    verifyAfterSubmit: false,
  },
  {
    title: "Quarterly compliance audit report",
    seller: "0x000000000000000000000000000000000000a003",
    agreementText:
      "Seller produces a Q1 SOC 2 readiness audit covering buyer's payments service. Deliverable: a formal PDF report plus a remediation backlog ranked by severity. Confidentiality NDA in force throughout the engagement.",
    acceptanceCriteria: [
      "PDF report references the agreed scope sections",
      "Remediation items include severity rating and owner",
      "Findings cite controls under review",
    ],
    amountReference: 14000,
    evidenceUrls: [
      "https://en.wikipedia.org/wiki/SOC_2",
    ],
    verifyAfterSubmit: false,
  },
  {
    title: "Industrial 3D-printed cooling brackets, 80 units",
    seller: "0x000000000000000000000000000000000000a004",
    agreementText:
      "Seller manufactures 80 SLS-printed PA12 cooling brackets per buyer's CAD spec, including post-processing and dimensional inspection. Tolerances must hold within plus or minus 0.2 mm. Shipping covered.",
    acceptanceCriteria: [
      "Inspection report shows tolerance compliance for sample of 8 units",
      "Quantity received matches purchase order",
      "Material certificate provided",
    ],
    amountReference: 6200,
    evidenceUrls: [
      "https://en.wikipedia.org/wiki/Selective_laser_sintering",
    ],
    verifyAfterSubmit: false,
  },
];

async function main() {
  console.log("Loading genlayer-js SDK...");
  const sdk = (await import("genlayer-js")) as unknown as {
    createClient: (config: unknown) => any;
    createAccount: (key: `0x${string}`) => any;
    chains: { studionet: unknown };
  };
  const sdkChains = (await import("genlayer-js/chains")) as unknown as { studionet: unknown };
  const studionet = sdkChains.studionet;

  const account = sdk.createAccount(privateKey as `0x${string}`);
  console.log(`Seeder address: ${account.address}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Cases to seed: ${seedCases.length}`);
  console.log("");

  const client = sdk.createClient({
    chain: studionet,
    account,
  });

  for (let i = 0; i < seedCases.length; i++) {
    const seed = seedCases[i];
    console.log(`[${i + 1}/${seedCases.length}] create_case: "${seed.title}"`);

    let createTx: any;
    try {
      createTx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: "create_case",
        args: [
          seed.title,
          seed.seller,
          seed.agreementText,
          JSON.stringify(seed.acceptanceCriteria),
          BigInt(seed.amountReference),
        ],
        value: 0n,
      });
    } catch (error) {
      console.error(`  ! create_case failed: ${(error as Error).message}`);
      continue;
    }

    const txHash =
      typeof createTx === "string"
        ? createTx
        : typeof createTx === "object" && createTx
          ? ((createTx as Record<string, unknown>).transactionHash as string | undefined) ??
            ((createTx as Record<string, unknown>).hash as string | undefined) ??
            JSON.stringify(createTx)
          : String(createTx);
    console.log(`  tx: ${txHash}`);

    if (!seed.evidenceUrls.length) {
      continue;
    }

    console.log("  Note: submit_evidence requires the seller account to sign — skipping.");
    console.log("        Use the LexNet UI as the seller wallet to submit evidence + verify.");
  }

  console.log("");
  console.log("Done. Visit the contract on Studionet or the LexNet dashboard to confirm cases.");
  console.log(`Read state: https://studio.genlayer.com/contracts/${contractAddress}`);
}

main().catch((error) => {
  console.error("contract-seed failed:", error);
  process.exit(1);
});
