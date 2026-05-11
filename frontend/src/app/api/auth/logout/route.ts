import { NextResponse } from "next/server";
import { destroySession, getSessionTokenFromRequest } from "@/lib/platform/auth";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) await destroySession(token);
  return NextResponse.json({ ok: true });
}
