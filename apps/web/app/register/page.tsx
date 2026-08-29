"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function normalizeErrorMessage(
  message: unknown,
  fallback = "Request failed",
): string {
  if (typeof message === "string" && message.trim()) return message;

  if (Array.isArray(message)) {
    const joined = message.map(String).filter(Boolean).join(", ");
    return joined || fallback;
  }

  if (message && typeof message === "object") {
    const maybe = (message as { message?: unknown }).message;
    return normalizeErrorMessage(maybe, fallback);
  }

  return fallback;
}

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return normalizeErrorMessage(error, fallback);
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL is missing.");
      }

      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          normalizeErrorMessage(
            (data as { message?: unknown })?.message,
            "Register failed",
          ),
        );
      }

      localStorage.setItem("accessToken", data.accessToken);
      router.push("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Register failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      description="Register to start your interview practice."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-black">Name</label>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-black">Email</label>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-black">Password</label>
          <input
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-sm text-black md:text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-black underline">
          Login
        </a>
      </p>
    </AuthCard>
  );
}