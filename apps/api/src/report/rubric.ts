import { ServiceUnavailableException } from '@nestjs/common';

export const RUBRIC_VERSION = 'interview-30-v1';
export const RUBRIC = {
  version: RUBRIC_VERSION,
  min: 0,
  max: 10,
  totalMax: 30,
  formula:
    'คะแนนรวม = (ผลรวมคะแนนดิบ 4 ด้าน / 40) × 30 แต่ละด้านน้ำหนัก 25% หรือสูงสุด 7.5 คะแนน ไม่ปัดเศษระหว่างคำนวณ',
  anchors:
    '0–น้อยกว่า 3: ต้องปรับปรุงมาก | 3–น้อยกว่า 5: พอมีพื้นฐาน | 5–น้อยกว่า 7: พอใช้ | 7–น้อยกว่า 9: ดี | 9–10: ดีเยี่ยม',
  limitation:
    'AI ประเมินจากข้อความเพื่อการฝึกเท่านั้น ไม่ใช่ผลคัดเลือกเข้าทำงาน ความมั่นใจหมายถึงถ้อยคำและเหตุผลที่สื่อออกมา ไม่ใช่น้ำเสียง ภาษากาย หรือบุคลิกภาพ',
  gradeScale: {
    version: 'practice-grade-30-v1',
    description:
      'เกรดเต็ม 30: A = 24–30, B = 21–น้อยกว่า 24, C = 18–น้อยกว่า 21, D = 15–น้อยกว่า 18, F = 0–น้อยกว่า 15',
    bands: [
      { grade: 'A', minimum: 24 },
      { grade: 'B', minimum: 21 },
      { grade: 'C', minimum: 18 },
      { grade: 'D', minimum: 15 },
      { grade: 'F', minimum: 0 },
    ],
  },
  dimensions: [
    {
      key: 'technical',
      label: 'ความถูกต้องและเนื้อหา',
      weight: 0.25,
      criteria:
        'ความถูกต้อง ความตรงคำถาม ความครบถ้วน และหลักฐานหรือตัวอย่าง โดยพิจารณาตามประเภทการสัมภาษณ์',
      levels: [
        '0–<3: ผิดประเด็นหรือมีข้อผิดพลาดสำคัญ',
        '3–<5: ตรงคำถามบางส่วน แต่ยังคลาดเคลื่อนหรือขาดสาระหลัก',
        '5–<7: สาระหลักถูกต้อง แต่รายละเอียดหรือตัวอย่างยังไม่ครบ',
        '7–<9: ถูกต้อง ครบประเด็น และมีตัวอย่างหรือเหตุผลรองรับ',
        '9–10: แม่นยำ ครบถ้วน วิเคราะห์ข้อจำกัดและยกหลักฐานได้ชัดเจน',
      ],
    },
    {
      key: 'communication',
      label: 'ความชัดเจน',
      weight: 0.25,
      criteria:
        'การจัดลำดับความคิด ความกระชับ การอธิบายให้เข้าใจ และการเชื่อมเหตุผล',
      levels: [
        '0–<3: อ่านแล้วจับใจความไม่ได้',
        '3–<5: พอจับประเด็นได้ แต่สับสนหรือวกวน',
        '5–<7: เข้าใจได้ แต่ลำดับหรือรายละเอียดบางส่วนยังไม่ชัด',
        '7–<9: ลำดับดี ตรงประเด็น และเชื่อมเหตุผลชัด',
        '9–10: เป็นระบบ กระชับ และอธิบายเรื่องซับซ้อนให้เข้าใจง่าย',
      ],
    },
    {
      key: 'language',
      label: 'การใช้ภาษา',
      weight: 0.25,
      criteria:
        'ความเหมาะสมของถ้อยคำ ความสุภาพ ไวยากรณ์ และความถูกต้องของศัพท์ตามภาษาที่ใช้ ไม่หักเพราะใช้ภาษาไทยแทนภาษาอังกฤษ',
      levels: [
        '0–<3: ภาษาขัดขวางความเข้าใจอย่างมาก',
        '3–<5: ใช้คำหรือประโยคผิดบ่อย จนต้องตีความ',
        '5–<7: สื่อความหมายได้ มีข้อผิดพลาดแต่ไม่เสียสาระหลัก',
        '7–<9: ใช้ภาษาเหมาะสม สุภาพ และศัพท์ถูกต้องเป็นส่วนใหญ่',
        '9–10: ใช้ภาษาถูกต้อง แม่นยำ และเหมาะกับบริบทอย่างสม่ำเสมอ',
      ],
    },
    {
      key: 'confidence',
      label: 'การสื่อสารที่สะท้อนความมั่นใจ',
      weight: 0.25,
      criteria:
        'การยืนยันคำตอบด้วยเหตุผล แสดงบทบาทหรือการตัดสินใจของตน และยอมรับข้อจำกัดอย่างเหมาะสม โดยไม่เดาน้ำเสียงหรือบุคลิกภาพ',
      levels: [
        '0–<3: ไม่เสนอคำตอบหรือเหตุผลให้ประเมิน',
        '3–<5: คำตอบลังเลหรือกล่าวอ้างโดยไม่มีเหตุผลรองรับ',
        '5–<7: แสดงจุดยืนได้ แต่เหตุผลหรือบทบาทของตนยังไม่ชัด',
        '7–<9: ตอบตรง แสดงเหตุผลและบทบาทของตนอย่างเหมาะสม',
        '9–10: ยืนยันด้วยหลักฐาน อธิบายการตัดสินใจ และยอมรับสิ่งที่ยังไม่รู้อย่างมีเหตุผล',
      ],
    },
  ],
};
export type DimensionKey =
  'technical' | 'communication' | 'language' | 'confidence';
export type Scores = Record<DimensionKey, number>;
export function total30(scores: Scores) {
  return Number(
    (
      RUBRIC.dimensions.reduce(
        (sum, d) => sum + scores[d.key as DimensionKey],
        0,
      ) * 0.75
    ).toFixed(2),
  );
}
export function grade30(total: number) {
  if (!Number.isFinite(total) || total < 0 || total > 30) return null;
  return RUBRIC.gradeScale.bands.find((b) => total >= b.minimum)?.grade ?? null;
}
export function parseRubricEvaluation(text: string) {
  try {
    const start = text.indexOf('{'),
      end = text.lastIndexOf('}');
    const d: unknown = JSON.parse(text.slice(start, end + 1));
    if (!d || typeof d !== 'object') throw new Error();
    const data = d as Record<string, unknown>;
    const feedback = data.dimensionFeedback;
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback))
      throw new Error();
    const reasons = feedback as Record<string, unknown>;
    const scores = {} as Scores;
    const dimensionFeedback = {} as Record<DimensionKey, string>;
    for (const dim of RUBRIC.dimensions) {
      const key = dim.key as DimensionKey,
        value = data[key],
        reason = reasons[key];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 10
      )
        throw new Error();
      if (typeof reason !== 'string' || reason.trim().length < 10)
        throw new Error();
      scores[key] = value;
      dimensionFeedback[key] = reason.trim();
    }
    const list = (v: unknown) => {
      if (
        !Array.isArray(v) ||
        !v.length ||
        !v.every((s) => typeof s === 'string' && s.trim())
      )
        throw new Error();
      return (v as string[]).map((s) => s.trim()).slice(0, 5);
    };
    if (typeof data.feedback !== 'string' || !data.feedback.trim())
      throw new Error();
    return {
      ...scores,
      overall:
        RUBRIC.dimensions.reduce(
          (sum, dim) => sum + scores[dim.key as DimensionKey],
          0,
        ) / 4,
      dimensionFeedback,
      strengths: list(data.strengths),
      improvements: list(data.improvements),
      feedback: data.feedback.trim(),
    };
  } catch {
    throw new ServiceUnavailableException(
      'AI ส่งคะแนนหรือเหตุผลไม่ครบทั้ง 4 ด้าน กรุณาประเมินใหม่ ผลเดิมยังคงอยู่',
    );
  }
}
