"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
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
  const draftCount = interviews.filter(
    (item) => item.status === "draft",
  ).length;
  const activeCount = interviews.filter(
    (item) => item.status === "active",
  ).length;
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
    <div>
      <div className="page-heading">
        <div>
          <h1>
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}{" "}
            <span className="text-[#8aab71]">.</span>
          </h1>
          <p>Let’s take the next step toward your next opportunity.</p>
        </div>
        <Link href="/interviews" className="button-primary">
          <Icon name="plus" /> New interview
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">A LITTLE PRACTICE GOES A LONG WAY</p>
          <h2>
            Your next interview.
            <br />
            <em>Your best first impression.</em>
          </h2>
          <p>
            Practice real questions, sharpen your answers, and build confidence
            with your AI interview partner.
          </p>
          <Link href="/interviews" className="button-primary">
            Start practicing <Icon name="arrow" />
          </Link>
        </div>
        <div className="practice-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card">
            <span className="brand-mark">
              <Icon name="spark" />
            </span>
            <div className="art-line" />
            <div className="art-line short" />
            <div className="art-line" />
          </div>
          <span className="art-tag">
            <Icon name="check" /> One step more confident
          </span>
        </div>
      </section>
      <section className="stats-grid" aria-label="Interview statistics">
        <StatCard
          label="Total interviews"
          value={totalInterviews}
          icon="briefcase"
          caption="Your practice journey"
        />
        <StatCard
          label="Ready to start"
          value={draftCount}
          icon="clock"
          caption="Draft interviews"
        />
        <StatCard
          label="In progress"
          value={activeCount}
          icon="chat"
          caption="Keep the conversation going"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon="check"
          caption="Every session is a step forward"
        />
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent interviews</h2>
              <p>Pick up where you left off</p>
            </div>
            <Link href="/interviews" className="text-link">
              View all <Icon name="arrow" width="15" />
            </Link>
          </div>
          {interviews.length === 0 ? (
            <div className="empty-state">
              <Icon name="briefcase" />
              <h3>Your next chapter starts here</h3>
              <p>
                Choose a role and a difficulty level. We’ll help you make the
                first practice session count.
              </p>
              <Link href="/interviews" className="button-secondary">
                <Icon name="plus" /> Create your first interview
              </Link>
            </div>
          ) : (
            [...interviews]
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              )
              .slice(0, 5)
              .map((interview) => (
                <div key={interview.id} className="interview-row">
                  <span className="row-icon">
                    <Icon name="briefcase" />
                  </span>
                  <div className="row-details">
                    <h3>{interview.title}</h3>
                    <p>
                      {interview.position} · {interview.experienceLevel} years ·{" "}
                      {interview.difficulty}
                    </p>
                  </div>
                  <span className="status-pill" data-status={interview.status}>
                    {interview.status}
                  </span>
                  <Link
                    href={`/interviews?interviewId=${encodeURIComponent(interview.id)}`}
                    className="row-open"
                    aria-label={`Open ${interview.title}`}
                  >
                    <Icon name="arrow" width="17" />
                  </Link>
                </div>
              ))
          )}
        </section>
        <aside className="panel guide-panel">
          <p className="eyebrow">MAKE IT COUNT</p>
          <h2>A simple path to ready.</h2>
          <div className="guide-step">
            <span>01</span>
            <div>
              <h3>Make it yours</h3>
              <p>Choose your target role and experience level.</p>
            </div>
          </div>
          <div className="guide-step">
            <span>02</span>
            <div>
              <h3>Talk it through</h3>
              <p>Practice naturally, with text or your voice.</p>
            </div>
          </div>
          <div className="guide-step">
            <span>03</span>
            <div>
              <h3>Find your next step</h3>
              <p>Review your feedback and keep improving.</p>
            </div>
          </div>
          <Link href="/report" className="text-link">
            Explore your reports <Icon name="arrow" width="15" />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  caption,
}: {
  label: string;
  value: number;
  icon: IconName;
  caption: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon name={icon} width="17" height="17" />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-caption">{caption}</span>
    </div>
  );
}
