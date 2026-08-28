"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Interview = {
  id: string;
  title: string;
  position: string;
  experienceLevel: string;
  difficulty: string;
  status: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  title: string | null;
  model: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  interview: {
    id: string;
    title: string;
    position: string;
    experienceLevel: string;
    difficulty: string;
    status: string;
  };
  messages: ChatMessage[];
  evaluation: ChatEvaluation | null;
};

type ChatEvaluation = {
  id: string;
  sessionId: string;
  communication: number;
  technical: number;
  confidence: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  createdAt: string;
  updatedAt: string;
};

type ReportOverview = {
  totalInterviews: number;
  totalSessions: number;
  totalMessages: number;
  totalEvaluations: number;
  averageOverall: number;
  latestSession: ChatSession | null;
  interviews: Interview[];
  sessions: ChatSession[];
  evaluations: ChatEvaluation[];
};

export function ReportPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string>("");
  const [error, setError] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  async function loadReport() {
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const overview = await apiFetch<ReportOverview>("/report/overview", {
        token,
      });
      setData(overview);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
      if (String(err.message).toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("accessToken");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, token]);

  async function generateScore(sessionId: string) {
    if (!token) return;

    setEvaluatingId(sessionId);
    setError("");

    try {
      await apiFetch(`/report/sessions/${sessionId}/evaluate`, {
        method: "POST",
        token,
      });

      await loadReport();
    } catch (err: any) {
      setError(err.message || "Failed to evaluate session");
    } finally {
      setEvaluatingId("");
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
            <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
            <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
            <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  const latestEvaluation = data.evaluations[0] || null;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Progress report</p>
          <h1 className="mt-1 text-3xl font-bold">Interview Report</h1>
          <p className="mt-2 text-gray-600">
            Track your practice and generate AI-based scoring for each session.
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Interviews" value={data.totalInterviews} />
          <StatCard label="Total Sessions" value={data.totalSessions} />
          <StatCard label="Total Messages" value={data.totalMessages} />
          <StatCard label="Average Overall" value={data.averageOverall} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">AI Scoring</h2>
            <p className="text-sm text-gray-500">
              Generate and review scoring for chat sessions
            </p>

            <div className="mt-5 space-y-3">
              {data.sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-500">
                  No sessions yet.
                </div>
              ) : (
                data.sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {session.title || "Practice Chat"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {session.interview.position} • {session.interview.difficulty}
                        </p>
                      </div>

                      <button
                        onClick={() => generateScore(session.id)}
                        disabled={evaluatingId === session.id}
                        className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {evaluatingId === session.id
                          ? "Scoring..."
                          : session.evaluation
                          ? "Re-score"
                          : "Generate score"}
                      </button>
                    </div>

                    {session.evaluation ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <MiniStat label="Communication" value={session.evaluation.communication} />
                        <MiniStat label="Technical" value={session.evaluation.technical} />
                        <MiniStat label="Confidence" value={session.evaluation.confidence} />
                        <MiniStat label="Overall" value={session.evaluation.overall} />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-gray-500">
                        No AI score yet.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Latest Evaluation</h2>
            <p className="text-sm text-gray-500">Summary from Gemini scoring</p>

            {latestEvaluation ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-medium">Feedback</p>
                  <p className="mt-2 text-sm text-gray-700">
                    {latestEvaluation.feedback}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Strengths</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {latestEvaluation.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-medium">Improvements</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {latestEvaluation.improvements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed p-6 text-center text-gray-500">
                No evaluation yet. Generate one from a session.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}