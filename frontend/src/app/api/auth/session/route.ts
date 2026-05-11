import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/platform/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    return NextResponse.json({ session });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
