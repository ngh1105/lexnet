import { NextResponse } from "next/server";
import { appendAuditEvent, now, readStore, writeStore } from "@/lib/platform/store";

function reportFileName(reportId: string, ext: "json" | "html"): string {
  return `lexnet-report-${reportId}.${ext}`;
}

function reportHtml(report: unknown): string {
  const json = JSON.stringify(report, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><title>LexNet Verification Report</title><style>body{font-family:Georgia,serif;margin:48px;color:#111827}pre{white-space:pre-wrap;background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-radius:12px}</style></head><body><h1>LexNet Verification Report</h1><pre>${json}</pre><script>window.print()</script></body></html>`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") || "json";
  const store = await readStore();
  const reports = store.reports.filter((entry) => entry.caseId === id);
  const latest = reports.at(-1);
  if (!latest) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  if (format === "download" || format === "print") {
    latest.status = "exported";
    latest.exportedAt = now();
    await appendAuditEvent(store, {
      workspaceId: latest.workspaceId,
      caseId: id,
      actor: "system",
      action: "report.exported",
      payload: { reportId: latest.id, format },
    });
    await writeStore(store);

    if (format === "print") {
      return new NextResponse(reportHtml(latest), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${reportFileName(latest.id, "html")}"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(latest, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${reportFileName(latest.id, "json")}"`,
      },
    });
  }

  return NextResponse.json({ report: latest });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: "draft" | "reviewed"; reviewerNotes?: string; actor?: string } | null;
  const store = await readStore();
  const reports = store.reports.filter((entry) => entry.caseId === id);
  const latest = reports.at(-1);
  if (!latest) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  if (body?.status) latest.status = body.status;
  if (typeof body?.reviewerNotes === "string") latest.reviewerNotes = body.reviewerNotes.slice(0, 2000);
  await appendAuditEvent(store, {
    workspaceId: latest.workspaceId,
    caseId: id,
    actor: body?.actor || "system",
    action: "report.reviewed",
    payload: { reportId: latest.id, status: latest.status },
  });
  await writeStore(store);

  return NextResponse.json({ report: latest });
}
