"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { RubricGuide } from "./rubric-guide";
import {
  normalizeOverview,
  isEvaluationCurrent,
  type Overview,
} from "./report-data";
function message(err: unknown) {
  return err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่";
}
export function ReportPage() {
  const router = useRouter();
  const token = useMemo(
    () =>
      typeof window === "undefined"
        ? null
        : localStorage.getItem("accessToken"),
    [],
  );
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    let live = true;
    if (!token) {
      router.push("/login");
      return;
    }
    void apiFetch<unknown>("/report/overview", { token })
      .then((response) => {
        const r = normalizeOverview(response);
        if (live) {
          setData(r);
          const requested = new URLSearchParams(window.location.search).get(
            "sessionId",
          );
          setSelected(
            r.sessions.find((s) => s.id === requested)?.id ??
              r.sessions[0]?.id ??
              "",
          );
        }
      })
      .catch((err) => {
        if (live) setError(message(err));
      });
    return () => {
      live = false;
    };
  }, [token, router]);
  async function score(id: string) {
    if (!token || busy) return;
    setBusy(id);
    setError("");
    try {
      await apiFetch(`/report/sessions/${id}/evaluate`, {
        method: "POST",
        token,
      });
      setData(
        normalizeOverview(
          await apiFetch<unknown>("/report/overview", { token }),
        ),
      );
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  }
  async function download(id: string) {
    if (!token || busy) return;
    setBusy(`pdf-${id}`);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/report/sessions/${id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30000),
        },
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "ส่งออก PDF ไม่สำเร็จ");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-report-${id}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  }
  if (!data)
    return (
      <section className="p-6" aria-live="polite">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => window.location.reload()}>ลองใหม่</button>
          </>
        ) : (
          "กำลังโหลดรายงาน…"
        )}
      </section>
    );
  const session = data.sessions.find((s) => s.id === selected);
  const e = session?.evaluation;
  const chronological = [...data.sessions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const versions = new Set(
    data.sessions.map((s) => s.evaluation?.rubricVersion).filter(Boolean),
  );
  return (
    <main className="space-y-6 text-black">
      <header>
        <h1 className="text-3xl font-bold">Interview Report</h1>
        <p>ประวัติ ผลประเมิน และพัฒนาการจากข้อมูลที่บันทึกจริง</p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Interviews", data.totalInterviews],
          ["Sessions", data.totalSessions],
          ["Messages", data.totalMessages],
          ["Average / 10", data.averageOverall ?? "ยังไม่มีคะแนน"],
          ["เกรดจากคะแนนเฉลี่ย", data.averageGrade ?? "ยังไม่มีเกรด"],
        ].map(([label, value]) => (
          <div className="rounded-xl bg-white p-4" key={String(label)}>
            <p>{label}</p>
            <strong className="text-xl">{value}</strong>
          </div>
        ))}
      </div>
      <p className="text-sm">
        ค่าเฉลี่ยใช้ผลล่าสุดที่ตรงกับบทสนทนา เกณฑ์ {data.averageRubricVersion}{" "}
        เท่านั้น ({data.excludedEvaluations} ผลไม่รวมในค่าเฉลี่ย)
        ตำแหน่งและความยากต่างกันอาจเทียบคะแนนโดยตรงไม่ได้
      </p>
      {versions.size > 1 && (
        <p role="status">
          มีเกณฑ์หลายเวอร์ชัน กรุณาประเมินด้วยเวอร์ชันเดียวกันก่อนเปรียบเทียบ
        </p>
      )}
      <p className="rounded-xl border bg-white p-4 text-sm">
        {data.gradeScale.description}
      </p>
      {data.legacyApi ? (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-900">
          กำลังแสดงผลประเมินเดิม เกรดคำนวณจากคะแนนเดิม
          ผลที่ยังไม่มีเวอร์ชันเกณฑ์ไม่รวมในค่าเฉลี่ย และยังส่งออก PDF
          แบบใหม่ไม่ได้
        </p>
      ) : (
        <RubricGuide token={token} />
      )}
      {!data.sessions.length ? (
        <p>
          ยังไม่มีประวัติ{" "}
          <Link href="/interviews" className="underline">
            เริ่มฝึกสัมภาษณ์
          </Link>
        </p>
      ) : (
        <>
          <section className="rounded-xl bg-white p-4">
            <h2 className="text-xl font-semibold">พัฒนาการและประวัติ</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "วันที่ / รอบ",
                      "ประเภท / ตำแหน่ง / ระดับ",
                      "เกณฑ์",
                      "คะแนน / 10",
                      "เกรด",
                      "เทียบรอบก่อนในบริบทเดียวกัน",
                    ].map((h) => (
                      <th key={h} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chronological.map((s, index) => {
                    const ev = s.evaluation;
                    const valid =
                      isEvaluationCurrent(s) && ev?.overall !== null;
                    const prior = chronological
                      .slice(0, index)
                      .reverse()
                      .find(
                        (p) =>
                          p.evaluation &&
                          isEvaluationCurrent(p) &&
                          p.evaluation.rubricVersion === ev?.rubricVersion &&
                          p.interview.position === s.interview.position &&
                          p.interview.interviewType ===
                            s.interview.interviewType &&
                          p.interview.difficulty === s.interview.difficulty,
                      );
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">
                          <button
                            className="underline"
                            onClick={() => setSelected(s.id)}
                          >
                            {s.interview.title}
                          </button>
                          <br />
                          {new Date(s.createdAt).toLocaleString("th-TH")}
                        </td>
                        <td className="p-2">
                          {s.interview.interviewType} / {s.interview.position} /{" "}
                          {s.interview.difficulty}
                        </td>
                        <td className="p-2">{ev?.rubricVersion ?? "—"}</td>
                        <td className="p-2">
                          {ev
                            ? `${ev.overall ?? "ยังไม่มีคะแนน"}${ev.sourceTurnVersion === null ? " (ผลเดิม)" : valid ? "" : " (ต้องประเมินใหม่)"}`
                            : "ยังไม่ประเมิน"}
                        </td>
                        <td className="p-2">
                          <strong>
                            {ev?.sourceTurnVersion === null || valid
                              ? (ev?.grade ?? "—")
                              : "—"}
                          </strong>
                        </td>
                        <td className="p-2">
                          {valid &&
                          ev?.overall != null &&
                          prior?.evaluation?.overall != null
                            ? (
                                (ev.overall ?? 0) -
                                (prior.evaluation.overall ?? 0)
                              ).toFixed(1)
                            : "ยังไม่มีรอบที่เทียบได้"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {session && (
            <section className="space-y-4 rounded-xl bg-white p-5">
              <h2 className="text-xl font-semibold">
                {session.interview.title}
              </h2>
              <p>
                {session.interview.interviewType} / {session.interview.position}{" "}
                / {session.interview.difficulty} / {session.interview.status}
              </p>
              <p className="text-sm">
                เริ่ม:{" "}
                {session.interview.startedAt
                  ? new Date(session.interview.startedAt).toLocaleString(
                      "th-TH",
                    )
                  : "—"}{" "}
                จบ:{" "}
                {session.interview.finishedAt
                  ? new Date(session.interview.finishedAt).toLocaleString(
                      "th-TH",
                    )
                  : "ยังไม่จบรอบ"}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/chat?sessionId=${session.id}`}
                  className="rounded-lg border p-2"
                >
                  ดูบทสนทนา
                </Link>
                <button
                  disabled={!!busy}
                  onClick={() => score(session.id)}
                  className="rounded-lg bg-black p-2 text-white disabled:opacity-50"
                >
                  {busy === session.id
                    ? "กำลังประเมิน…"
                    : e
                      ? "ประเมินใหม่"
                      : "Generate score"}
                </button>
                <button
                  disabled={!!busy || !e || !isEvaluationCurrent(session)}
                  onClick={() => download(session.id)}
                  className="rounded-lg border p-2 disabled:opacity-50"
                >
                  {busy === `pdf-${session.id}`
                    ? "กำลังสร้าง PDF…"
                    : "ดาวน์โหลด PDF"}
                </button>
              </div>
              {e ? (
                <>
                  <div className="flex flex-wrap items-center gap-4 rounded-xl bg-zinc-50 p-5">
                    <div>
                      <p className="text-sm">
                        {e.sourceTurnVersion === null
                          ? "เกรดจากคะแนนเดิม"
                          : "เกรดสรุปผลการฝึก"}
                      </p>
                      <strong className="text-5xl">
                        {e.sourceTurnVersion === null ||
                        isEvaluationCurrent(session)
                          ? (e.grade ?? "—")
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <p className="text-xl font-semibold">
                        คะแนนรวม {e.overall ?? "ยังไม่มีคะแนน"} / 10
                      </p>
                      <p className="text-sm">เกณฑ์ {e.rubricVersion}</p>
                    </div>
                  </div>
                  {e.sourceTurnVersion !== null &&
                    !isEvaluationCurrent(session) && (
                      <p role="status">
                        บทสนทนาเปลี่ยนแล้ว ต้องประเมินใหม่ก่อนส่งออก
                      </p>
                    )}
                  <p>
                    {e.rubricSnapshot?.anchors ??
                      "ผลเก่าที่ไม่มีรายละเอียดเกณฑ์ กรุณาประเมินใหม่"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.rubric.dimensions.map((d) => (
                      <div className="rounded-xl border p-3" key={d.key}>
                        <h3 className="font-semibold">
                          {d.label}:{" "}
                          {e[
                            d.key as
                              | "technical"
                              | "communication"
                              | "language"
                              | "confidence"
                          ] ?? "ประเมินไม่ได้"}{" "}
                          / 10
                        </h3>
                        <p>
                          {e.dimensionFeedback?.[d.key] ??
                            "ผลเดิมไม่มีคำอธิบายด้านนี้"}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p>
                    {e.rubricSnapshot?.limitation ?? data.rubric.limitation}
                  </p>
                  <h3 className="font-semibold">Feedback</h3>
                  <p>{e.feedback}</p>
                  <h3 className="font-semibold">จุดแข็ง</h3>
                  <ul className="list-disc pl-5">
                    {e.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <h3 className="font-semibold">สิ่งที่ควรปรับปรุง</h3>
                  <ul className="list-disc pl-5">
                    {e.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <h3 className="font-semibold">ตัวอย่างคำตอบที่ดีขึ้น</h3>
                  {e.exampleAnswers?.length ? (
                    e.exampleAnswers.map((a, i) => (
                      <div
                        className="space-y-2 border-t pt-3 whitespace-pre-wrap break-words"
                        key={i}
                      >
                        <p>คำถาม: {a.question}</p>
                        <p>คำตอบเดิม: {a.originalAnswer}</p>
                        <p>ตัวอย่าง: {a.answer}</p>
                      </div>
                    ))
                  ) : (
                    <p>ผลเดิมยังไม่มีตัวอย่าง กรุณาประเมินใหม่</p>
                  )}
                </>
              ) : (
                <p>ยังไม่มีผลประเมิน</p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
