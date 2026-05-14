import { seedDemoPlatformStore } from "../src/lib/platform/demo-seed";

async function main() {
  const store = await seedDemoPlatformStore();
  const publicPassport = store.publishedPassports.find((passport) => passport.publishedAt);

  console.log(`Seeded LexNet demo store with ${store.cases.length} cases, ${store.queue.length} queue items, and ${store.publishedPassports.length} passports.`);
  if (publicPassport) {
    console.log(`Public passport: /passport/${publicPassport.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
