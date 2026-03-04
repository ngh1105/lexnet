"use client";

import Link from "next/link";
import {
    Scales,
    CurrencyDollar,
    User,
    ArrowRight,
    CheckCircle,
    Clock,
    Gavel,
    FileText,
} from "@phosphor-icons/react";
import type { Escrow } from "@/lib/genlayer";
import { formatAmount, truncateAddress } from "@/lib/genlayer";

interface EscrowCardProps {
    escrow: Escrow;
}

type StatusConfig = {
    label: string;
    badgeClass: string;
    icon: React.ElementType;
    iconColor: string;
};

function getStatusConfig(escrow: Escrow): StatusConfig {
    switch (escrow.status) {
        case "CREATED":
            return {
                label: "Created",
                badgeClass: "badge-created",
                icon: FileText,
                iconColor: "#94A3B8",
            };
        case "FUNDED":
            return {
                label: "Funded",
                badgeClass: "badge-funded",
                icon: CurrencyDollar,
                iconColor: "#60A5FA",
            };
        case "WORK_SUBMITTED":
            return {
                label: "Work Submitted",
                badgeClass: "badge-submitted",
                icon: Clock,
                iconColor: "#FCD34D",
            };
        case "AI_EVALUATING":
            return {
                label: "AI Evaluating",
                badgeClass: "badge-evaluating",
                icon: Gavel,
                iconColor: "#A78BFA",
            };
        case "RESOLVED":
            return {
                label: escrow.is_approved ? "Approved ✓" : "Rejected ✗",
                badgeClass: escrow.is_approved
                    ? "badge-resolved-pass"
                    : "badge-resolved-fail",
                icon: CheckCircle,
                iconColor: escrow.is_approved ? "#34D399" : "#FCA5A5",
            };
        default:
            return {
                label: escrow.status,
                badgeClass: "badge-created",
                icon: Scales,
                iconColor: "#94A3B8",
            };
    }
}

export default function EscrowCard({ escrow }: EscrowCardProps) {
    const config = getStatusConfig(escrow);
    const StatusIcon = config.icon;
    const ethAmount = formatAmount(escrow.amount);
    const hasAmount = ethAmount !== "0";

    return (
        <Link href={`/escrow/${escrow.id}`} style={{ textDecoration: "none" }}>
            <div
                className="glass-card glass-card-hover"
                style={{ padding: "20px", cursor: "pointer", height: "100%" }}
            >
                {/* Header Row */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 14,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: "#475569",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            #{escrow.id}
                        </span>
                    </div>
                    <span
                        className={config.badgeClass}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                        }}
                    >
                        <StatusIcon size={11} weight="fill" color={config.iconColor} />
                        {config.label}
                    </span>
                </div>

                {/* Requirements Preview */}
                <p
                    style={{
                        fontSize: 13,
                        color: "#CBD5E1",
                        lineHeight: 1.55,
                        marginBottom: 16,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {escrow.requirements_text}
                </p>

                {/* Meta Row */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: "#475569",
                        }}
                    >
                        <User size={12} />
                        <span style={{ color: "#64748B" }}>Client:</span>
                        <span style={{ fontFamily: "monospace", color: "#94A3B8" }}>
                            {truncateAddress(escrow.client)}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: "#475569",
                        }}
                    >
                        <User size={12} color="#60A5FA" />
                        <span style={{ color: "#64748B" }}>Freelancer:</span>
                        <span style={{ fontFamily: "monospace", color: "#94A3B8" }}>
                            {truncateAddress(escrow.freelancer)}
                        </span>
                    </div>
                </div>

                {/* Footer Row */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 12,
                        borderTop: "1px solid rgba(59,130,246,0.1)",
                    }}
                >
                    {hasAmount ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <CurrencyDollar size={14} color="#34D399" />
                            <span
                                style={{ fontSize: 13, fontWeight: 700, color: "#34D399" }}
                            >
                                {ethAmount} ETH
                            </span>
                        </div>
                    ) : (
                        <span style={{ fontSize: 12, color: "#475569" }}>
                            Not funded yet
                        </span>
                    )}
                    {escrow.status === "RESOLVED" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "#475569" }}>Score:</span>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color:
                                        escrow.impact_score >= 60 ? "#34D399" : "#FCA5A5",
                                }}
                            >
                                {escrow.impact_score}/100
                            </span>
                        </div>
                    )}
                    <ArrowRight size={14} color="#475569" />
                </div>
            </div>
        </Link>
    );
}
