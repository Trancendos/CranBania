"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
      >
        <h1 className="mb-4 text-xl font-bold tracking-tight">Login to CranBania</h1>

        {error && (
          <div className="mb-4 rounded bg-red-950/30 p-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="apiKey" className="mb-2 block text-sm text-[var(--muted)]">
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Enter CRANBANIA_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Login
        </button>
      </form>
    </div>
  );
}
