"use client";

import { useState } from "react";
import { DEMO_OPERATOR_ID } from "@/lib/platform/constants";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoLogin() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatorId: DEMO_OPERATOR_ID }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Login failed." }));
        setError(data.error ?? "Login failed.");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-gray-900">LexNet Operator Login</h1>
        <p className="mb-6 text-sm text-gray-600">
          Demo mode is active. Click below to authenticate as the demo operator.
        </p>
        {error && (
          <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Set demo operator cookie"}
        </button>
      </div>
    </main>
  );
}
