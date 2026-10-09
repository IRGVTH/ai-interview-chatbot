"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
export type { Rubric } from "./report-data";
import { normalizeRubric, type Rubric } from "./report-data";
export function RubricGuide({ token }: { token: string | null }) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (token)
      void apiFetch<unknown>("/report/rubric", { token })
        .then((r) => {
          const parsed = normalizeRubric(r);
          if (!parsed) throw new Error("Incomplete rubric");
          if (live) setRubric(parsed);
        })
        .catch(() => {
          if (live) setError("โหลดเกณฑ์คะแนนไม่ได้ กรุณาโหลดหน้าใหม่");
        });
    return () => {
      live = false;
    };
  }, [token]);
  return (
    <details className="rounded-xl border bg-white p-4 text-sm text-black">
      <summary className="cursor-pointer font-semibold">
        เกณฑ์การประเมิน 0–10 และข้อจำกัด {rubric?.version}
      </summary>
      {rubric ? (
        <div className="mt-3 space-y-2">
          <p>{rubric.anchors}</p>
          <p>{rubric.gradeScale.description}</p>
          <ul>
            {rubric.dimensions.map((d) => (
              <li key={d.key}>
                {d.label}: {d.weight * 100}%
              </li>
            ))}
          </ul>
          <p>{rubric.limitation}</p>
        </div>
      ) : (
        <p role="status">{error || "กำลังโหลดเกณฑ์…"}</p>
      )}
    </details>
  );
}
