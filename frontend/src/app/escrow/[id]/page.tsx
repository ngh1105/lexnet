"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Globe,
    CurrencyDollar,
    User,
    Calendar,
    FileText,
    Copy,
    CheckCircle,
    ArrowsClockwise,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import StatusTimeline from "@/components/StatusTimeline";
import ActionPanel from "@/components/ActionPanel";
import { getEscrow, formatAmount, truncateAddress, type Escrow } from "@/lib/genlayer";

export default function EscrowDetailPage() {
    const params = useParams();
    const router = useRouter();
    const escrowId = String(params?.id ?? "");

    const [escrow, setEscrow] = useState<Escrow | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    async function fetchEscrow() {
        setLoading(true);
        const data = await getEscrow(escrowId);
        if (!data) {
            setNotFound(true);
        } else {
            setEscrow(data);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (escrowId) fetchEscrow();
    }, [escrowId]);

    function copyToClipboard(text: string, field: string) {
        navigator.clipboard.writeText(text).catch(() => { });
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    if (loading) {
        return (
            <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
                <Sidebar />
                <main style={{ flex: 1, padding: "32px 36px" }}>
                    <div style={{ maxWidth: 900, margin: "0 auto" }}>
                        <div className="glass-card" style={{ height: 300, opacity: 0.4, animation: "pulse-glow 2s ease-in-out infinite" }} />
                    </div>
                </main>
            </div>
        );
    }

    if (notFound || !escrow) {
        return (
            <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
                <Sidebar />
                <main style={{ flex: 1, padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 48, marginBottom: 12 }}>404</p>
                        <p style={{ color: "#475569", marginBottom: 20 }}>Escrow #{escrowId} not found.</p>
                        <button className="btn-primary" onClick={() => router.push("/")}>← Back to Dashboard</button>
                    </div>
                </main>
            </div>
        );
    }

    const isResolved = escrow.status === "RESOLVED";
    const statusColor = isResolved
        ? escrow.is_approved ? "#34D399" : "#FCA5A5"
        : escrow.status === "WORK_SUBMITTED" ? "#FCD34D"
            : escrow.status === "FUNDED" ? "#60A5FA"
                : "#94A3B8";

    return (
        <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
                <div style={{ maxWidth: 960, margin: "0 auto" }}>
                    {/* Back nav */}
                    <button
                        onClick={() => router.push("/")}
                        className="btn-ghost"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 24,
                            padding: "7px 14px",
                            fontSize: 13,
                        }}
                    >
                        <ArrowLeft size={14} />
                        Dashboard
                    </button>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ marginBottom: 24 }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px", color: "#E2E8F0" }}>
                                Escrow #{escrow.id}
                            </h1>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    padding: "4px 12px",
                                    borderRadius: 999,
                                    background: "rgba(30,41,59,0.6)",
                                    color: statusColor,
                                    border: `1px solid ${statusColor}33`,
                                }}
                            >
                                {escrow.status.replace("_", " ")}
                            </span>
                            <button
                                onClick={fetchEscrow}
                                disabled={loading}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "#94A3B8",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "6px",
                                    borderRadius: "8px",
                                    transition: "all 0.2s"
                                }}
                                title="Reload Escrow"
                                className="hover:text-white hover:bg-white/10"
                            >
                                <ArrowsClockwise size={16} weight="bold" className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                        <p style={{ fontSize: 13, color: "#475569" }}>
                            AI-arbitrated escrow on the GenLayer protocol
                        </p>
                    </motion.div>

                    {/* Status Timeline */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.4 }}
                        className="glass-card"
                        style={{ padding: "24px 28px", marginBottom: 20 }}
                    >
                        <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>
                            Lifecycle Progress
                        </h3>
                        <StatusTimeline status={escrow.status} />
                    </motion.div>

                    {/* Two-column layout */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
                        {/* Left: Details */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {/* Parties */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.14, duration: 0.4 }}
                                className="glass-card"
                                style={{ padding: "22px 24px" }}
                            >
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                                    Parties
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {[
                                        { label: "Client", addr: escrow.client, icon: User, color: "#94A3B8" },
                                        { label: "Freelancer", addr: escrow.freelancer, icon: User, color: "#60A5FA" },
                                    ].map(({ label, addr, icon: Icon, color }) => (
                                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(15,27,48,0.5)", border: "1px solid rgba(59,130,246,0.08)" }}>
                                            <Icon size={15} color={color} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>{label}</div>
                                                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#CBD5E1" }}>{addr}</div>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(addr, label)}
                                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#475569", padding: 4 }}
                                            >
                                                {copiedField === label
                                                    ? <CheckCircle size={14} color="#34D399" />
                                                    : <Copy size={14} />
                                                }
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Requirements */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                                className="glass-card"
                                style={{ padding: "22px 24px" }}
                            >
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                                    <FileText size={13} />
                                    Requirements
                                </h3>
                                <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                                    {escrow.requirements_text}
                                </p>
                            </motion.div>

                            {/* Financials */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.26, duration: 0.4 }}
                                className="glass-card"
                                style={{ padding: "22px 24px" }}
                            >
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                                    <CurrencyDollar size={13} />
                                    Financials
                                </h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    {[
                                        { label: "Locked Amount", value: escrow.amount !== "0" ? `${formatAmount(escrow.amount)} ETH` : "Not funded", color: "#34D399" },
                                        { label: "Protocol Fee (2.5%)", value: escrow.fee_amount !== "0" ? `${formatAmount(escrow.fee_amount)} ETH` : "—", color: "#94A3B8" },
                                        ...(isResolved ? [
                                            { label: "AI Impact Score", value: `${escrow.impact_score}/100`, color: escrow.impact_score >= 60 ? "#34D399" : "#FCA5A5" },
                                            { label: "Verdict", value: escrow.is_approved ? "Approved" : "Rejected", color: escrow.is_approved ? "#34D399" : "#FCA5A5" },
                                        ] : []),
                                    ].map(({ label, value, color }) => (
                                        <div key={label} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(15,27,48,0.5)", border: "1px solid rgba(59,130,246,0.08)" }}>
                                            <div style={{ fontSize: 11, color: "#475569", marginBottom: 5 }}>{label}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Submitted Work URL */}
                            {escrow.submitted_work_url && (
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.32, duration: 0.4 }}
                                    className="glass-card"
                                    style={{ padding: "18px 22px" }}
                                >
                                    <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                        <Globe size={13} />
                                        Submitted Work
                                    </h3>
                                    <a
                                        href={escrow.submitted_work_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: 13, color: "#60A5FA", wordBreak: "break-all", textDecoration: "underline", textDecorationColor: "rgba(96,165,250,0.4)" }}
                                    >
                                        {escrow.submitted_work_url}
                                    </a>
                                </motion.div>
                            )}
                        </div>

                        {/* Right: Action Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.4 }}
                        >
                            <ActionPanel escrow={escrow} onRefresh={fetchEscrow} />
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
