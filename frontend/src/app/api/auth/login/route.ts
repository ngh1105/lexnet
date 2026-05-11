import { NextResponse } from "next/server";
import { getDb } from "@/lib/platform/db";
import * as schema from "@/lib/platform/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/platform/auth";
import { createId, now } from "@/lib/platform/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { address?: string } | null;
  if (!body?.address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const address = body.address.toLowerCase();
  const db = getDb();

  let user = db.select().from(schema.users).where(eq(schema.users.address, address)).get();
  if (!user) {
    user = { id: createId("user"), address, createdAt: now() };
    db.insert(schema.users).values(user).run();
  }

  const session = await createSession(user.id, address);
  return NextResponse.json({ session: { token: session.token, expiresAt: session.expiresAt }, user: { id: user.id, address: user.address } }, { status: 201 });
}
