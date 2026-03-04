"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Scales, User, FileText } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { createEscrow } from "@/lib/genlayer";
import { useAccount } from "wagmi";

interface CreateEscrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (id: string) => void;
}

export default function CreateEscrowModal({
    isOpen,
    onClose,
    onCreated,
}: CreateEscrowModalProps) {
    const router = useRouter();
    const { address } = useAccount();
    const [freelancer, setFreelancer] = useState("");
    const [requirements, setRequirements] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleCreate() {
        if (!freelancer.trim() || !requirements.trim()) {
            setError("Both fields are required.");
            return;
        }
        if (!address) {
            setError("Please connect your wallet first via the Sidebar.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const id = await createEscrow(freelancer.trim(), requirements.trim(), address);
            onCreated(id);
            setFreelancer("");
            setRequirements("");
            onClose();
            router.push(`/escrow/${id}`);
        } catch (err: any) {
            console.error(err);
            setError(`Failed to create escrow. Error: ${err?.message || String(err)}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="glass-card"
                        initial={{ scale: 0.9, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 24 }}
                        transition={{ type: "spring", damping: 24, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "100%", maxWidth: 520, padding: 32 }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 24,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "linear-gradient(135deg, #3B82F6, #10B981)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                                    }}
                                >
                                    <Scales size={18} weight="duotone" color="#fff" />
                                </div>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 700,
                                            color: "#E2E8F0",
                                            letterSpacing: "-0.3px",
                                        }}
                                    >
                                        New Escrow
                                    </h2>
                                    <p style={{ fontSize: 11, color: "#475569" }}>
                                        Register a new AI-arbitrated agreement
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    background: "transparent",
                                    border: "1px solid rgba(71,85,105,0.4)",
                                    borderRadius: 8,
                                    padding: "6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#64748B",
                                    transition: "border-color 0.15s, color 0.15s",
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Fields */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#94A3B8",
                                        marginBottom: 8,
                                    }}
                                >
                                    <User size={13} />
                                    Freelancer Address
                                </label>
                                <input
                                    className="lexnet-input"
                                    type="text"
                                    placeholder="0x..."
                                    value={freelancer}
                                    onChange={(e) => setFreelancer(e.target.value)}
                                    style={{ fontFamily: "monospace" }}
                                />
                                <p style={{ fontSize: 11, color: "#334155", marginTop: 5 }}>
                                    The Ethereum address of the person who will perform the work.
                                </p>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#94A3B8",
                                        marginBottom: 8,
                                    }}
                                >
                                    <FileText size={13} />
                                    Requirements / Deliverables
                                </label>
                                <textarea
                                    className="lexnet-input"
                                    rows={5}
                                    placeholder="Describe the work to be done in detail. The AI judge will use this to evaluate the deliverable. Be specific about expected outputs, quality standards, and acceptance criteria."
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                    style={{ resize: "vertical", minHeight: 120 }}
                                />
                                <p style={{ fontSize: 11, color: "#334155", marginTop: 5 }}>
                                    Be specific — the AI evaluates the work against exactly this text.
                                </p>
                            </div>

                            {error && (
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "#FCA5A5",
                                        padding: "8px 12px",
                                        borderRadius: 8,
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                                <button
                                    className="btn-ghost"
                                    onClick={onClose}
                                    style={{ flex: 1 }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleCreate}
                                    disabled={
                                        loading || !freelancer.trim() || !requirements.trim()
                                    }
                                    style={{ flex: 2 }}
                                >
                                    {loading ? "Creating…" : "Create Escrow →"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
