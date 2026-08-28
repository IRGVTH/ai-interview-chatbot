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

type Interview = {
  id: string;
  title: string;
  position: string;
  experienceLevel: string;
  difficulty: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const me = await apiFetch<User>("/users/me", { token });
        const myInterviews = await apiFetch<Interview[]>("/interviews", {
          token,
        });

        setUser(me);
        setInterviews(myInterviews);
      } catch (err: unknown) {
        const message = getErrorMessage(err, "Failed to load dashboard");
        setError(message);

        if (message.toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router, token]);

  const totalInterviews = interviews.length;
  const draftCount = interviews.filter((item) => item.status === "draft").length;
  const activeCount = interviews.filter((item) => item.status === "active").length;
  const completedCount = interviews.filter(
    (item) => item.status === "completed",
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="grid gap-4 md:grid-cols-4">
            <div className="h-24 rounded-2xl bg-gray-200" />
            <div className="h-24 rounded-2xl bg-gray-200" />
            <div className="h-24 rounded-2xl bg-gray-200" />
            <div className="h-24 rounded-2xl bg-gray-200" />
          </div>
          <div className="h-80 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }}
        className="fixed right-4 top-4 z-50 rounded-xl border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
      >
        Logout
      </button>

      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">Welcome back</p>
              <h1 className="text-3xl font-bold">
                {user?.name || user?.email || "User"}
              </h1>
              <p className="mt-1 text-gray-600">
                Practice interviews, track progress, and improve with AI.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/interviews")}
                className="rounded-xl bg-black px-4 py-2 text-white"
              >
                New Interview
              </button>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="rounded-xl border px-4 py-2"
              >
                Open Chat
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Interviews" value={totalInterviews} />
          <StatCard label="Draft" value={draftCount} />
          <StatCard label="Active" value={activeCount} />
          <StatCard label="Completed" value={completedCount} />
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Interviews</h2>
              <p className="text-sm text-gray-500">
                Your latest interview sessions
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/interviews")}
              className="text-sm font-medium text-black underline"
            >
              View all
            </button>
          </div>

          {interviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
              No interviews yet. Create your first interview to start practicing.
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.slice(0, 5).map((interview) => (
                <div
                  key={interview.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{interview.title}</h3>
                    <p className="text-sm text-gray-500">
                      {interview.position} • {interview.experienceLevel} •{" "}
                      {interview.difficulty}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase">
                      {interview.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push("/chat")}
                      className="rounded-xl border px-3 py-2 text-sm"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

