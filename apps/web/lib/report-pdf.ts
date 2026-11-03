function errorMessage(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value))
    return value.map(errorMessage).filter(Boolean).join(", ") || null;
  if (value && typeof value === "object" && "message" in value)
    return errorMessage(value.message);
  return null;
}

export async function fetchReportPdf(
  apiUrl: string,
  sessionId: string,
  token: string,
): Promise<Blob> {
  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/report/sessions/${encodeURIComponent(sessionId)}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) {
    const detail: unknown = await response.json().catch(() => null);
    if (response.status === 404)
      throw new Error(
        "Backend ยังไม่มีบริการ PDF หรือไม่พบรอบฝึก กรุณาตรวจว่า Deploy Backend จากสาขา fix/gemini-practice-errors แล้ว",
      );
    if (response.status === 401)
      throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
    throw new Error(
      errorMessage(detail) || `ดาวน์โหลด PDF ไม่สำเร็จ (${response.status})`,
    );
  }
  const blob = await response.blob();
  // Avoid saving HTML/JSON error responses as a broken .pdf file.
  if ((await blob.slice(0, 5).text()) !== "%PDF-")
    throw new Error("Backend ไม่ได้ส่งไฟล์ PDF ที่ถูกต้อง กรุณาลองใหม่");
  return blob;
}

export function saveReportPdf(blob: Blob, sessionId: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `interview-report-${sessionId.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
