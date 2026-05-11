import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/platform/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.LEXNET_DB_PATH || ".lexnet-data/lexnet.db",
  },
});
