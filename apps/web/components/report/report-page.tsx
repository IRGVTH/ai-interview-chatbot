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
  return (
    <main className="space-y-6 text-black">
      <header>
        <h1 className="text-3xl font-bold">Interview Report</h1>
        <p className="mt-2">คะแนนเต็ม 30 พร้อมเกณฑ์และเหตุผลแยกทั้ง 4 ด้าน</p>
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
          ["เฉลี่ย / 30", data.averageOverall ?? "ยังไม่มีคะแนน"],
          ["เกรดเฉลี่ย", data.averageGrade ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-white p-4">
            <p>{label}</p>
            <strong className="text-2xl">{value}</strong>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        ค่าเฉลี่ยนับเฉพาะผลเกณฑ์เต็ม 30 ที่ยังตรงกับบทสนทนา (
        {data.excludedEvaluations} ผลไม่รวม) ผลเดิมต้องประเมินใหม่
        ไม่แปลงคะแนนหรือเติมคะแนนภาษาให้เอง
      </p>
      <RubricGuide
        token={token}
        rubric={data.legacyApi ? undefined : data.rubric}
      />
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
            <h2 className="text-xl font-semibold">ประวัติผลประเมิน</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "วันที่ / รอบ",
                      "ประเภท / ตำแหน่ง",
                      "คะแนน",
                      "เกรด",
                      "สถานะ",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">
                        <button
                          onClick={() => setSelected(s.id)}
                          className="font-medium underline"
                        >
                          {s.interview.title}
                        </button>
                        <br />
                        {new Date(s.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="p-3">
                        {s.interview.interviewType} / {s.interview.position}
                      </td>
                      <td className="p-3">
                        {s.evaluation
                          ? `${s.evaluation.displayScore ?? "—"} / ${s.evaluation.scoreMax}`
                          : "ยังไม่ประเมิน"}
                      </td>
                      <td className="p-3">{s.evaluation?.grade ?? "—"}</td>
                      <td className="p-3">
                        {!s.evaluation
                          ? "ยังไม่ประเมิน"
                          : s.evaluation.totalScore === null
                            ? "ผลเดิม กรุณาประเมินใหม่เต็ม 30"
                            : isEvaluationCurrent(s)
                              ? "ผลล่าสุดที่บันทึก"
                              : "บทสนทนาเปลี่ยน กรุณาประเมินใหม่"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {session && (
            <section className="space-y-5 rounded-xl bg-white p-5">
              <div>
                <h2 className="text-xl font-semibold">
                  {session.interview.title}
                </h2>
                <p>
                  {session.interview.interviewType} /{" "}
                  {session.interview.position} / {session.interview.difficulty}
                </p>
              </div>
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
                      ? "ประเมินใหม่เต็ม 30"
                      : "ประเมินคะแนนเต็ม 30"}
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
              {!e ? (
                <p>กรุณาประเมินเพื่อดูคะแนนและเหตุผลรายด้าน</p>
              ) : (
                <>
                  {e.totalScore === null ? (
                    <p role="status" className="rounded-xl bg-amber-50 p-4">
                      นี่คือผลเดิมเต็ม 10
                      ยังไม่มีคะแนนภาษาและเหตุผลครบตามเกณฑ์ใหม่
                      กรุณากดประเมินใหม่ ผลเก่าจะไม่ถูกแปลงเป็นเต็ม 30
                      โดยอัตโนมัติ
                    </p>
                  ) : (
                    !isEvaluationCurrent(session) && (
                      <p role="status" className="rounded-xl bg-amber-50 p-4">
                        บทสนทนาเปลี่ยนหลังประเมิน กรุณาประเมินใหม่ก่อนดาวน์โหลด
                        PDF
                      </p>
                    )
                  )}
                  <div className="flex flex-wrap items-center gap-6 rounded-xl bg-indigo-50 p-6">
                    <div>
                      <p>เกรดผลการฝึก{e.totalScore === null ? "เดิม" : ""}</p>
                      <strong className="text-5xl">{e.grade ?? "—"}</strong>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {e.displayScore ?? "—"} / {e.scoreMax}
                      </p>
                      <p className="mt-2 text-sm">{e.rubricVersion}</p>
                    </div>
                  </div>
                  <p className="text-sm">{data.gradeScale.description}</p>
                  <p className="text-sm">
                    สูตรใหม่: (ผลรวมคะแนนดิบ 4 ด้าน ÷ 40) × 30
                    แต่ละด้านมีน้ำหนัก 25% หรือสูงสุด 7.5 คะแนน
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {(
                      e.rubricSnapshot?.dimensions ?? data.rubric.dimensions
                    ).map((d) => {
                      const value =
                        e[
                          d.key as
                            | "technical"
                            | "communication"
                            | "language"
                            | "confidence"
                        ];
                      return (
                        <article
                          key={d.key}
                          className="space-y-3 rounded-xl border p-5"
                        >
                          <h3 className="font-semibold">{d.label}</h3>
                          <p className="text-2xl font-bold">
                            {value ?? "ยังไม่ได้ประเมิน"}
                            {value !== null ? " / 10" : ""}
                          </p>
                          {value !== null && e.totalScore !== null && (
                            <p className="text-sm text-indigo-700">
                              คิดเป็น {Number((value * 0.75).toFixed(2))} / 7.5
                              คะแนน
                            </p>
                          )}
                          <p className="text-sm text-gray-600">{d.criteria}</p>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="font-medium">ทำไมจึงได้คะแนนนี้</p>
                            <p className="mt-2 whitespace-pre-wrap">
                              {e.dimensionFeedback?.[d.key] ??
                                "ยังไม่มีเหตุผลที่บันทึกไว้ กรุณาประเมินใหม่"}
                            </p>
                          </div>
                          {d.levels?.length ? (
                            <details className="text-sm">
                              <summary className="cursor-pointer font-medium">
                                ดู Rubric ของด้านนี้
                              </summary>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {d.levels.map((level) => (
                                  <li key={level}>{level}</li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-600">
                    คะแนนย่อยที่แสดงปัดเพื่ออ่านง่าย
                    คะแนนรวมคำนวณจากคะแนนดิบโดยไม่ปัดระหว่างทาง
                  </p>
                  <h3 className="font-semibold">ข้อเสนอแนะภาพรวม</h3>
                  <p className="whitespace-pre-wrap">{e.feedback}</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      ["จุดแข็ง", e.strengths],
                      ["สิ่งที่ควรปรับปรุง", e.improvements],
                    ].map(([label, items]) => (
                      <div key={String(label)}>
                        <h3 className="font-semibold">{String(label)}</h3>
                        <ul className="mt-2 list-disc pl-5">
                          {(items as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    {e.rubricSnapshot?.limitation ?? data.rubric.limitation}
                  </p>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
