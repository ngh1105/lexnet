import { jsonError, jsonOk } from "@/lib/platform/api";
import { findPublicPassport } from "@/lib/platform/passports";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const store = await readPlatformStore();
    const passport = findPublicPassport(store.publishedPassports, slug);

    if (!passport) {
      return jsonError("Passport not found.", 404);
    }

    return jsonOk({ passport });
  } catch (error) {
    console.error("Unable to read public passport", error);
    return jsonError("Unable to read public passport.", 500);
  }
}
