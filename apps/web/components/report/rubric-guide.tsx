"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
export type Rubric = {
  gradeScale: {
    version: string;
    description: string;
    bands: { grade: string; minimum: number }[];
  };
  version: string;
  min: number;
  max: number;
  anchors: string;
  limitation: string;
  dimensions: { key: string; label: string; weight: number }[];
};
export function RubricGuide({ token }: { token: string | null }) {
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (token)
      void apiFetch<Rubric>("/report/rubric", { token })
        .then((r) => {
          if (live) setRubric(r);
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
