"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeRubric, RUBRIC_VERSION, type Rubric } from "./report-data";
export type { Rubric } from "./report-data";
export function RubricGuide({
  token,
  rubric: supplied,
}: {
  token: string | null;
  rubric?: Rubric;
}) {
  const [loaded, setLoaded] = useState<Rubric | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (!token || supplied) return;
    void apiFetch<unknown>("/report/rubric", { token })
      .then((value) => {
        const rubric = normalizeRubric(value);
        if (!rubric || rubric.version !== RUBRIC_VERSION)
          throw new Error("ยังโหลดเกณฑ์เต็ม 30 ไม่ได้ กรุณาลองใหม่");
        if (live) setLoaded(rubric);
      })
      .catch(() => {
        if (live) setError("ยังโหลดเกณฑ์เต็ม 30 ไม่ได้ กรุณาลองใหม่");
      });
    return () => {
      live = false;
    };
  }, [token, supplied]);
  if (!token) return null;
  const rubric = supplied ?? loaded;
  return (
    <details className="rounded-xl border bg-white p-4 text-sm text-black">
      <summary className="cursor-pointer font-semibold">
        Rubric แต่ละด้านเต็ม 30 คะแนน และเกณฑ์เกรด A–F
      </summary>
      {!rubric ? (
        <p role="status" className="mt-3">
          {error || "กำลังโหลดเกณฑ์…"}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <p>{rubric.formula}</p>
          <p>{rubric.gradeScale.description}</p>
          <p>{rubric.anchors}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr>
                  <th className="p-3">ด้าน / น้ำหนัก</th>
                  <th className="p-3">สิ่งที่วัด</th>
                  <th className="p-3">เกณฑ์ระดับคะแนน / {rubric.max}</th>
                </tr>
              </thead>
              <tbody>
                {rubric.dimensions.map((d) => (
                  <tr key={d.key} className="border-t">
                    <td className="p-3 font-medium">
                      {d.label}
                      <br />
                      เต็ม {rubric.max} คะแนน / น้ำหนัก {d.weight * 100}%
                      ของค่าเฉลี่ย
                    </td>
                    <td className="p-3">{d.criteria}</td>
                    <td className="p-3">
                      <ul className="list-disc space-y-1 pl-5">
                        {d.levels?.map((level) => (
                          <li key={level}>{level}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>{rubric.limitation}</p>
        </div>
      )}
    </details>
  );
}
