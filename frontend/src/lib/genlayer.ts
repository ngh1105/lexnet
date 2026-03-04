/**
 * LexNet Escrow — GenLayer JS Integration
 * Uses the genlayer-js SDK (`createClient`) to interact with the deployed LexNetEscrow contract.
 *
 * API reference (genlayer-js):
 *   createClient(config) → GenLayerClient
 *   client.readContract({ address, functionName, args? }) → Promise<CalldataEncodable>
 *   client.writeContract({ address, functionName, args?, value }) → Promise<`0x${string}`>
 *   client.waitForTransactionReceipt({ hash }) → Promise<GenLayerTransaction>
 */

import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { studionet } from "genlayer-js/chains";

// ─── Types ──────────────────────────────────────────────────────────────────

export type EscrowStatus =
    | "CREATED"
    | "FUNDED"
    | "WORK_SUBMITTED"
    | "AI_EVALUATING"
    | "RESOLVED";

export interface Escrow {
    id: string;
    client: string;
    freelancer: string;
    amount: string;
    fee_amount: string;
    requirements_text: string;
    submitted_work_url: string;
    status: EscrowStatus;
    resolved_at: string;
    impact_score: number;
    is_approved: boolean;
}

// ─── Mock Data (Development / Demo fallback) ─────────────────────────────────

export const MOCK_ESCROWS: Escrow[] = [
    {
        id: "0",
        client: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        freelancer: "0xdeadbeefcafe1234567890abcdefdeadbeefcafe",
        amount: "2500000000000000000",
        fee_amount: "62500000000000000",
        requirements_text:
            "Build a responsive landing page for LexNet with a hero section, features, pricing table, and contact form. Must be mobile-first and load in under 2 seconds.",
        submitted_work_url: "https://github.com/dev/lexnet-landing",
        status: "WORK_SUBMITTED",
        resolved_at: "0",
        impact_score: 0,
        is_approved: false,
    },
    {
        id: "1",
        client: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        freelancer: "0xabcdef1234567890abcdef1234567890abcdef12",
        amount: "1000000000000000000",
        fee_amount: "25000000000000000",
        requirements_text:
            "Design and implement a dark-mode dashboard UI with real-time analytics charts, using Next.js and shadcn/ui. Responsive for desktop and tablet.",
        submitted_work_url: "",
        status: "FUNDED",
        resolved_at: "0",
        impact_score: 0,
        is_approved: false,
    },
    {
        id: "2",
        client: "0xfeedface1234567890feedface1234567890feed",
        freelancer: "0x1234567890abcdef1234567890abcdef12345678",
        amount: "5000000000000000000",
        fee_amount: "125000000000000000",
        requirements_text:
            "Develop a REST API with Node.js and PostgreSQL for user authentication, JWT refresh tokens, and role-based access control. Full OpenAPI spec required.",
        submitted_work_url: "https://github.com/dev/auth-api",
        status: "RESOLVED",
        resolved_at: "42512",
        impact_score: 87,
        is_approved: true,
    },
    {
        id: "3",
        client: "0xbabe1234567890abcdefbabe1234567890abcdef",
        freelancer: "0x9876543210fedcba9876543210fedcba98765432",
        amount: "0",
        fee_amount: "0",
        requirements_text:
            "Create a Solidity smart contract for a simple NFT marketplace with minting, listing, and purchasing functionality. Must include full test coverage with Hardhat.",
        submitted_work_url: "",
        status: "CREATED",
        resolved_at: "0",
        impact_score: 0,
        is_approved: false,
    },
];

// ─── Client Factory ───────────────────────────────────────────────────────────

function getContractAddress(): string {
    if (typeof window === "undefined") return ""; // SSR guard
    const addr = process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS ?? "";
    if (!addr || addr === "0x0000000000000000000000000000000000000000") return "";
    return addr;
}

const CONTRACT_ADDRESS = getContractAddress();
const IS_DEMO_MODE = !CONTRACT_ADDRESS;

type LiveClient = ReturnType<typeof createClient>;

let _client: LiveClient | null = null;

async function getClient(): Promise<LiveClient> {
    if (_client) return _client;
    const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "https://studio.genlayer.com/api";

    _client = createClient({
        endpoint: rpcUrl,
        chain: studionet
    });

    // DONT call _client.connect() here because it forces Genlayer MetaMask Snap installation!
    return _client;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function callWrite(functionName: string, args: unknown[], account?: string): Promise<void> {
    const client = await getClient();
    if (!account) throw new Error("Wallet not connected");

    const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args: args as import("genlayer-js/types").CalldataEncodable[],
        value: 0n,
        // @ts-ignore
        account: { address: account as `0x${string}`, type: "json-rpc" } as any,
    });
    // Wait for finalization
    await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
        interval: 1000,
    });
}

async function callWriteWithValue(
    functionName: string,
    args: unknown[],
    value: bigint,
    account?: string
): Promise<void> {
    const client = await getClient();
    if (!account) throw new Error("Wallet not connected");

    const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args: args as import("genlayer-js/types").CalldataEncodable[],
        value,
        // @ts-ignore
        account: { address: account },
    });
    await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 120,
        interval: 1000,
    });
}

async function callRead(
    functionName: string,
    args: unknown[]
): Promise<unknown> {
    const client = await getClient();
    return client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args: args as import("genlayer-js/types").CalldataEncodable[],
    });
}

// ─── Contract Helpers ─────────────────────────────────────────────────────────

export async function createEscrow(
    freelancerAddress: string,
    requirementsText: string,
    userAddress?: string
): Promise<string> {
    if (IS_DEMO_MODE) {
        await simulateDelay(1200);
        const newId = String(MOCK_ESCROWS.length);
        MOCK_ESCROWS.push({
            id: newId,
            client: "0xdemo000000000000000000000000000000000000",
            freelancer: freelancerAddress,
            amount: "0",
            fee_amount: "0",
            requirements_text: requirementsText,
            submitted_work_url: "",
            status: "CREATED",
            resolved_at: "0",
            impact_score: 0,
            is_approved: false,
        });
        return newId;
    }
    await callWrite("create_escrow", [freelancerAddress, requirementsText], userAddress);
    return "created";
}

/**
 * Fund an existing escrow by locking the payment amount.
 */
export async function fundEscrow(
    escrowId: string,
    amountWei: number,
    userAddress?: string
): Promise<void> {
    if (IS_DEMO_MODE) {
        await simulateDelay(1500);
        const escrow = MOCK_ESCROWS.find((e) => e.id === escrowId);
        if (escrow) {
            escrow.amount = String(amountWei);
            escrow.fee_amount = String(Math.floor(amountWei * 0.025));
            escrow.status = "FUNDED";
        }
        return;
    }
    await callWrite("fund_escrow", [escrowId, amountWei], userAddress);
}

/**
 * Submit the freelancer's work URL.
 */
export async function submitWork(
    escrowId: string,
    workUrl: string,
    userAddress?: string
): Promise<void> {
    if (IS_DEMO_MODE) {
        await simulateDelay(1200);
        const escrow = MOCK_ESCROWS.find((e) => e.id === escrowId);
        if (escrow) {
            escrow.submitted_work_url = workUrl;
            escrow.status = "WORK_SUBMITTED";
        }
        return;
    }
    await callWrite("submit_work", [escrowId, workUrl], userAddress);
}

/**
 * Trigger the AI Judge to evaluate the submitted work.
 * This is the non-deterministic GenLayer call — it may take 30-90 seconds.
 */
export async function evaluateWork(escrowId: string, userAddress?: string): Promise<void> {
    if (IS_DEMO_MODE) {
        await simulateDelay(8000);
        const escrow = MOCK_ESCROWS.find((e) => e.id === escrowId);
        if (escrow) {
            escrow.status = "RESOLVED";
            escrow.impact_score = Math.floor(Math.random() * 40 + 55);
            escrow.is_approved = escrow.impact_score >= 60;
            escrow.resolved_at = "99999";
        }
        return;
    }
    await callWrite("evaluate_work", [escrowId], userAddress);
}

/**
 * Fetch a single escrow by ID. Returns parsed Escrow object or null.
 */
export async function getEscrow(escrowId: string): Promise<Escrow | null> {
    if (IS_DEMO_MODE) {
        await simulateDelay(300);
        return MOCK_ESCROWS.find((e) => e.id === escrowId) ?? null;
    }
    try {
        const raw = await callRead("get_escrow", [escrowId]);
        const rawStr = String(raw ?? "");
        if (!rawStr || rawStr.startsWith("Error:")) return null;
        return JSON.parse(rawStr) as Escrow;
    } catch {
        return null;
    }
}

/**
 * Fetch all escrows (demo: mock data; live: iterate IDs until not found).
 */
export async function getAllEscrows(): Promise<Escrow[]> {
    if (IS_DEMO_MODE) {
        await simulateDelay(400);
        return [...MOCK_ESCROWS];
    }
    const results: Escrow[] = [];
    let id = 0;
    while (id < 100) {
        const escrow = await getEscrow(String(id));
        if (!escrow) break;
        results.push(escrow);
        id++;
    }
    return results;
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

export function isDemoMode(): boolean {
    return IS_DEMO_MODE;
}

/** Format wei amount to human-readable ETH */
export function formatAmount(weiStr: string): string {
    if (!weiStr || weiStr === "0") return "0";
    const wei = BigInt(weiStr);
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
}

/** Truncate an Ethereum address for display */
export function truncateAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Simulate async delay for demo mode */
function simulateDelay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/** Order of statuses for timeline */
export const STATUS_ORDER: EscrowStatus[] = [
    "CREATED",
    "FUNDED",
    "WORK_SUBMITTED",
    "RESOLVED",
];

export function getStatusIndex(status: EscrowStatus): number {
    if (status === "AI_EVALUATING") return 3;
    return STATUS_ORDER.indexOf(status);
}
