"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Scales,
  CurrencyDollar,
  Hourglass,
  CheckCircle,
  Circle,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import EscrowCard from "@/components/EscrowCard";
import CreateEscrowModal from "@/components/CreateEscrowModal";
import { getAllEscrows, isDemoMode, type Escrow } from "@/lib/genlayer";

export default function DashboardPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isDemo = isDemoMode();

  async function fetchEscrows() {
    setLoading(true);
    try {
      const data = await getAllEscrows();
      setEscrows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEscrows();
  }, []);

  // Derived stats
  const totalEscrows = escrows.length;
  const activeEscrows = escrows.filter(
    (e) => e.status !== "RESOLVED"
  ).length;
  const resolvedEscrows = escrows.filter(
    (e) => e.status === "RESOLVED"
  ).length;
  const totalFunded = escrows
    .filter((e) => e.amount !== "0")
    .reduce((sum, e) => sum + Number(e.amount) / 1e18, 0)
    .toFixed(2);

  const stats = [
    {
      label: "Total Escrows",
      value: totalEscrows,
      icon: Scales,
      color: "#60A5FA",
      bg: "rgba(59,130,246,0.08)",
    },
    {
      label: "Active",
      value: activeEscrows,
      icon: Hourglass,
      color: "#FCD34D",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Total Locked",
      value: `${totalFunded} ETH`,
      icon: CurrencyDollar,
      color: "#34D399",
      bg: "rgba(16,185,129,0.08)",
    },
    {
      label: "Resolved",
      value: resolvedEscrows,
      icon: CheckCircle,
      color: "#A78BFA",
      bg: "rgba(139,92,246,0.08)",
    },
  ];

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <Sidebar />

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        {/* Demo Mode Banner */}
        {isDemo && (
          <div
            style={{
              marginBottom: 20,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#FCD34D",
            }}
          >
            <Circle size={8} weight="fill" color="#FCD34D" />
            <span>
              <strong>Demo Mode</strong> — No contract address configured. Using
              mock data. Set{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "rgba(245,158,11,0.1)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS
              </code>{" "}
              in <code style={{ fontFamily: "monospace" }}>.env.local</code> to
              connect to the live contract.
            </span>
          </div>
        )}

        {/* Page Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#E2E8F0",
                marginBottom: 4,
              }}
            >
              Escrow Dashboard
            </h1>
            <p style={{ fontSize: 14, color: "#475569" }}>
              Autonomous AI-arbitrated agreements on GenLayer
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn-ghost"
              onClick={fetchEscrows}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px" }}
            >
              <ArrowCounterClockwise
                size={14}
                style={{
                  animation: loading ? "spin-slow 1s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 18px",
              }}
            >
              <Plus size={16} weight="bold" />
              New Escrow
            </button>
          </div>
        </div>

        {/* Stats Row — Bento */}
        <div
          className="bento-grid"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            marginBottom: 24,
          }}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="glass-card"
                style={{ padding: "20px 22px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}
                  >
                    {stat.label}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: stat.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} color={stat.color} weight="duotone" />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: stat.color,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {stat.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            All Escrows
          </h2>
          <span
            style={{
              fontSize: 12,
              color: "#334155",
              padding: "3px 10px",
              borderRadius: 20,
              background: "rgba(30,41,59,0.6)",
              border: "1px solid rgba(71,85,105,0.3)",
            }}
          >
            {escrows.length} total
          </span>
        </div>

        {/* Bento Grid: Escrow Cards */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: 20,
                  height: 200,
                  opacity: 0.4,
                  animation: "pulse-glow 2s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        ) : escrows.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: 64,
              textAlign: "center",
            }}
          >
            <Scales
              size={40}
              color="#334155"
              weight="duotone"
              style={{ marginBottom: 12 }}
            />
            <h3
              style={{ fontSize: 16, fontWeight: 600, color: "#475569", marginBottom: 8 }}
            >
              No escrows yet
            </h3>
            <p style={{ fontSize: 13, color: "#334155", marginBottom: 20 }}>
              Create your first AI-arbitrated escrow agreement.
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} weight="bold" />
              Create First Escrow
            </button>
          </div>
        ) : (
          <div
            className="bento-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {escrows.map((escrow, i) => (
              <motion.div
                key={escrow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <EscrowCard escrow={escrow} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <CreateEscrowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(id) => {
          fetchEscrows();
        }}
      />
    </div>
  );
}
