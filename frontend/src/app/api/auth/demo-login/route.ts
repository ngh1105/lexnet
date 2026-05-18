import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_OPERATOR_IDS = ["operator-demo"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { operatorId?: string };

  try {
    body = (await request.json()) as { operatorId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { operatorId } = body;

  if (!operatorId || !DEMO_OPERATOR_IDS.includes(operatorId)) {
    return NextResponse.json({ error: "Invalid operator ID." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, operatorId });

  response.cookies.set("lexnet-operator", operatorId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
