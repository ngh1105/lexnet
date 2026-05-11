import { NextResponse } from "next/server";
import { createNonce } from "@/lib/platform/nonce";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const nonce = createNonce(address);
  return NextResponse.json({ nonce });
}
