import { resetDemoPlatformStore } from "../src/lib/platform/demo-seed";

async function main() {
  await resetDemoPlatformStore();
  console.log("Removed .lexnet-data/store.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
