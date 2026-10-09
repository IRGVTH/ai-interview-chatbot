import { BadGatewayException } from '@nestjs/common';
export const RUBRIC = {
  version: 'thai-interview-v1',
  gradeScale: {
    version: 'practice-grade-v1',
    description:
      'เกรดการฝึกจากคะแนนรวม: A = 8–10, B = 7–น้อยกว่า 8, C = 6–น้อยกว่า 7, D = 5–น้อยกว่า 6, F = 0–น้อยกว่า 5 ไม่ใช่ผลการจ้างงาน',
    bands: [
      { grade: 'A', minimum: 8 },
      { grade: 'B', minimum: 7 },
      { grade: 'C', minimum: 6 },
      { grade: 'D', minimum: 5 },
      { grade: 'F', minimum: 0 },
    ],
  },
  min: 0,
  max: 10,
  dimensions: [
    { key: 'technical', label: 'ความถูกต้องและเนื้อหา', weight: 0.25 },
    { key: 'communication', label: 'ความชัดเจน', weight: 0.25 },
    { key: 'language', label: 'การใช้ภาษา', weight: 0.25 },
    { key: 'confidence', label: 'การสื่อสารที่สะท้อนความมั่นใจ', weight: 0.25 },
  ],
  anchors:
    '0 = ไม่ตอบประเด็น, 1–3 = มีข้อผิดพลาดสำคัญ, 4–6 = ถูกบางส่วนแต่ขาดเหตุผล, 7–8 = ถูกต้องและอธิบายชัด, 9–10 = ถูกต้อง ชัดเจน มีเหตุผลและตัวอย่างครบ',
  limitation:
    'ประเมินจากข้อความเท่านั้น ความมั่นใจหมายถึงลักษณะการสื่อสาร ไม่ใช่อารมณ์ สภาพจิตใจ หรือคุณสมบัติในการจ้างงาน ใช้ศัพท์เทคนิคภาษาอังกฤษได้โดยไม่ลดคะแนนเพียงเพราะภาษา',
};
const keys = ['technical', 'communication', 'language', 'confidence'] as const;
type Dimension = (typeof keys)[number];
export type ParsedEvaluation = Record<Dimension, number> & {
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  dimensionFeedback: Record<Dimension, string>;
  exampleAnswers: { messageId: string; answer: string }[];
};
export function parseEvaluation(
  text: string,
  answerIds: string[],
): ParsedEvaluation {
  const invalid = () =>
    new BadGatewayException(
      'AI ส่งผลประเมินไม่ครบหรือไม่ถูกต้อง ยังไม่ได้บันทึกคะแนน กรุณาลองใหม่',
    );
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, ''),
    ) as Record<string, unknown>;
  } catch {
    throw invalid();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid();
  const nonempty = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length > 0;
  const reasons = data.dimensionFeedback as Record<string, unknown> | undefined;
  for (const key of keys) {
    const score = data[key];
    if (
      typeof score !== 'number' ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 10 ||
      !nonempty(reasons?.[key])
    )
      throw invalid();
  }
  for (const key of ['strengths', 'improvements']) {
    if (
      !Array.isArray(data[key]) ||
      !data[key].length ||
      !data[key].every(nonempty)
    )
      throw invalid();
  }
  if (
    !nonempty(data.feedback) ||
    !Array.isArray(data.exampleAnswers) ||
    !data.exampleAnswers.length
  )
    throw invalid();
  for (const item of data.exampleAnswers as unknown[]) {
    const example = item as { messageId?: unknown; answer?: unknown } | null;
    if (
      !example ||
      typeof example.messageId !== 'string' ||
      !answerIds.includes(example.messageId) ||
      !nonempty(example.answer)
    )
      throw invalid();
  }
  // Overall is deterministic; the model cannot invent a contradictory total.
  const overall =
    Math.round(
      (keys.reduce((sum, key) => sum + (data[key] as number), 0) / 4) * 10,
    ) / 10;
  return {
    technical: data.technical,
    communication: data.communication,
    language: data.language,
    confidence: data.confidence,
    overall,
    strengths: data.strengths,
    improvements: data.improvements,
    feedback: data.feedback,
    dimensionFeedback: Object.fromEntries(
      keys.map((key) => [key, reasons[key]]),
    ),
    exampleAnswers: (
      data.exampleAnswers as { messageId: string; answer: string }[]
    ).map(({ messageId, answer }) => ({ messageId, answer })),
  } as ParsedEvaluation;
}

export function gradeFromScore(
  score: number | null | undefined,
): string | null {
  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 10
  )
    return null;
  return (
    RUBRIC.gradeScale.bands.find((band) => score >= band.minimum)?.grade ?? null
  );
}
