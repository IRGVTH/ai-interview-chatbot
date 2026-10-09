export const GRADE_SCALE = {
  version: "practice-grade-v1",
  description:
    "เกรดจากคะแนนรวม: A = 8–10, B = 7–น้อยกว่า 8, C = 6–น้อยกว่า 7, D = 5–น้อยกว่า 6, F = 0–น้อยกว่า 5 เป็นผลการฝึกเท่านั้น",
  bands: [
    { grade: "A", minimum: 8 },
    { grade: "B", minimum: 7 },
    { grade: "C", minimum: 6 },
    { grade: "D", minimum: 5 },
    { grade: "F", minimum: 0 },
  ],
};
export type Rubric = {
  gradeScale: typeof GRADE_SCALE;
  version: string;
  min: number;
  max: number;
  anchors: string;
  limitation: string;
  dimensions: { key: string; label: string; weight: number }[];
};
export type Evaluation = {
  grade: string | null;
  id: string;
  sessionId: string;
  technical: number | null;
  communication: number | null;
  language: number | null;
  confidence: number | null;
  overall: number | null;
  strengths: string[];
  improvements: string[];
  feedback: string;
  rubricVersion: string;
  rubricSnapshot: Rubric | null;
  sourceTurnVersion: number | null;
  dimensionFeedback: Record<string, string> | null;
  exampleAnswers: {
    question: string;
    originalAnswer: string;
    answer: string;
  }[];
  createdAt: string;
  updatedAt: string;
};
export type Session = {
  id: string;
  title: string | null;
  createdAt: string;
  turnVersion: number | null;
  interview: {
    title: string;
    position: string;
    interviewType: string;
    difficulty: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
  };
  evaluation: Evaluation | null;
};
export type Overview = {
  totalInterviews: number;
  totalSessions: number;
  totalMessages: number;
  averageOverall: number | null;
  averageGrade: string | null;
  gradeScale: Rubric["gradeScale"];
  averageRubricVersion: string;
  excludedEvaluations: number;
  sessions: Session[];
  rubric: Rubric;
  legacyApi: boolean;
};
const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const string = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const score = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 10
    ? value
    : null;
const version = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
export function gradeFromScore(value: number | null) {
  const valid = score(value);
  return valid === null
    ? null
    : (GRADE_SCALE.bands.find((b) => valid >= b.minimum)?.grade ?? null);
}
export function normalizeRubric(value: unknown): Rubric | null {
  const r = object(value);
  if (
    !r ||
    typeof r.version !== "string" ||
    typeof r.anchors !== "string" ||
    typeof r.limitation !== "string" ||
    r.min !== 0 ||
    r.max !== 10 ||
    !Array.isArray(r.dimensions) ||
    r.dimensions.length !== 4
  )
    return null;
  const dimensions = r.dimensions.map(object);
  const expected = ["technical", "communication", "language", "confidence"];
  if (
    dimensions.some(
      (d) =>
        !d ||
        !expected.includes(string(d.key)) ||
        typeof d.label !== "string" ||
        typeof d.weight !== "number" ||
        !Number.isFinite(d.weight),
    ) ||
    new Set(dimensions.map((d) => d?.key)).size !== 4
  )
    return null;
  return {
    version: r.version,
    anchors: r.anchors,
    limitation: r.limitation,
    min: 0,
    max: 10,
    gradeScale: GRADE_SCALE,
    dimensions: dimensions.map((d) => ({
      key: string(d!.key),
      label: string(d!.label),
      weight: d!.weight as number,
    })),
  };
}
const LEGACY_DISPLAY: Rubric = {
  version: "legacy-v0",
  min: 0,
  max: 10,
  gradeScale: GRADE_SCALE,
  anchors: "ผลประเมินเดิมยังไม่มีรายละเอียดเกณฑ์ที่บันทึกไว้",
  limitation:
    "ผลเดิมอาจประเมินเพียงสามด้าน และไม่สามารถยืนยันว่าใช้เกณฑ์เดียวกับผลใหม่ได้ เกรดแสดงจากคะแนนรวมที่บันทึกไว้",
  dimensions: [
    { key: "technical", label: "ความถูกต้องและเนื้อหา", weight: 0 },
    { key: "communication", label: "ความชัดเจน", weight: 0 },
    { key: "language", label: "การใช้ภาษา", weight: 0 },
    { key: "confidence", label: "การสื่อสารที่สะท้อนความมั่นใจ", weight: 0 },
  ],
};
function normalizeEvaluation(
  value: unknown,
  sessionId: string,
): Evaluation | null {
  if (value == null) return null;
  const e = object(value);
  if (!e) throw new Error("รูปแบบผลประเมินไม่ถูกต้อง กรุณาลองโหลดใหม่");
  const reasons = object(e.dimensionFeedback);
  const examples = Array.isArray(e.exampleAnswers)
    ? e.exampleAnswers
        .map(object)
        .filter((x): x is Record<string, unknown> => x !== null)
        .map((x) => ({
          question: string(x.question),
          originalAnswer: string(x.originalAnswer),
          answer: string(x.answer),
        }))
    : [];
  const overall = score(e.overall);
  return {
    id: string(e.id),
    sessionId,
    technical: score(e.technical),
    communication: score(e.communication),
    language: score(e.language),
    confidence: score(e.confidence),
    overall,
    grade: gradeFromScore(overall),
    strengths: strings(e.strengths),
    improvements: strings(e.improvements),
    feedback: string(e.feedback),
    rubricVersion: string(e.rubricVersion, "legacy-v0"),
    rubricSnapshot: normalizeRubric(e.rubricSnapshot),
    sourceTurnVersion: version(e.sourceTurnVersion),
    dimensionFeedback: reasons
      ? (Object.fromEntries(
          Object.entries(reasons).filter(([, v]) => typeof v === "string"),
        ) as Record<string, string>)
      : null,
    exampleAnswers: examples,
    createdAt: string(e.createdAt),
    updatedAt: string(e.updatedAt),
  };
}
export function isEvaluationCurrent(session: Session) {
  const e = session.evaluation;
  return (
    !!e &&
    e.overall !== null &&
    e.sourceTurnVersion !== null &&
    session.turnVersion !== null &&
    e.sourceTurnVersion === session.turnVersion
  );
}
export function normalizeOverview(value: unknown): Overview {
  const r = object(value);
  if (!r || !Array.isArray(r.sessions))
    throw new Error("รูปแบบข้อมูลรายงานไม่ถูกต้อง กรุณาลองโหลดใหม่");
  const sessions = r.sessions.map((value): Session => {
    const s = object(value),
      i = object(s?.interview);
    if (!s || typeof s.id !== "string" || !i)
      throw new Error("ข้อมูลรอบสัมภาษณ์ไม่ครบ กรุณาลองโหลดใหม่");
    return {
      id: s.id,
      title: typeof s.title === "string" ? s.title : null,
      createdAt: string(s.createdAt, string(s.updatedAt)),
      turnVersion: version(s.turnVersion),
      interview: {
        title: string(i.title, string(s.title, "รอบฝึก")),
        position: string(i.position, "ไม่ได้ระบุ"),
        interviewType: string(i.interviewType, "ไม่ได้ระบุ"),
        difficulty: string(i.difficulty, "ไม่ได้ระบุ"),
        status: string(i.status),
        startedAt: typeof i.startedAt === "string" ? i.startedAt : null,
        finishedAt: typeof i.finishedAt === "string" ? i.finishedAt : null,
      },
      evaluation: normalizeEvaluation(s.evaluation, s.id),
    };
  });
  const rubric = normalizeRubric(r.rubric);
  const eligible = sessions.filter(
    (s) =>
      isEvaluationCurrent(s) &&
      s.evaluation?.rubricVersion === rubric?.version &&
      s.evaluation?.overall !== null,
  );
  const averageOverall = eligible.length
    ? Math.round(
        (eligible.reduce((sum, s) => sum + s.evaluation!.overall!, 0) /
          eligible.length) *
          100,
      ) / 100
    : null;
  return {
    totalInterviews: version(r.totalInterviews) ?? 0,
    totalSessions: version(r.totalSessions) ?? sessions.length,
    totalMessages: version(r.totalMessages) ?? 0,
    sessions,
    rubric: rubric ?? LEGACY_DISPLAY,
    gradeScale: GRADE_SCALE,
    averageOverall,
    averageGrade: gradeFromScore(averageOverall),
    averageRubricVersion: rubric?.version ?? "ยังไม่มีเกณฑ์ปัจจุบัน",
    excludedEvaluations:
      sessions.filter((s) => s.evaluation).length - eligible.length,
    legacyApi: rubric === null,
  };
}
