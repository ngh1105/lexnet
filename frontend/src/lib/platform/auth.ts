import crypto from "node:crypto";
import { getDb } from "./db";
import * as schema from "./schema";
import { eq, and, gt } from "drizzle-orm";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string, address: string): Promise<{ id: string; token: string; expiresAt: string }> {
  const db = getDb();
  const id = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const token = generateToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.insert(schema.sessions).values({ id, userId, token, address, createdAt: now, expiresAt }).run();
  return { id, token, expiresAt };
}

export async function validateSession(token: string): Promise<{ userId: string; address: string } | null> {
  if (!token) return null;
  const db = getDb();
  const now = new Date().toISOString();
  const rows = db.select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.token, token), gt(schema.sessions.expiresAt, now)))
    .all();

  if (rows.length === 0) return null;
  return { userId: rows[0].userId, address: rows[0].address };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  const db = getDb();
  db.delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
}

export async function cleanExpiredSessions(): Promise<number> {
  const db = getDb();
  const nowVal = new Date().toISOString();
  const all = db.select().from(schema.sessions).all();
  let count = 0;
  for (const s of all) {
    if (s.expiresAt < nowVal) {
      db.delete(schema.sessions).where(eq(schema.sessions.id, s.id)).run();
      count++;
    }
  }
  return count;
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireAuth(request: Request): Promise<{ userId: string; address: string }> {
  const token = getSessionTokenFromRequest(request);
  if (!token) throw new AuthError("Missing authorization token", 401);
  const session = await validateSession(token);
  if (!session) throw new AuthError("Invalid or expired session", 401);
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
