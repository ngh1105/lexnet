import Link from "next/link";
import { ArrowLeft, FilePlus2, LayoutPanelLeft, ShieldCheck } from "@/components/icons";
import Sidebar from "@/components/Sidebar";
import NewCaseForm from "@/components/NewCaseForm";
import { getAllCommerceCases } from "@/lib/lexnet-service";

export const dynamic = "force-dynamic";

export default async function NewCommerceCasePage() {
  const seedCases = await getAllCommerceCases();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar">
            <div>
              <Link href="/" className="btn-quiet" style={{ marginBottom: 8 }}>
                <ArrowLeft size={15} strokeWidth={1.75} />
                Trust Case Queue
              </Link>
              <div className="section-label">
                <FilePlus2 size={14} strokeWidth={1.75} />
                New Case
              </div>
              <h1 className="topbar-title">Create Commerce Case</h1>
              <p className="topbar-subtitle">
                Set up the agreement, parties, and acceptance criteria for the audit desk workflow.
              </p>
            </div>
          </header>

          <section className="two-column">
            <NewCaseForm seedCases={seedCases} />

            <aside
              className="inspector"
              style={{
                display: "grid",
                gap: 16,
                position: "sticky",
                top: 22,
                alignSelf: "start",
              }}
            >
              <div>
                <div className="section-label">
                  <ShieldCheck size={14} strokeWidth={1.75} />
                  MVP Boundary
                </div>
                <p className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Cases are stored in this browser first. The same shape can later be written to
                  GenLayer without changing the screen layout.
                </p>
              </div>

              <div>
                <div className="section-label">
                  <LayoutPanelLeft size={14} strokeWidth={1.75} />
                  After Creation
                </div>
                <p className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                  Open the case, submit evidence URLs, then run verification to generate the first
                  settlement recommendation.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
