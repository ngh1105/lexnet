import { readFile } from "node:fs/promises";

import {
  createPostgresPlatformStoreRepository,
  ensurePlatformStoreSchema,
} from "../src/lib/platform/postgres-store";
import { isPlatformStore } from "../src/lib/platform/store";
import { DEFAULT_PLATFORM_STORE_PATH } from "../src/lib/platform/store";

async function main(): Promise<void> {
  const databaseUrl = process.env.LEXNET_MANAGED_DATABASE_URL;
  if (!databaseUrl) {
    console.error("LEXNET_MANAGED_DATABASE_URL is not set.");
    process.exit(1);
  }

  const sourcePath = process.argv[2] ?? DEFAULT_PLATFORM_STORE_PATH;
  const raw = await readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isPlatformStore(parsed)) {
    console.error(`Invalid platform store at ${sourcePath}`);
    process.exit(1);
  }

  await ensurePlatformStoreSchema(databaseUrl);
  const repo = createPostgresPlatformStoreRepository({ databaseUrl });
  await repo.write(parsed);

  console.log(`Imported ${sourcePath} into postgres (${parsed.cases.length} cases, ${parsed.publishedPassports.length} passports).`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
