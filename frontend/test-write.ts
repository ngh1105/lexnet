import { createClient } from "genlayer-js";

async function main() {
    const CONTRACT_ADDRESS = "0xe156F2b63f15666BFB9Be884f05267F6c1d86a33";
    const RPC_URL = "https://studio.genlayer.com/api";

    console.log("Initializing GenLayer client...");
    const client = createClient({ endpoint: RPC_URL });
    await client.connect();

    console.log("Attempting to writeContract (create_escrow)...");
    try {
        const txHash = await client.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: "create_escrow",
            args: ["0x1111222233334444555566667777888899990000", "Write a simple script"],
            value: 0n,
        });
        console.log("Transaction submitted, hash:", txHash);

        console.log("Waiting for receipt...");
        const receipt = await client.waitForTransactionReceipt({
            hash: txHash,
            status: "FINALIZED", // or "PENDING"
            retries: 30,
            interval: 1000,
        });
        console.log("Receipt:", receipt);
    } catch (error) {
        console.error("writeContract failed:", error);
    }
}

main().catch(console.error);
