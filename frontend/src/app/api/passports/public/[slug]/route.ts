import { NextResponse } from "next/server";
import { readStore } from "@/lib/platform/store";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await readStore();
  const passport = store.passports.find((entry) => entry.publicSlug === slug && entry.status === "published");
  if (!passport) return NextResponse.json({ error: "Passport not found" }, { status: 404 });
  const { subject: _subject, ...safePassport } = passport;
  return NextResponse.json({ passport: safePassport });
}
