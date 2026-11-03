"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchReportPdf, saveReportPdf } from "@/lib/report-pdf";
import { RubricGuide } from "./rubric-guide";
import {
  normalizeOverview,
  isEvaluationCurrent,
  canDownloadEvaluation,
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("ยังไม่ได้ตั้งค่า API URL");
      const blob = await fetchReportPdf(apiUrl, id, token);
      saveReportPdf(blob, id);
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
        {data.legacyApi
          ? "ค่าเฉลี่ยจากผลประเมินที่บันทึกไว้ หากตอบเพิ่ม ให้ประเมินใหม่ก่อนเปรียบเทียบ"
          : `ค่าเฉลี่ยใช้ผลล่าสุดที่ตรงกับบทสนทนา เกณฑ์ ${data.averageRubricVersion} เท่านั้น (${data.excludedEvaluations} ผลไม่รวมในค่าเฉลี่ย)`}{" "}
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
          กำลังแสดงคะแนนที่บันทึกไว้ เกรดคำนวณจากคะแนนรวม ดาวน์โหลด PDF
          ได้เมื่อมีผลประเมิน หากบทสนทนาเปลี่ยน ให้กดประเมินใหม่ก่อน
          ผลประเมินนี้ไม่มีเวอร์ชันเกณฑ์ คะแนนภาษาแยก หรือตัวอย่างคำตอบ
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
                            ? `${ev.overall ?? "ยังไม่มีคะแนน"}${ev.sourceTurnVersion === null ? " (คะแนนที่บันทึก)" : valid ? "" : " (ต้องประเมินใหม่)"}`
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
                  disabled={!!busy || !canDownloadEvaluation(session)}
                  onClick={() => download(session.id)}
                  className="rounded-lg border p-2 disabled:opacity-50"
                >
                  {busy === `pdf-${session.id}`
                    ? "กำลังสร้าง PDF…"
                    : "ดาวน์โหลด PDF"}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {e
                  ? "PDF ใช้ผลประเมินที่บันทึกไว้ หากตอบเพิ่มแล้ว ให้กดประเมินใหม่ก่อน"
                  : "กรุณากด Generate score ก่อนดาวน์โหลด PDF"}
              </p>
              {e ? (
                <>
                  <div className="flex flex-wrap items-center gap-4 rounded-xl bg-zinc-50 p-5">
                    <div>
                      <p className="text-sm">
                        {e.sourceTurnVersion === null
                          ? "เกรดจากคะแนนที่บันทึก"
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
                      "ผลประเมินนี้ไม่มีรายละเอียดเกณฑ์ที่บันทึกไว้"}
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
                            "ไม่มีคำอธิบายแยกรายด้านในผลประเมินนี้"}
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
                    <p>ผลประเมินนี้ไม่มีตัวอย่างคำตอบแยกต่างหาก</p>
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
