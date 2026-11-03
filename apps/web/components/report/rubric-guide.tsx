"use client";
import { LEGACY_DISPLAY } from "./report-data";
export type { Rubric } from "./report-data";

// Current backend does not expose /report/rubric or record scoring weights.
// Explain only the dimensions actually returned; never invent weights.
export function RubricGuide({ token }: { token: string | null }) {
  if (!token) return null;
  return (
    <details className="rounded-xl border bg-white p-4 text-sm text-black">
      <summary className="cursor-pointer font-semibold">
        เกณฑ์การประเมิน 0–10 และข้อจำกัด
      </summary>
      <div className="mt-3 space-y-2">
        <p>
          AI ประเมินคะแนนเต็ม 10 ตามประเภทการสัมภาษณ์และคำตอบที่ส่ง
          คะแนนรวมใช้ค่าที่บันทึกไว้
        </p>
        <p>{LEGACY_DISPLAY.gradeScale.description}</p>
        <ul className="list-disc pl-5">
          {LEGACY_DISPLAY.dimensions.map((d) => (
            <li key={d.key}>{d.label}</li>
          ))}
        </ul>
        <p>
          ผลประเมินนี้ไม่ได้ระบุน้ำหนักหรือเวอร์ชันเกณฑ์ จึงไม่แสดงสัดส่วนคะแนน
        </p>
        <p>
          คะแนนจากข้อความเป็นแนวทางฝึกฝน ไม่ใช่ผลการคัดเลือกเข้าทำงาน
          และไม่ใช่การประเมินน้ำเสียงหรือบุคลิกภาพ
        </p>
      </div>
    </details>
  );
}
