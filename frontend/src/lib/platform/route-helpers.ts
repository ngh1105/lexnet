import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/platform/auth";
import { resolveUserId } from "@/lib/platform/rbac";

export async function withAuth(
  request: Request,
  handler: (userId: string, address: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const session = await requireAuth(request);
    const userId = await resolveUserId(session.userId);
    return handler(userId, session.address);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
