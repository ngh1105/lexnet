"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";

interface SessionData {
  token: string;
  expiresAt: string;
  userId: string;
  address: string;
}

const SESSION_KEY = "lexnet_session";

export function useSession() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setSession(null);
      return;
    }

    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionData;
        if (parsed.address === address.toLowerCase() && new Date(parsed.expiresAt) > new Date()) {
          setSession(parsed);
          return;
        }
      } catch {}
      localStorage.removeItem(SESSION_KEY);
    }

    login(address);
  }, [address, isConnected]);

  const login = useCallback(async (addr: string) => {
    setLoading(true);
    try {
      // 1. Get nonce from server
      const nonceRes = await fetch(`/api/auth/nonce?address=${addr}`);
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2. Sign nonce with wallet
      const signature = await signMessageAsync({ message: nonce });

      // 3. Login with signature
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, nonce, signature }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      const sessionData: SessionData = {
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        userId: data.user.id,
        address: data.user.address,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      setSession(sessionData);
    } catch (err) {
      console.error("Session login failed:", err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [signMessageAsync]);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.token}` },
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, [session]);

  return { session, loading, isAuthenticated: !!session, logout };
}
