import { NextResponse } from "next/server";
import { appendAuditEvent, readStore, writeStore } from "@/lib/platform/store";
import { buildPassport, ensurePlatformDefaults } from "@/lib/platform/ops";

export async function GET(request: Request) {
  const store = await readStore();
  ensurePlatformDefaults(store);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const passports = workspaceId ? store.passports.filter((entry) => entry.workspaceId === workspaceId) : store.passports;
  return NextResponse.json({ passports });
}

export async function POST(request: Request) {
  const { withAuth } = await import("@/lib/platform/route-helpers");
  return withAuth(request, async (userId, address) => {
    const body = await request.json().catch(() => null) as { workspaceId?: string; subject?: string } | null;
    if (!body?.subject) return NextResponse.json({ error: "subject is required" }, { status: 400 });
    const store = await readStore();
    ensurePlatformDefaults(store);
    const workspaceId = body.workspaceId || "default";
    const passport = buildPassport(store, workspaceId, body.subject.toLowerCase());
    const existingIndex = store.passports.findIndex((entry) => entry.id === passport.id);
    if (existingIndex >= 0) store.passports[existingIndex] = passport;
    else store.passports.push(passport);
    await appendAuditEvent(store, { workspaceId, actor: userId, action: "passport.published", payload: { passportId: passport.id, score: passport.score } });
    await writeStore(store);
    return NextResponse.json({ passport }, { status: 201 });
  });
}
