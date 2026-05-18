"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  IdCard,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "@/components/icons";
import Sidebar from "@/components/Sidebar";
import { getMergedCommerceCases } from "@/lib/lexnet-client-store";
import { buildSubjectKey } from "@/lib/platform/passports";
import {
  buildPassportScoreBreakdown,
  buildTrustPassports,
} from "@/lib/lexnet-domain";
import type { CommerceCase, TrustPassport } from "@/lib/lexnet-types";
import type { SafePassportRecord } from "@/lib/platform/store";

type PassportFilter = "all" | "buyers" | "sellers";
type PassportActionState = {
  status: "idle" | "loading" | "error" | "success";
  message: string;
};

const trustColors: Record<string, string> = {
  Established: "var(--green)",
  Reliable: "var(--blue)",
  Developing: "var(--amber)",
  "At Risk": "var(--red)",
};

export default function TrustPassportsClient({
  seedCases,
  initialBackendPassports = [],
}: {
  seedCases: CommerceCase[];
  initialBackendPassports?: SafePassportRecord[];
}) {
  const [cases, setCases] = useState(seedCases);
  const [backendPassports, setBackendPassports] = useState(initialBackendPassports);
  const [filter, setFilter] = useState<PassportFilter>("all");
  const [search, setSearch] = useState("");
  const [actionState, setActionState] = useState<PassportActionState>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    setCases(getMergedCommerceCases(seedCases));
  }, [seedCases]);

  useEffect(() => {
    void refreshBackendPassports({ silent: true });
  }, []);

  useEffect(() => {
    if (actionState.status === "success" || actionState.status === "error") {
      const timer = setTimeout(() => {
        setActionState({ status: "idle", message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionState.status]);

  const passports = useMemo(() => buildTrustPassports(cases), [cases]);
  const backendBySubjectKey = useMemo(() => {
    return new Map(
      backendPassports.map((passport) => [passport.subjectKey, passport]),
    );
  }, [backendPassports]);

  const filteredPassports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return passports.filter((passport) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "buyers" && passport.role === "buyer") ||
        (filter === "sellers" && passport.role === "seller");

      const backendPassport = backendBySubjectKey.get(
        buildSubjectKey(passport.role, passport.party),
      );
      const matchesSearch =
        !normalizedSearch ||
        [
          passport.party,
          backendPassport?.redactedSubject,
          passport.role,
          passport.trustLevel,
          backendPassport?.slug,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [backendBySubjectKey, filter, passports, search]);

  async function refreshBackendPassports({ silent = false } = {}) {
    try {
      const response = await fetch("/api/passports", {
        headers: { "x-lexnet-operator-id": "operator-demo" },
      });
      if (!response.ok) {
        if (!silent) {
          setActionState({
            status: "error",
            message: "Backend passport API is not enabled for this demo session.",
          });
        }
        return;
      }

      const payload = (await response.json()) as { passports?: SafePassportRecord[] };
      setBackendPassports(Array.isArray(payload.passports) ? payload.passports : []);
      if (!silent) {
        setActionState({ status: "success", message: "Backend passports refreshed." });
      }
    } catch {
      if (!silent) {
        setActionState({
          status: "error",
          message: "Could not reach the backend passport API.",
        });
      }
    }
  }

  async function generateBackendPassports() {
    setActionState({ status: "loading", message: "Generating backend passports..." });
    try {
      const response = await fetch("/api/passports", {
        method: "POST",
        headers: { "x-lexnet-operator-id": "operator-demo" },
      });
      if (!response.ok) {
        setActionState({
          status: "error",
          message: "Backend generation is unavailable. Enable LEXNET_ENABLE_DEMO_PRIVATE_API=true to use it.",
        });
        return;
      }

      const payload = (await response.json()) as { passports?: SafePassportRecord[]; count?: number };
      const passports = Array.isArray(payload.passports) ? payload.passports : [];
      const count = typeof payload.count === "number" ? payload.count : passports.length;
      setBackendPassports(passports);
      setActionState({
        status: count > 0 ? "success" : "error",
        message: count > 0
          ? "Backend passport records generated."
          : "No backend cases available to generate passports.",
      });
    } catch {
      setActionState({
        status: "error",
        message: "Could not generate backend passport records.",
      });
    }
  }

  async function togglePassportPublication(slug: string, published: boolean) {
    setActionState({
      status: "loading",
      message: published ? "Publishing passport..." : "Unpublishing passport...",
    });
    try {
      const response = await fetch("/api/passports", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-lexnet-operator-id": "operator-demo",
        },
        body: JSON.stringify({ slug, published }),
      });
      if (!response.ok) {
        setActionState({
          status: "error",
          message: "Publishing is unavailable. Enable LEXNET_ENABLE_DEMO_PRIVATE_API=true to use it.",
        });
        return;
      }

      const payload = (await response.json()) as { passport?: SafePassportRecord };
      if (payload.passport) {
        setBackendPassports((current) =>
          current.map((passport) =>
            passport.slug === payload.passport?.slug ? payload.passport : passport,
          ),
        );
      }
      setActionState({
        status: "success",
        message: published ? "Passport published." : "Passport unpublished.",
      });
    } catch {
      setActionState({
        status: "error",
        message: "Could not update passport publication state.",
      });
    }
  }

  return (
    <div className="app-shell command-center-page">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar hero-panel">
            <div>
              <div className="section-label">
                <IdCard size={14} strokeWidth={1.75} />
                Trust Passports
              </div>
              <h1 className="topbar-title">Portable Trust History</h1>
              <p className="topbar-subtitle">
                Operator-managed trust summaries derived from reviewed commerce cases. Published
                records expose only privacy-safe aggregate signals.
              </p>
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                className="primary-button"
                onClick={generateBackendPassports}
                disabled={actionState.status === "loading"}
              >
                Generate backend records
              </button>
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

          {actionState.message ? (
            <div className="toast-stack">
              <div
                className={`toast ${
                  actionState.status === "error"
                    ? "error"
                    : actionState.status === "loading"
                      ? "loading"
                      : "success"
                }`}
              >
                <span className="toast-dot" />
                <span>{actionState.message}</span>
              </div>
            </div>
          ) : null}

          <section className="panel hero-panel" style={{ marginBottom: 18, display: "grid", gap: 12 }}>
            <div className="section-label">
              <ShieldCheck size={14} strokeWidth={1.75} />
              Publication Model
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              Backend passport records can be published into public previews. Local demo
              passports are derived from the command-center case set and need backend generation before
              publication controls apply. Public previews hide raw parties, evidence, case IDs,
              audit events, and workspace data.
            </p>
          </section>

          <section className="metric-grid" style={{ marginBottom: 18 }}>
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

          <section className="surface-grid">
            {filteredPassports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <IdCard size={24} strokeWidth={1.75} />
                </div>
                <h3>No passports match these filters</h3>
                <p>
                  Adjust filters or search, or generate backend records to bring
                  more parties into the trust history.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={generateBackendPassports}
                  disabled={actionState.status === "loading"}
                >
                  Generate backend records
                </button>
              </div>
            ) : (
              filteredPassports.map((passport) => {
                const backendPassport = backendBySubjectKey.get(
                  buildSubjectKey(passport.role, passport.party),
                );
                return (
                  <PassportCard
                    key={`${passport.role}:${passport.party}`}
                    passport={passport}
                    backendPassport={backendPassport}
                    actionDisabled={actionState.status === "loading"}
                    onTogglePublication={togglePassportPublication}
                  />
                );
              })
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function PassportCard({
  passport,
  backendPassport,
  actionDisabled,
  onTogglePublication,
}: {
  passport: TrustPassport;
  backendPassport?: SafePassportRecord;
  actionDisabled: boolean;
  onTogglePublication: (slug: string, published: boolean) => void;
}) {
  const color = trustColors[passport.trustLevel] ?? "var(--muted)";
  const breakdown = buildPassportScoreBreakdown(passport);
  const publicPath = backendPassport ? `/passport/${backendPassport.slug}` : "";

  return (
    <article className="panel review-panel passport-card">
      <div className="passport-card-header">
        <div style={{ minWidth: 0 }}>
          <div className="section-label">{passport.role} passport</div>
          <h2 className="passport-card-name">{passport.party}</h2>
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

      <div className="passport-stats">
        <PassportStat label="Verified" value={`${passport.verifiedCases}/${passport.totalCases}`} icon={<ShieldCheck size={13} strokeWidth={1.75} />} />
        <PassportStat label="Avg Score" value={`${passport.averageScore}/100`} icon={<TrendingUp size={13} strokeWidth={1.75} />} />
        <PassportStat label="Value" value={`$${passport.totalReferencedValue.toLocaleString()}`} />
        <PassportStat label="Last Activity" value={passport.lastActivityAt.slice(0, 10)} />
      </div>

      <div className="passport-breakdown">
        <div className="section-label" style={{ marginBottom: 4 }}>Score Breakdown</div>
        <BreakdownRow label="Verification" value={breakdown.verificationRate} />
        <BreakdownRow label="Score Strength" value={breakdown.scoreStrength} />
        <BreakdownRow label="Value Weight" value={breakdown.valueWeight} />
        <BreakdownRow label="Risk Penalty" value={breakdown.riskPenalty} inverted />
      </div>

      <div className="passport-backend-strip">
        {backendPassport ? (
          <>
            <div className="passport-backend-strip-row">
              <span>
                {backendPassport.published ? "Published" : "Unpublished"} · {backendPassport.redactedSubject}
              </span>
              <button
                type="button"
                className="passport-mini-button"
                disabled={actionDisabled}
                onClick={() => onTogglePublication(backendPassport.slug, !backendPassport.published)}
              >
                {backendPassport.published ? "Unpublish" : "Publish"}
              </button>
            </div>
            {backendPassport.published ? (
              <a href={publicPath}>{publicPath}</a>
            ) : (
              <span style={{ fontSize: 11 }}>Publish to expose a public preview link.</span>
            )}
          </>
        ) : (
          <span>Local preview only. Generate backend records to publish a privacy-safe link.</span>
        )}
      </div>

      {passport.riskFlags.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          {passport.riskFlags.map((flag) => {
            const isHigh =
              /missing-evidence|no-evidence|payout|fraud|dispute/i.test(flag);
            return (
              <div key={flag} className={`risk-chip${isHigh ? " danger" : ""}`}>
                <ShieldAlert size={13} strokeWidth={1.75} />
                {flag}
              </div>
            );
          })}
        </div>
      ) : (
        <span className="status-chip success" style={{ width: "fit-content" }}>
          <ShieldCheck size={12} strokeWidth={1.75} />
          No active risk flags
        </span>
      )}
    </article>
  );
}

function PassportStat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="passport-stat">
      <div className="passport-stat-label">
        {icon}
        {label}
      </div>
      <div className="passport-stat-value">{value}</div>
    </div>
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

  return (
    <div className="passport-breakdown-row">
      <span className="passport-breakdown-label">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className={`passport-breakdown-bar${inverted ? " danger" : ""}`}>
          <span style={{ width }} />
        </div>
        <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800, minWidth: 32, textAlign: "right" }}>{value}</span>
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
          wordBreak: "break-word",
          lineHeight: 1.3,
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
