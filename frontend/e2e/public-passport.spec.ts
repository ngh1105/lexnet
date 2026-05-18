import { expect, test } from "@playwright/test";

// Slugs derived from demo seed wallet addresses (buyer: 0x4F9A...B001, seller: 0x7ED2...5001)
const BUYER_SLUG = "buyer-0x4f9a-lexnet-d86156e8";
const SELLER_SLUG = "seller-0x7ed2-lexnet-2b4e67e0";

test.describe("Public passport page", () => {
  test("buyer passport renders trust level and metrics", async ({ page }) => {
    await page.goto(`/passport/${BUYER_SLUG}`);

    await expect(page.getByText("Public Trust Passport")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(page.getByText("Verified Cases")).toBeVisible();
    await expect(page.getByText("Average Score")).toBeVisible();
    await expect(page.getByText("Referenced Value")).toBeVisible();

    // Privacy notice chips
    await expect(page.getByText("No raw evidence")).toBeVisible();
    await expect(page.getByText("No private case IDs")).toBeVisible();
  });

  test("seller passport renders with trust metrics", async ({ page }) => {
    await page.goto(`/passport/${SELLER_SLUG}`);

    await expect(page.getByText("Public Trust Passport")).toBeVisible();
    await expect(page.getByText("Verified Cases")).toBeVisible();
    // Seller has risk flags from the revision case in demo seed
    await expect(page.getByText("Risk Flags").or(page.getByText("No active risk flags"))).toBeVisible();
  });

  test("unknown slug shows not-found page", async ({ page }) => {
    await page.goto("/passport/does-not-exist-slug");
    // Next.js not-found page — check it doesn't render passport content
    await expect(page.getByText("Public Trust Passport")).not.toBeVisible();
  });

  test("passport slug shown in footer", async ({ page }) => {
    await page.goto(`/passport/${BUYER_SLUG}`);
    await expect(page.getByText(`Passport slug ${BUYER_SLUG}`)).toBeVisible();
  });
});
