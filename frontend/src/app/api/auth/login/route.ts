import { NextResponse } from "next/server";
import { getDb } from "@/lib/platform/db";
import * as schema from "@/lib/platform/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/platform/auth";
import { createId, now } from "@/lib/platform/store";
import { getNonce, verifySignature } from "@/lib/platform/nonce";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    address?: string;
    nonce?: string;
    signature?: string;
  } | null;

  if (!body?.address || !body?.nonce || !body?.signature) {
    return NextResponse.json({ error: "address, nonce, and signature are required" }, { status: 400 });
  }

  const address = body.address.toLowerCase();

  const storedNonce = getNonce(address);
  if (!storedNonce || storedNonce !== body.nonce) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
  }

  if (!verifySignature(address, body.nonce, body.signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const db = getDb();

  let user = db.select().from(schema.users).where(eq(schema.users.address, address)).get();
  if (!user) {
    user = { id: createId("user"), address, createdAt: now() };
    db.insert(schema.users).values(user).run();
  }

  const session = await createSession(user.id, address);
  return NextResponse.json({
    session: { token: session.token, expiresAt: session.expiresAt },
    user: { id: user.id, address: user.address },
  }, { status: 201 });
}
