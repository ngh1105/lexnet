"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CurrencyDollar,
    Link as LinkIcon,
    Gavel,
    Check,
    Warning,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import type { Escrow } from "@/lib/genlayer";
import {
    fundEscrow,
    submitWork,
    evaluateWork,
    formatAmount,
} from "@/lib/genlayer";
import AIJudgeLoader from "./AIJudgeLoader";

import { useAccount } from "wagmi";

interface ActionPanelProps {
    escrow: Escrow;
    onRefresh: () => void;
}

type ActionResult = { type: "success" | "error"; message: string } | null;

export default function ActionPanel({ escrow, onRefresh }: ActionPanelProps) {
    const router = useRouter();
    const { address } = useAccount();
    const [loading, setLoading] = useState(false);
    const [showAILoader, setShowAILoader] = useState(false);
    const [result, setResult] = useState<ActionResult>(null);

    // Fund escrow state
    const [fundAmount, setFundAmount] = useState("");

    // Submit work state
    const [workUrl, setWorkUrl] = useState("");

    async function handleFund() {
        if (!fundAmount || Number(fundAmount) <= 0) return;
        if (!address) {
            setResult({ type: "error", message: "Connect wallet to fund escrow" });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const weiAmount = Math.floor(Number(fundAmount) * 1e18);
            await fundEscrow(escrow.id, weiAmount, address);
            setResult({ type: "success", message: "Escrow funded successfully! The freelancer may now start work." });
            setFundAmount("");
            setTimeout(onRefresh, 1500);
        } catch (err: any) {
            console.error(err);
            setResult({ type: "error", message: `Failed to fund escrow: ${err?.message || "Unknown error"}` });
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmitWork() {
        if (!workUrl.trim()) return;
        if (!address) {
            setResult({ type: "error", message: "Connect wallet to submit work" });
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            await submitWork(escrow.id, workUrl.trim(), address);
            setResult({ type: "success", message: "Work submitted! The client can now trigger AI evaluation." });
            setWorkUrl("");
            setTimeout(onRefresh, 1500);
        } catch (err: any) {
            console.error(err);
            setResult({ type: "error", message: `Failed to submit work: ${err?.message || "Unknown error"}` });
        } finally {
            setLoading(false);
        }
    }

    async function handleEvaluate() {
        if (!address) {
            setResult({ type: "error", message: "Connect wallet to trigger AI evaluate" });
            return;
        }
        setShowAILoader(true);
        setResult(null);
        try {
            await evaluateWork(escrow.id, address);
            setShowAILoader(false);
            setResult({ type: "success", message: "AI evaluation complete! The verdict has been recorded on-chain." });
            setTimeout(onRefresh, 2000);
        } catch (err: any) {
            console.error(err);
            setShowAILoader(false);
            setResult({ type: "error", message: `Evaluation failed: ${err?.message || "Consensus wait error"}` });
        }
    }

    if (escrow.status === "RESOLVED") {
        return (
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Resolution
                </h3>
                <div style={{
                    borderRadius: 12,
                    padding: 20,
                    background: escrow.is_approved
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(239,68,68,0.08)",
                    border: `1px solid ${escrow.is_approved ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                    textAlign: "center",
                }}>
                    <div style={{
                        fontSize: 32,
                        fontWeight: 800,
                        marginBottom: 6,
                        color: escrow.is_approved ? "#34D399" : "#FCA5A5",
                    }}>
                        {escrow.is_approved ? "✓ Approved" : "✗ Rejected"}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}>
                        AI Impact Score:{" "}
                        <span style={{ fontWeight: 700, fontSize: 15, color: escrow.is_approved ? "#34D399" : "#FCA5A5" }}>
                            {escrow.impact_score}/100
                        </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                        {escrow.is_approved
                            ? `${formatAmount(escrow.amount)} ETH disbursed to freelancer`
                            : `${formatAmount(escrow.amount)} ETH refunded to client`}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <AIJudgeLoader isVisible={showAILoader} />

            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Actions
                </h3>

                {/* CREATED: Fund Escrow */}
                {escrow.status === "CREATED" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 4 }}>
                            Lock the payment into the contract. The freelancer will be able to begin work once funded.
                        </p>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
                            Amount (ETH)
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{ position: "relative", flex: 1 }}>
                                <CurrencyDollar
                                    size={15}
                                    color="#3B82F6"
                                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                                />
                                <input
                                    className="lexnet-input"
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    placeholder="e.g. 1.5"
                                    value={fundAmount}
                                    onChange={(e) => setFundAmount(e.target.value)}
                                    style={{ paddingLeft: 34 }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleFund}
                            disabled={loading || !fundAmount || Number(fundAmount) <= 0}
                            style={{ width: "100%" }}
                        >
                            {loading ? "Funding…" : "Fund Escrow"}
                        </button>
                    </div>
                )}

                {/* FUNDED: Submit Work */}
                {escrow.status === "FUNDED" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 4 }}>
                            Submit the URL to your completed deliverable (GitHub repo, deployed site, Figma link, etc.)
                        </p>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
                            Deliverable URL
                        </label>
                        <div style={{ position: "relative" }}>
                            <LinkIcon
                                size={15}
                                color="#3B82F6"
                                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                            />
                            <input
                                className="lexnet-input"
                                type="url"
                                placeholder="https://github.com/you/project"
                                value={workUrl}
                                onChange={(e) => setWorkUrl(e.target.value)}
                                style={{ paddingLeft: 34 }}
                            />
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleSubmitWork}
                            disabled={loading || !workUrl.trim()}
                            style={{ width: "100%" }}
                        >
                            {loading ? "Submitting…" : "Submit Work"}
                        </button>
                    </div>
                )}

                {/* WORK_SUBMITTED: Trigger AI Judge */}
                {escrow.status === "WORK_SUBMITTED" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{
                            padding: "12px 16px",
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.07)",
                            border: "1px solid rgba(59,130,246,0.2)",
                            fontSize: 12,
                            color: "#93C5FD",
                            lineHeight: 1.6,
                        }}>
                            <strong>Ready for AI evaluation.</strong> The GenLayer AI will fetch the submitted work, evaluate it against the requirements, and reach decentralized consensus across multiple validators.
                        </div>
                        <motion.button
                            className="btn-emerald"
                            onClick={handleEvaluate}
                            disabled={loading}
                            style={{ width: "100%", padding: "14px 20px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Gavel size={20} weight="duotone" />
                            Trigger AI Judge
                        </motion.button>
                        <p style={{ fontSize: 11, color: "#334155", textAlign: "center", lineHeight: 1.5 }}>
                            Any party can trigger evaluation. The AI verdict is final once consensus is reached.
                        </p>
                    </div>
                )}

                {/* AI_EVALUATING: in progress */}
                {escrow.status === "AI_EVALUATING" && (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: 13, color: "#A78BFA", fontWeight: 500, marginBottom: 8 }}>
                            AI Evaluation in Progress…
                        </div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                            Validators are reaching consensus. Please wait.
                        </div>
                    </div>
                )}

                {/* Result notification */}
                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                marginTop: 14,
                                padding: "10px 14px",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                background: result.type === "success"
                                    ? "rgba(16,185,129,0.1)"
                                    : "rgba(239,68,68,0.1)",
                                border: `1px solid ${result.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                            }}
                        >
                            {result.type === "success"
                                ? <Check size={14} weight="bold" color="#34D399" style={{ flexShrink: 0, marginTop: 1 }} />
                                : <Warning size={14} weight="fill" color="#FCA5A5" style={{ flexShrink: 0, marginTop: 1 }} />
                            }
                            <span style={{ fontSize: 12, color: result.type === "success" ? "#34D399" : "#FCA5A5", lineHeight: 1.5 }}>
                                {result.message}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
