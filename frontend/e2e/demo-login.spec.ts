import { expect, test } from "@playwright/test";

test.describe("Demo login flow", () => {
  test("login page renders and shows demo button", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "LexNet Operator Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /demo operator cookie/i })).toBeVisible();
  });

  test("demo login sets cookie and redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /demo operator cookie/i }).click();

    // Should redirect to / after successful login
    await page.waitForURL("/");
    expect(page.url()).toMatch(/localhost:3002\/$/);
  });

  test("dashboard loads in developer mode (no auth required)", async ({ page }) => {
    // In developer mode (default local dev, no LEXNET_ENABLE_DEMO_PRIVATE_API),
    // the gate is open and / is accessible without a cookie.
    await page.context().clearCookies();
    await page.goto("/");

    // Should NOT redirect to login in developer mode
    expect(page.url()).not.toContain("/login");
  });

  test("demo login API returns ok for valid operator", async ({ page }) => {
    const response = await page.request.post("/api/auth/demo-login", {
      data: { operatorId: "operator-demo" },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.operatorId).toBe("operator-demo");
  });

  test("demo login API rejects unknown operator", async ({ page }) => {
    const response = await page.request.post("/api/auth/demo-login", {
      data: { operatorId: "operator-unknown" },
    });
    expect(response.status()).toBe(401);
  });
});
