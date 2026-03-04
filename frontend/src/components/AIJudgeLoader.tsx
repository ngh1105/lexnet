"use client";

import { Scales, Gavel } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const AI_MESSAGES = [
    "Connecting to GenLayer validators…",
    "Fetching submitted work from the web…",
    "Running AI evaluation prompt…",
    "Waiting for consensus among validators…",
    "Verifying Equivalence Principle…",
    "AI Arbitration Engine is deliberating…",
    "Finalizing verdict on-chain…",
];

interface AIJudgeLoaderProps {
    isVisible: boolean;
}

export default function AIJudgeLoader({ isVisible }: AIJudgeLoaderProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) {
            setMessageIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setMessageIndex((i) => (i + 1) % AI_MESSAGES.length);
        }, 3200);
        return () => clearInterval(interval);
    }, [isVisible]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="glass-card"
                        initial={{ scale: 0.88, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.88, opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, type: "spring", damping: 22 }}
                        style={{
                            padding: "48px 56px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 32,
                            maxWidth: 480,
                            width: "100%",
                            textAlign: "center",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Background radial glow */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                    "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)",
                                pointerEvents: "none",
                            }}
                        />

                        {/* Animated Rings + Icon */}
                        <div
                            style={{
                                position: "relative",
                                width: 120,
                                height: 120,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {/* Outermost ring */}
                            <motion.div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "50%",
                                    border: "1.5px dashed rgba(59,130,246,0.25)",
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            />
                            {/* Middle ring */}
                            <motion.div
                                style={{
                                    position: "absolute",
                                    inset: 14,
                                    borderRadius: "50%",
                                    border: "1.5px dashed rgba(16,185,129,0.3)",
                                }}
                                animate={{ rotate: -360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            />
                            {/* Inner glow ring */}
                            <motion.div
                                className="animate-pulse-glow"
                                style={{
                                    position: "absolute",
                                    inset: 28,
                                    borderRadius: "50%",
                                    background:
                                        "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.1))",
                                    border: "1px solid rgba(59,130,246,0.3)",
                                }}
                            />
                            {/* Center icon */}
                            <motion.div
                                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                style={{ position: "relative", zIndex: 1 }}
                            >
                                <Scales size={38} weight="duotone" color="#60A5FA" />
                            </motion.div>
                        </div>

                        {/* Title */}
                        <div>
                            <h2
                                style={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: "#E2E8F0",
                                    marginBottom: 8,
                                    letterSpacing: "-0.3px",
                                }}
                            >
                                AI Judge Deliberating
                            </h2>
                            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                                GenLayer&apos;s AI validators are independently reviewing the
                                submitted work. This process typically takes{" "}
                                <span style={{ color: "#60A5FA", fontWeight: 600 }}>
                                    30–90 seconds
                                </span>
                                .
                            </p>
                        </div>

                        {/* Rotating message */}
                        <div
                            style={{
                                minHeight: 44,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={messageIndex}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.35 }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        background: "rgba(59,130,246,0.08)",
                                        border: "1px solid rgba(59,130,246,0.15)",
                                    }}
                                >
                                    <Gavel size={14} weight="fill" color="#60A5FA" />
                                    <span
                                        style={{ fontSize: 13, color: "#93C5FD", fontWeight: 500 }}
                                    >
                                        {AI_MESSAGES[messageIndex]}
                                    </span>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Bouncing dots */}
                        <div style={{ display: "flex", gap: 6 }}>
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: i === 1 ? "#10B981" : "#3B82F6",
                                    }}
                                    animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * 0.18,
                                        ease: "easeInOut",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Warning note */}
                        <p
                            style={{
                                fontSize: 11,
                                color: "#334155",
                                lineHeight: 1.5,
                                maxWidth: 320,
                            }}
                        >
                            Do not close this window. Consensus is being reached across the
                            GenLayer validator network.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
