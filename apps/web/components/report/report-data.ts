export const RUBRIC_VERSION = "interview-30-v1";
export const GRADE_SCALE = {
  version: "practice-grade-30-v1",
  description:
    "เกรดเต็ม 30: A = 24–30, B = 21–น้อยกว่า 24, C = 18–น้อยกว่า 21, D = 15–น้อยกว่า 18, F = 0–น้อยกว่า 15",
  bands: [
    { grade: "A", minimum: 24 },
    { grade: "B", minimum: 21 },
    { grade: "C", minimum: 18 },
    { grade: "D", minimum: 15 },
    { grade: "F", minimum: 0 },
  ],
};
export type Dimension = {
  key: string;
  label: string;
  weight: number;
  criteria?: string;
  levels?: string[];
};
export type Rubric = {
  version: string;
  min: number;
  max: number;
  totalMax?: number;
  formula?: string;
  anchors: string;
  limitation: string;
  gradeScale: typeof GRADE_SCALE;
  dimensions: Dimension[];
};
export type Evaluation = {
  id: string;
  sessionId: string;
  technical: number | null;
  communication: number | null;
  language: number | null;
  confidence: number | null;
  overall: number | null;
  totalScore: number | null;
  displayScore: number | null;
  scoreMax: number;
  grade: string | null;
  strengths: string[];
  improvements: string[];
  feedback: string;
  rubricVersion: string;
  rubricSnapshot: Rubric | null;
  sourceTurnVersion: number | null;
  evaluatedThrough: string | null;
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
  lastMessageAt: string | null;
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
  gradeScale: typeof GRADE_SCALE;
  averageRubricVersion: string;
  excludedEvaluations: number;
  sessions: Session[];
  rubric: Rubric;
  legacyApi: boolean;
};
const object = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
const string = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const score = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
const version = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null;
export function gradeFromScore(value: number | null) {
  return score(value) === null ? null : gradeFromTotalScore(value! * 3);
}
export function gradeFromTotalScore(value: number | null) {
  return typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 30
    ? null
    : (GRADE_SCALE.bands.find((b) => value >= b.minimum)?.grade ?? null);
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
  const dims = r.dimensions.map(object);
  const keys = ["technical", "communication", "language", "confidence"];
  if (
    dims.some(
      (d) =>
        !d ||
        !keys.includes(string(d.key)) ||
        typeof d.label !== "string" ||
        typeof d.weight !== "number" ||
        !Number.isFinite(d.weight),
    ) ||
    new Set(dims.map((d) => d?.key)).size !== 4
  )
    return null;
  return {
    version: r.version,
    min: 0,
    max: 10,
    totalMax: r.totalMax === 30 ? 30 : undefined,
    formula: string(r.formula),
    anchors: r.anchors,
    limitation: r.limitation,
    gradeScale: GRADE_SCALE,
    dimensions: dims.map((d) => ({
      key: string(d!.key),
      label: string(d!.label),
      weight: d!.weight as number,
      criteria: string(d!.criteria),
      levels: strings(d!.levels),
    })),
  };
}
export const LEGACY_DISPLAY: Rubric = {
  version: "legacy-v0",
  min: 0,
  max: 10,
  gradeScale: GRADE_SCALE,
  anchors: "ผลเดิมยังไม่มีเหตุผลครบ 4 ด้าน กรุณาประเมินใหม่ด้วยเกณฑ์เต็ม 30",
  limitation:
    "AI ประเมินจากข้อความเพื่อการฝึก ไม่ใช่ผลคัดเลือกเข้าทำงานหรือการวัดน้ำเสียง",
  dimensions: [
    { key: "technical", label: "ความถูกต้องและเนื้อหา", weight: 0.25 },
    { key: "communication", label: "ความชัดเจน", weight: 0.25 },
    { key: "language", label: "การใช้ภาษา", weight: 0.25 },
    { key: "confidence", label: "การสื่อสารที่สะท้อนความมั่นใจ", weight: 0.25 },
  ],
};
function normalizeEvaluation(v: unknown, sessionId: string): Evaluation | null {
  if (v == null) return null;
  const e = object(v);
  if (!e) throw new Error("รูปแบบผลประเมินไม่ถูกต้อง กรุณาลองใหม่");
  const technical = score(e.technical),
    communication = score(e.communication),
    language = score(e.language),
    confidence = score(e.confidence);
  const rubricVersion = string(e.rubricVersion, "legacy-v0");
  const reasons = object(e.dimensionFeedback);
  const isNew =
    rubricVersion === RUBRIC_VERSION &&
    [technical, communication, language, confidence].every((x) => x !== null) &&
    ["technical", "communication", "language", "confidence"].every(
      (key) =>
        typeof reasons?.[key] === "string" &&
        string(reasons[key]).trim().length >= 10,
    );
  const totalScore = isNew
    ? Number(
        (
          (technical! + communication! + language! + confidence!) *
          0.75
        ).toFixed(2),
      )
    : null;
  const overall = score(e.overall);
  return {
    id: string(e.id),
    sessionId,
    technical,
    communication,
    language,
    confidence,
    overall,
    totalScore,
    scoreMax: totalScore === null ? 10 : 30,
    displayScore: totalScore ?? overall,
    grade:
      totalScore === null
        ? gradeFromScore(overall)
        : gradeFromTotalScore(totalScore),
    strengths: strings(e.strengths),
    improvements: strings(e.improvements),
    feedback: string(e.feedback),
    rubricVersion,
    rubricSnapshot: normalizeRubric(e.rubricSnapshot),
    sourceTurnVersion: version(e.sourceTurnVersion),
    evaluatedThrough: date(e.evaluatedThrough),
    dimensionFeedback: reasons
      ? (Object.fromEntries(
          Object.entries(reasons).filter(([, x]) => typeof x === "string"),
        ) as Record<string, string>)
      : null,
    exampleAnswers: [],
    createdAt: string(e.createdAt),
    updatedAt: string(e.updatedAt),
  };
}
export function isEvaluationCurrent(s: Session) {
  const e = s.evaluation;
  if (!e) return false;
  if (e.totalScore !== null)
    return (
      !!e.evaluatedThrough &&
      (!s.lastMessageAt ||
        Date.parse(e.evaluatedThrough) >= Date.parse(s.lastMessageAt))
    );
  return (
    e.overall !== null &&
    e.sourceTurnVersion !== null &&
    s.turnVersion !== null &&
    e.sourceTurnVersion === s.turnVersion
  );
}
export function canDownloadEvaluation(s: Session) {
  const e = s.evaluation;
  if (!e || e.displayScore === null) return false;
  if (e.rubricVersion === RUBRIC_VERSION)
    return e.totalScore !== null && isEvaluationCurrent(s);
  return e.sourceTurnVersion === null && s.turnVersion === null
    ? true
    : isEvaluationCurrent(s);
}
export function normalizeOverview(v: unknown): Overview {
  const r = object(v);
  if (!r || !Array.isArray(r.sessions))
    throw new Error("รูปแบบข้อมูลรายงานไม่ถูกต้อง");
  const sessions = r.sessions.map((v): Session => {
    const s = object(v),
      i = object(s?.interview);
    if (!s || typeof s.id !== "string" || !i)
      throw new Error("ข้อมูลรอบสัมภาษณ์ไม่ครบ");
    return {
      id: s.id,
      title: typeof s.title === "string" ? s.title : null,
      createdAt: string(s.createdAt, string(s.updatedAt)),
      lastMessageAt: date(s.lastMessageAt),
      turnVersion: version(s.turnVersion),
      interview: {
        title: string(i.title, string(s.title, "รอบฝึก")),
        position: string(i.position, "ไม่ได้ระบุ"),
        interviewType: string(i.interviewType, "ไม่ได้ระบุ"),
        difficulty: string(i.difficulty, "ไม่ได้ระบุ"),
        status: string(i.status),
        startedAt: date(i.startedAt),
        finishedAt: date(i.finishedAt),
      },
      evaluation: normalizeEvaluation(s.evaluation, s.id),
    };
  });
  const rubric = normalizeRubric(r.rubric);
  const eligible = sessions.filter(
    (s) => s.evaluation?.totalScore != null && isEvaluationCurrent(s),
  );
  const averageOverall = eligible.length
    ? Number(
        (
          eligible.reduce((sum, s) => sum + s.evaluation!.totalScore!, 0) /
          eligible.length
        ).toFixed(2),
      )
    : null;
  return {
    totalInterviews: version(r.totalInterviews) ?? 0,
    totalSessions: version(r.totalSessions) ?? sessions.length,
    totalMessages: version(r.totalMessages) ?? 0,
    sessions,
    rubric: rubric ?? LEGACY_DISPLAY,
    gradeScale: GRADE_SCALE,
    averageOverall,
    averageGrade: gradeFromTotalScore(averageOverall),
    averageRubricVersion: RUBRIC_VERSION,
    excludedEvaluations:
      sessions.filter((s) => s.evaluation).length - eligible.length,
    legacyApi: rubric?.version !== RUBRIC_VERSION,
  };
}
