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
    Fingerprint,
    ClockCounterClockwise,
    LinkSimple,
    WarningCircle,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import StatusTimeline from "@/components/StatusTimeline";
import ActionPanel from "@/components/ActionPanel";
import ModeIndicator from "@/components/ModeIndicator";
import { getCaseArtifacts, reportExportUrl, reviewLatestReport, type CaseArtifacts } from "@/lib/backend-client";
import { getEscrow, formatAmount, truncateAddress, type Escrow } from "@/lib/genlayer";

export default function EscrowDetailPage() {
    const params = useParams();
    const router = useRouter();
    const escrowId = String(params?.id ?? "");

    const [escrow, setEscrow] = useState<Escrow | null>(null);
    const [artifacts, setArtifacts] = useState<CaseArtifacts | null>(null);
    const [artifactError, setArtifactError] = useState<string | null>(null);
    const [reviewingReport, setReviewingReport] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    async function fetchEscrow() {
        setLoading(true);
        setArtifactError(null);
        const data = await getEscrow(escrowId);
        if (!data) {
            setNotFound(true);
            setArtifacts(null);
        } else {
            setNotFound(false);
            setEscrow(data);
            try {
                setArtifacts(await getCaseArtifacts(escrowId));
            } catch (error) {
                setArtifacts(null);
                setArtifactError(error instanceof Error ? error.message : "Unable to load evidence timeline");
            }
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

    async function markReportReviewed() {
        setReviewingReport(true);
        try {
            await reviewLatestReport(escrowId, { status: "reviewed", actor: escrow?.client || "system" });
            await fetchEscrow();
        } finally {
            setReviewingReport(false);
        }
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
    const evidenceItems = artifacts?.evidence ?? [];
    const auditItems = artifacts?.auditEvents ?? [];
    const latestReport = artifacts?.reports.at(-1) ?? null;

    return (
        <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
                <div style={{ maxWidth: 960, margin: "0 auto" }}>
                    {/* Mode Indicator */}
                    <ModeIndicator />

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

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.38, duration: 0.4 }}
                                className="glass-card"
                                style={{ padding: "22px 24px" }}
                            >
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Fingerprint size={13} />
                                    Evidence Timeline
                                </h3>
                                {artifactError ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FCA5A5", fontSize: 13 }}>
                                        <WarningCircle size={16} />
                                        {artifactError}
                                    </div>
                                ) : evidenceItems.length === 0 ? (
                                    <p style={{ color: "#64748B", fontSize: 13 }}>No evidence artifacts have been submitted yet.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {evidenceItems.map((item) => (
                                            <div key={item.id} style={{ padding: "13px 14px", borderRadius: 10, background: "rgba(15,27,48,0.62)", border: "1px solid rgba(96,165,250,0.12)" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                                                    <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>{item.status.toUpperCase()}</span>
                                                    <span style={{ color: "#64748B", fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</span>
                                                </div>
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, color: "#60A5FA", fontSize: 13, wordBreak: "break-all", marginBottom: 8 }}>
                                                    <LinkSimple size={14} />
                                                    {item.normalizedUrl}
                                                </a>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, color: "#64748B", fontSize: 11 }}>
                                                    <span>By {truncateAddress(item.submittedBy)}</span>
                                                    <span title={item.checksum} style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>sha256 {item.checksum.slice(0, 12)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.44, duration: 0.4 }}
                                className="glass-card"
                                style={{ padding: "22px 24px" }}
                            >
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                                    <ClockCounterClockwise size={13} />
                                    Audit Trail
                                </h3>
                                {auditItems.length === 0 ? (
                                    <p style={{ color: "#64748B", fontSize: 13 }}>No audit events recorded for this case.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {auditItems.map((event) => (
                                            <div key={event.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
                                                <span style={{ color: "#64748B", fontSize: 11 }}>{new Date(event.createdAt).toLocaleString()}</span>
                                                <div>
                                                    <div style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>{event.action}</div>
                                                    <div style={{ color: "#64748B", fontSize: 11, marginTop: 3 }}>Actor {truncateAddress(event.actor)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Right: Action Panel */}
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.4 }}
                            style={{ display: "flex", flexDirection: "column", gap: 20 }}
                        >
                            <ActionPanel escrow={escrow} onRefresh={fetchEscrow} />
                            {latestReport && (
                                <div className="glass-card" style={{ padding: 22 }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                                        Verification Report
                                    </h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                                        <div style={{ padding: 10, borderRadius: 8, background: "rgba(15,27,48,0.5)" }}>
                                            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Schema</div>
                                            <div style={{ color: "#CBD5E1", fontSize: 12 }}>{latestReport.version}</div>
                                        </div>
                                        <div style={{ padding: 10, borderRadius: 8, background: "rgba(15,27,48,0.5)" }}>
                                            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Review</div>
                                            <div style={{ color: latestReport.status === "reviewed" ? "#34D399" : "#FCD34D", fontSize: 12 }}>{latestReport.status}</div>
                                        </div>
                                    </div>
                                    <p style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>{latestReport.rationale}</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <button className="btn-ghost" onClick={markReportReviewed} disabled={reviewingReport || latestReport.status === "reviewed"} style={{ width: "100%" }}>
                                            {latestReport.status === "reviewed" ? "Reviewed" : reviewingReport ? "Marking..." : "Mark Reviewed"}
                                        </button>
                                        <a className="btn-primary" href={reportExportUrl(escrow.id, "download")} style={{ textAlign: "center", textDecoration: "none" }}>Download JSON</a>
                                        <a className="btn-ghost" href={reportExportUrl(escrow.id, "print")} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>Printable Report</a>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
