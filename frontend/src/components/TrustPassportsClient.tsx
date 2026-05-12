"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  IdCard,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getMergedCommerceCases } from "@/lib/lexnet-client-store";
import {
  buildPassportScoreBreakdown,
  buildTrustPassports,
} from "@/lib/lexnet-domain";
import type { CommerceCase, TrustPassport } from "@/lib/lexnet-types";

type PassportFilter = "all" | "buyers" | "sellers";

const trustColors: Record<string, string> = {
  Established: "var(--green)",
  Reliable: "var(--blue)",
  Developing: "var(--amber)",
  "At Risk": "var(--red)",
};

export default function TrustPassportsClient({
  seedCases,
}: {
  seedCases: CommerceCase[];
}) {
  const [cases, setCases] = useState(seedCases);
  const [filter, setFilter] = useState<PassportFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setCases(getMergedCommerceCases(seedCases));
  }, [seedCases]);

  const passports = useMemo(() => buildTrustPassports(cases), [cases]);

  const filteredPassports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return passports.filter((passport) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "buyers" && passport.role === "buyer") ||
        (filter === "sellers" && passport.role === "seller");

      const matchesSearch =
        !normalizedSearch ||
        [passport.party, passport.role, passport.trustLevel]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, passports, search]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar">
            <div>
              <div className="section-label">
                <IdCard size={14} strokeWidth={1.75} />
                Trust Passports
              </div>
              <h1 className="topbar-title">Portable Trust History</h1>
              <p className="topbar-subtitle">
                Buyer and seller summaries derived from verified commerce case history.
              </p>
            </div>
            <div className="topbar-actions">
              <label className="search-box">
                <Search size={15} strokeWidth={1.75} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search passports"
                />
              </label>
              <div className="segmented">
                {[
                  { value: "all", label: "All" },
                  { value: "buyers", label: "Buyers" },
                  { value: "sellers", label: "Sellers" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={filter === item.value ? "active" : ""}
                    onClick={() => setFilter(item.value as PassportFilter)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <section className="metric-grid" style={{ marginBottom: 16 }}>
            <PassportMetric
              icon={<ShieldCheck size={18} strokeWidth={1.75} />}
              label="Generated Passports"
              value={filteredPassports.length.toLocaleString()}
            />
            <PassportMetric
              icon={<BadgeCheck size={18} strokeWidth={1.75} />}
              label="Established"
              value={filteredPassports.filter((passport) => passport.trustLevel === "Established").length.toLocaleString()}
            />
            <PassportMetric
              icon={<TrendingUp size={18} strokeWidth={1.75} />}
              label="Average Score"
              value={`${averageScore(filteredPassports)}/100`}
            />
            <PassportMetric
              icon={<ShieldAlert size={18} strokeWidth={1.75} />}
              label="Risk Flags"
              value={totalRiskFlags(filteredPassports).toLocaleString()}
            />
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(310px, 100%), 1fr))",
              gap: 14,
            }}
          >
            {filteredPassports.length === 0 ? (
              <div className="panel">
                <div className="section-label">
                  <IdCard size={14} strokeWidth={1.75} />
                  Trust Passport
                </div>
                <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                  No passport history yet for the current filters.
                </p>
              </div>
            ) : (
              filteredPassports.map((passport) => (
                <PassportCard key={`${passport.role}:${passport.party}`} passport={passport} />
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function PassportCard({ passport }: { passport: TrustPassport }) {
  const color = trustColors[passport.trustLevel] ?? "var(--muted)";
  const breakdown = buildPassportScoreBreakdown(passport);

  return (
    <article className="panel" style={{ display: "grid", gap: 16, minWidth: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="section-label">{passport.role} passport</div>
          <h2
            style={{
              marginTop: 8,
              color: "var(--ink)",
              fontSize: 16,
              fontWeight: 800,
              display: "block",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {passport.party}
          </h2>
        </div>
        <span
          className="status-chip"
          style={{
            borderColor: `${color}33`,
            color,
            background: `${color}14`,
          }}
        >
          {passport.trustLevel}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <PassportMetric label="Verified" value={`${passport.verifiedCases}/${passport.totalCases}`} icon={<ShieldCheck size={15} strokeWidth={1.75} />} />
        <PassportMetric label="Avg Score" value={`${passport.averageScore}/100`} icon={<TrendingUp size={15} strokeWidth={1.75} />} />
        <PassportMetric label="Value" value={`$${passport.totalReferencedValue.toLocaleString()}`} />
        <PassportMetric label="Last Activity" value={passport.lastActivityAt.slice(0, 10)} />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div className="section-label">Score Breakdown</div>
        <BreakdownRow label="Verification Rate" value={breakdown.verificationRate} />
        <BreakdownRow label="Score Strength" value={breakdown.scoreStrength} />
        <BreakdownRow label="Value Weight" value={breakdown.valueWeight} />
        <BreakdownRow label="Risk Penalty" value={breakdown.riskPenalty} inverted />
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          border: "1px solid rgba(37,99,235,0.18)",
          background: "var(--blue-soft)",
          color: "var(--blue)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Public preview ready after backend publishing is enabled.
      </div>

      {passport.riskFlags.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {passport.riskFlags.map((flag) => (
            <div key={flag} className="risk-chip">
              <ShieldAlert size={14} strokeWidth={1.75} />
              {flag}
            </div>
          ))}
        </div>
      ) : (
        <span className="status-chip success">
          <ShieldCheck size={13} strokeWidth={1.75} />
          No active risk flags
        </span>
      )}
    </article>
  );
}

function BreakdownRow({
  label,
  value,
  inverted,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const width = `${Math.max(0, Math.min(value, 100))}%`;
  const barColor = inverted ? "var(--red)" : "var(--teal)";

  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: "var(--surface-subtle)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <span style={{ display: "block", width, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}

function PassportMetric({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: "10px 11px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>
        {icon}
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function averageScore(passports: TrustPassport[]): number {
  if (passports.length === 0) {
    return 0;
  }

  const total = passports.reduce((sum, passport) => sum + passport.averageScore, 0);
  return Math.round(total / passports.length);
}

function totalRiskFlags(passports: TrustPassport[]): number {
  return passports.reduce((sum, passport) => sum + passport.riskFlags.length, 0);
}
