import { ensurePlatformStoreSchema } from "../src/lib/platform/postgres-store";

async function main(): Promise<void> {
  const databaseUrl = process.env.LEXNET_MANAGED_DATABASE_URL;
  if (!databaseUrl) {
    console.error("LEXNET_MANAGED_DATABASE_URL is not set.");
    process.exit(1);
  }

  await ensurePlatformStoreSchema(databaseUrl);
  console.log("Platform store schema ensured (table: platform_store).");
  process.exit(0);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
