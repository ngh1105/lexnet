import { buildSecurityStatus, jsonError, jsonOk } from "@/lib/platform/api";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  try {
    const store = await readPlatformStore();

    return jsonOk({
      security: buildSecurityStatus({
        NEXT_PUBLIC_GENLAYER_RPC_URL: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL,
        NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS,
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      }),
      summary: buildPlatformSummary(store),
    });
  } catch (error) {
    console.error("Unable to read platform security status", error);
    return jsonError("Unable to read platform security status.", 500);
  }
}
