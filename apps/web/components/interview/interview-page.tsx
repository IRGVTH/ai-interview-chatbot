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

type CreateInterviewForm = {
  title: string;
  position: string;
  experienceLevel: string;
  difficulty: string;
  summary: string;
};

const POSITION_OPTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "Web Developer",
  "UI/UX Designer",
  "QA Tester",
  "DevOps Engineer",
  "System Analyst",
  "Business Analyst (IT)",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cybersecurity Analyst",
  "Network Engineer",
  "Cloud Engineer",
  "Database Administrator",
];

export function InterviewPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>("");

  const [resumeName, setResumeName] = useState<string>("");

  const [form, setForm] = useState<CreateInterviewForm>({
    title: "",
    position: "Frontend Developer",
    experienceLevel: "0-1",
    difficulty: "easy",
    summary: "",
  });

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    async function loadInterviews() {
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const data = await apiFetch<Interview[]>("/interviews", { token });
        setInterviews(data);
        if (data.length > 0) {
          setSelectedInterviewId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load interviews");
        if (String(err.message).toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    loadInterviews();
  }, [router, token]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setCreating(true);
    setError("");

    try {
      const created = await apiFetch<Interview>("/interviews", {
        method: "POST",
        token,
        body: form,
      });

      setInterviews((prev) => [created, ...prev]);
      setSelectedInterviewId(created.id);
      setForm({
        title: "",
        position: "Frontend Developer",
        experienceLevel: "0-1",
        difficulty: "easy",
        summary: "",
      });
      setResumeName("");
    } catch (err: any) {
      setError(err.message || "Failed to create interview");
    } finally {
      setCreating(false);
    }
  }

  async function handleStartChat() {
    if (!token || !selectedInterviewId) return;

    try {
      const session = await apiFetch<{ id: string }>("/chat/sessions", {
        method: "POST",
        token,
        body: {
          interviewId: selectedInterviewId,
          title: "Practice Chat",
        },
      });

      router.push(`/chat?sessionId=${session.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create chat session");
    }
  }
async function handleDeleteInterview(interviewId: string) {
  if (!token) return;

  const confirmed = window.confirm("Delete this interview?");
  if (!confirmed) return;

  try {
    await apiFetch(`/interviews/${interviewId}`, {
      method: "DELETE",
      token,
    });

    setInterviews((prev) => prev.filter((item) => item.id !== interviewId));

    setSelectedInterviewId((prevSelected) => {
      if (prevSelected !== interviewId) return prevSelected;
      const remaining = interviews.filter((item) => item.id !== interviewId);
      return remaining[0]?.id ?? "";
    });
  } catch (err: any) {
    setError(err.message || "Failed to delete interview");
  }
}
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-96 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Interview setup</p>
          <h1 className="mt-1 text-3xl font-bold">Manage your interviews</h1>
          <p className="mt-2 text-gray-600">
            Create a new interview, pick one from your list, and start a chat
            session with Gemini.
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Create new interview</h2>

            <form className="mt-5 space-y-4" onSubmit={handleCreate}>
              <Field
                label="Title"
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
                placeholder="Frontend Interview"
              />

              <SelectField
                label="Position"
                value={form.position}
                onChange={(value) => setForm({ ...form, position: value })}
                options={POSITION_OPTIONS.map((item) => ({
                  label: item,
                  value: item,
                }))}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Experience"
                  value={form.experienceLevel}
                  onChange={(value) =>
                    setForm({ ...form, experienceLevel: value })
                  }
                  options={[
                    { label: "0-1 Year", value: "0-1" },
                    { label: "1-3 Years", value: "1-3" },
                    { label: "3+ Years", value: "3+" },
                  ]}
                />

                <SelectField
                  label="Difficulty"
                  value={form.difficulty}
                  onChange={(value) => setForm({ ...form, difficulty: value })}
                  options={[
                    { label: "Easy", value: "easy" },
                    { label: "Medium", value: "medium" },
                    { label: "Hard", value: "hard" },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Summary</label>
                <textarea
                  className="min-h-28 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  placeholder="Write short notes about what the interview should focus on..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Resume
                </label>

                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-6 text-sm text-gray-600 hover:bg-gray-50">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setResumeName(file ? file.name : "");
                    }}
                  />
                  <span>Click to upload resume</span>
                </label>

                {resumeName ? (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected file: <span className="font-medium">{resumeName}</span>
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">
                    PDF, DOC, DOCX only
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create interview"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Your interviews</h2>
                <p className="text-sm text-gray-500">
                  Select one to start practicing
                </p>
              </div>

              <button
                onClick={handleStartChat}
                disabled={!selectedInterviewId}
                className="rounded-xl border px-4 py-2 disabled:opacity-50"
              >
                Start chat
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {interviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
                  No interviews yet. Create one on the left.
                </div>
              ) : (
               interviews.map((interview) => {
  const isSelected = selectedInterviewId === interview.id;

  return (
    <div
      key={interview.id}
      onClick={() => setSelectedInterviewId(interview.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setSelectedInterviewId(interview.id);
        }
      }}
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
        isSelected
          ? "border-black bg-gray-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{interview.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {interview.position} • {interview.experienceLevel} • {interview.difficulty}
          </p>
          {interview.summary ? (
            <p className="mt-2 text-sm text-gray-600">{interview.summary}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase">
            {interview.status}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteInterview(interview.id);
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
})
                  
                
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}