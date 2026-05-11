"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type PublicPassport = {
  publicSlug: string;
  redactedSubject: string;
  score: number;
  scoreBreakdown: { avgImpact: number; completionRate: number; approvalRate: number; resolvedCases: number };
  sourceReportIds: string[];
  updatedAt: string;
};

export default function PassportPage() {
  const params = useParams();
  const slug = String(params?.slug ?? "");
  const [passport, setPassport] = useState<PublicPassport | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/passports/public/${slug}`)
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => setPassport(payload?.passport ?? null))
      .catch(() => setPassport(null));
  }, [slug]);

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "40px 36px" }}>
        <div className="glass-card" style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
          <p style={{ color: "#60A5FA", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Public Trust Passport</p>
          {!passport ? (
            <h1 style={{ color: "#E2E8F0", fontSize: 28 }}>Passport not found</h1>
          ) : (
            <>
              <h1 style={{ color: "#E2E8F0", fontSize: 34, marginBottom: 8 }}>{passport.redactedSubject}</h1>
              <div style={{ fontSize: 64, fontWeight: 900, color: passport.score >= 70 ? "#34D399" : "#FCD34D", marginBottom: 20 }}>{passport.score}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {Object.entries(passport.scoreBreakdown).map(([key, value]) => (
                  <div key={key} style={{ padding: 14, borderRadius: 12, background: "rgba(15,27,48,0.65)" }}>
                    <div style={{ color: "#64748B", fontSize: 11, marginBottom: 4 }}>{key}</div>
                    <div style={{ color: "#CBD5E1", fontSize: 18, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
              <p style={{ color: "#64748B", fontSize: 12, marginTop: 22 }}>Updated {new Date(passport.updatedAt).toLocaleString()} from {passport.sourceReportIds.length} verified report(s).</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
