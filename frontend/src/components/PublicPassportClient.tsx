import {
  BadgeCheck,
  IdCard,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { PublicPassportView } from "@/lib/platform/types";

const trustColors: Record<string, string> = {
  Established: "var(--green)",
  Reliable: "var(--blue)",
  Developing: "var(--amber)",
  "At Risk": "var(--red)",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toISOString().slice(0, 10);
}

export default function PublicPassportClient({
  passport,
}: {
  passport: PublicPassportView;
}) {
  const color = trustColors[passport.trustLevel] ?? "var(--muted)";

  return (
    <main className="main-shell" style={{ minHeight: "100vh", marginLeft: 0 }}>
      <div className="content-frame trust-report-shell" style={{ maxWidth: 920, margin: "0 auto" }}>
        <header className="topbar hero-panel" style={{ boxShadow: "none" }}>
          <div>
            <div className="section-label">
              <IdCard size={14} strokeWidth={1.75} />
              Public Trust Passport
            </div>
            <h1 className="topbar-title">{passport.party}</h1>
            <p className="topbar-subtitle">
              Privacy-safe LexNet trust history for this {passport.role}. This page includes only published aggregate verification signals.
            </p>
          </div>
          <span
            className="status-chip"
            style={{
              borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
              color,
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
            }}
          >
            {passport.trustLevel}
          </span>
        </header>

        <section className="metric-grid" style={{ marginBottom: 18 }}>
          <PublicMetric
            icon={<ShieldCheck size={18} strokeWidth={1.75} />}
            label="Verified Cases"
            value={`${passport.verifiedCases}/${passport.totalCases}`}
          />
          <PublicMetric
            icon={<TrendingUp size={18} strokeWidth={1.75} />}
            label="Average Score"
            value={`${passport.averageScore}/100`}
          />
          <PublicMetric
            icon={<BadgeCheck size={18} strokeWidth={1.75} />}
            label="Referenced Value"
            value={passport.totalReferencedValue}
          />
          <PublicMetric label="Published" value={formatDate(passport.publishedAt)} />
        </section>

        <section className="panel review-panel" style={{ display: "grid", gap: 16 }}>
          <div>
            <div className="section-label">Published Verification Summary</div>
            <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
              LexNet publishes aggregate trust passport data only after an operator enables public visibility. Private case parties, raw case evidence, and internal workspace details are not included on this page.
            </p>
            <p className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
              Treat this page as a shareable trust signal, not a payment, custody, or final
              settlement record.
            </p>
          </div>

          {passport.riskFlags.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="section-label">Risk Flags</div>
              {passport.riskFlags.map((flag, index) => (
                <div key={`${flag}-${index}`} className="risk-chip">
                  <ShieldAlert size={14} strokeWidth={1.75} />
                  {flag}
                </div>
              ))}
            </div>
          ) : (
            <span className="status-chip success" style={{ width: "fit-content" }}>
              <ShieldCheck size={13} strokeWidth={1.75} />
              No active risk flags
            </span>
          )}

          <div className="insight-card" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              "No raw evidence",
              "No private case IDs",
              "No workspace data",
              "No payout status",
            ].map((item) => (
              <span key={item} className="status-chip info">
                {item}
              </span>
            ))}
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>
            Last updated {formatDate(passport.updatedAt)} · Passport slug {passport.slug}
          </div>
        </section>
      </div>
    </main>
  );
}

function PublicMetric({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-label">
        {icon}
        {label}
      </div>
      <div className="metric-card-value">{value}</div>
    </div>
  );
}
