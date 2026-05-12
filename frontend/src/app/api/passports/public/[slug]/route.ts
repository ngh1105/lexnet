import { jsonError, jsonOk } from "@/lib/platform/api";
import { findPublicPassport } from "@/lib/platform/passports";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const store = await readPlatformStore();
  const passport = findPublicPassport(store.publishedPassports, slug);

  if (!passport) {
    return jsonError("Passport not found.", 404);
  }

  return jsonOk({ passport });
}
