"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReportOverview = {
  totalInterviews: number;
  totalSessions: number;
  totalMessages: number;
  totalEvaluations: number;
  averageOverall: number;
};

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [me, overview] = await Promise.all([
          apiFetch<User>("/users/me", { token }),
          apiFetch<ReportOverview>("/report/overview", { token }).catch(
            () => null,
          ),
        ]);

        setUser(me);
        setName(me.name || "");
        setEmail(me.email || "");
        setReport(overview);
      } catch (err: unknown) {
        const message = getErrorMessage(err, "Failed to load profile");
        setError(message);

        if (message.toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router, token]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: {
        name?: string;
        email?: string;
        password?: string;
      } = {
        name,
        email,
      };

      if (password.trim()) {
        payload.password = password;
      }

      const updated = await apiFetch<User>("/users/me", {
        method: "PATCH",
        token,
        body: payload,
      });

      setUser(updated);
      setName(updated.name || "");
      setEmail(updated.email || "");
      setPassword("");
      setSuccess("Profile updated successfully");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-80 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-80 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-black md:text-gray-500">User profile</p>
        <h1 className="mt-1 text-3xl font-bold text-black">Profile</h1>
        <p className="mt-2 text-black md:text-gray-600">
          View your account information and update your details.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-black">Account details</h2>

          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <Field
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Your name"
            />

            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
            />

            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Leave blank if you do not want to change it"
              type="password"
            />

            <Field
              label="User ID"
              value={user?.id || ""}
              onChange={() => {}}
              disabled
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Created at"
                value={user ? new Date(user.createdAt).toLocaleString() : ""}
                onChange={() => {}}
                disabled
              />
              <Field
                label="Updated at"
                value={user ? new Date(user.updatedAt).toLocaleString() : ""}
                onChange={() => {}}
                disabled
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-black">Practice summary</h2>
          <p className="text-sm text-black md:text-gray-500">
            Quick overview of your interview activity
          </p>

          <div className="mt-5 grid gap-4">
            <StatCard
              label="Total Interviews"
              value={report?.totalInterviews ?? 0}
            />
            <StatCard
              label="Total Sessions"
              value={report?.totalSessions ?? 0}
            />
            <StatCard
              label="Total Messages"
              value={report?.totalMessages ?? 0}
            />
            <StatCard
              label="Average Score"
              value={report?.averageOverall ?? 0}
            />
          </div>

          <div className="mt-6 rounded-2xl border p-4">
            <h3 className="font-semibold text-black">Profile actions</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/interviews")}
                className="rounded-xl border px-4 py-2 text-sm text-black"
              >
                Go to Interviews
              </button>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="rounded-xl border px-4 py-2 text-sm text-black"
              >
                Go to Chat
              </button>
              <button
                type="button"
                onClick={() => router.push("/report")}
                className="rounded-xl border px-4 py-2 text-sm text-black"
              >
                Go to Report
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-black">
        {label}
      </label>
      <input
        className="w-full rounded-xl border px-3 py-2 text-black outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50 md:text-gray-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-sm text-black md:text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-black">{value}</p>
    </div>
  );
}