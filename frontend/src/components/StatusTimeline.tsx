"use client";

import { CheckCircle, Circle, DotsThree } from "@phosphor-icons/react";
import { EscrowStatus, STATUS_ORDER, getStatusIndex } from "@/lib/genlayer";

interface StatusTimelineProps {
    status: EscrowStatus;
}

const STEPS = [
    {
        key: "CREATED" as EscrowStatus,
        label: "Created",
        description: "Agreement registered on-chain",
    },
    {
        key: "FUNDED" as EscrowStatus,
        label: "Funded",
        description: "Payment locked in contract",
    },
    {
        key: "WORK_SUBMITTED" as EscrowStatus,
        label: "Work Submitted",
        description: "Deliverable URL recorded",
    },
    {
        key: "RESOLVED" as EscrowStatus,
        label: "Resolved",
        description: "AI verdict & funds disbursed",
    },
];

export default function StatusTimeline({ status }: StatusTimelineProps) {
    const currentIndex = getStatusIndex(status);

    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0,
                }}
            >
                {STEPS.map((step, i) => {
                    const stepIndex = STATUS_ORDER.indexOf(step.key);
                    const isCompleted = currentIndex > stepIndex;
                    const isActive = currentIndex === stepIndex;
                    const isEvaluating = status === "AI_EVALUATING" && i === 2;
                    const isLast = i === STEPS.length - 1;

                    return (
                        <div
                            key={step.key}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flex: isLast ? "0 0 auto" : 1,
                            }}
                        >
                            {/* Node + connector */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    width: "100%",
                                    marginBottom: 10,
                                }}
                            >
                                {/* Step node */}
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        transition: "all 0.3s ease",
                                        background: isCompleted
                                            ? "linear-gradient(135deg, #10B981, #059669)"
                                            : isActive || isEvaluating
                                                ? "linear-gradient(135deg, #3B82F6, #2563EB)"
                                                : "rgba(30,41,59,0.8)",
                                        border: isCompleted
                                            ? "none"
                                            : isActive || isEvaluating
                                                ? "none"
                                                : "1px solid rgba(71,85,105,0.5)",
                                        boxShadow:
                                            isCompleted || isActive || isEvaluating
                                                ? isCompleted
                                                    ? "0 0 16px rgba(16,185,129,0.35)"
                                                    : "0 0 16px rgba(59,130,246,0.35)"
                                                : "none",
                                    }}
                                >
                                    {isCompleted ? (
                                        <CheckCircle size={16} weight="fill" color="#fff" />
                                    ) : isActive || isEvaluating ? (
                                        isEvaluating ? (
                                            <DotsThree size={18} weight="bold" color="#fff" />
                                        ) : (
                                            <Circle size={10} weight="fill" color="#fff" />
                                        )
                                    ) : (
                                        <Circle size={10} weight="regular" color="#334155" />
                                    )}
                                </div>

                                {/* Connector bar */}
                                {!isLast && (
                                    <div
                                        className={`timeline-connector ${isCompleted ? "active" : ""
                                            }`}
                                    />
                                )}
                            </div>

                            {/* Text labels */}
                            <div
                                style={{
                                    textAlign: "left",
                                    paddingRight: isLast ? 0 : 12,
                                    minWidth: 0,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 3,
                                        color: isCompleted
                                            ? "#34D399"
                                            : isActive || isEvaluating
                                                ? "#60A5FA"
                                                : "#475569",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {step.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#334155",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {step.description}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
