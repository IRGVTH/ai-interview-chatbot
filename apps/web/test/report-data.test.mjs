import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOverview,
  canDownloadEvaluation,
  isEvaluationCurrent,
  gradeFromTotalScore,
  normalizeRubric,
  applyNewEvaluation,
} from "../components/report/report-data.ts";
const reasons = Object.fromEntries(
  ["technical", "communication", "language", "confidence"].map((k) => [
    k,
    "อธิบายได้ตรงประเด็น แต่ยังขาดตัวอย่างประกอบที่ชัดเจน",
  ]),
);
const evaluation = {
  id: "e",
  technical: 8,
  communication: 8,
  language: 8,
  confidence: 8,
  overall: 8,
  rubricVersion: "interview-30-v1",
  dimensionFeedback: reasons,
  evaluatedThrough: "2026-11-03T05:00:00Z",
  strengths: ["ชัดเจน"],
  improvements: ["เพิ่มตัวอย่าง"],
  feedback: "ข้อเสนอแนะ",
};
const session = {
  id: "s",
  createdAt: "2026-11-03T04:00:00Z",
  lastMessageAt: "2026-11-03T05:00:00Z",
  interview: {
    title: "ฝึกสัมภาษณ์",
    interviewType: "HR",
    position: "Developer",
    difficulty: "easy",
    status: "draft",
  },
  evaluation,
};
const input = {
  sessions: [session],
  totalInterviews: 1,
  totalSessions: 1,
  totalMessages: 2,
};
test("a persisted evaluation replaces the legacy result immediately and recomputes the average", () => {
  const before = normalizeOverview({
    ...input,
    sessions: [
      {
        ...session,
        evaluation: { ...evaluation, rubricVersion: "thai-interview-v1" },
      },
    ],
  });
  const after = applyNewEvaluation(before, "s", evaluation);
  assert.equal(before.sessions[0].evaluation.scoreMax, 10);
  assert.equal(after.sessions[0].evaluation.displayScore, 24);
  assert.equal(after.sessions[0].evaluation.scoreMax, 30);
  assert.equal(after.averageOverall, 24);
  assert.equal(canDownloadEvaluation(after.sessions[0]), true);
});
test("a legacy or incomplete POST response never reports a successful /30 evaluation", () => {
  const before = normalizeOverview(input);
  for (const response of [
    { ...evaluation, rubricVersion: "thai-interview-v1" },
    { ...evaluation, language: null },
    { ...evaluation, evaluatedThrough: null },
    { ...evaluation, dimensionFeedback: {} },
  ]) {
    assert.throws(() => applyNewEvaluation(before, "s", response), /เต็ม 30/);
  }
  assert.equal(before.sessions[0].evaluation.displayScore, 24);
});
test("four scores produce total 24/30, A, and downloadable current report", () => {
  const d = normalizeOverview(input),
    e = d.sessions[0].evaluation;
  assert.equal(e.totalScore, 24);
  assert.equal(e.scoreMax, 30);
  assert.equal(e.grade, "A");
  assert.equal(d.averageOverall, 24);
  assert.equal(d.averageGrade, "A");
  assert.equal(canDownloadEvaluation(d.sessions[0]), true);
});
test("historical results remain /10 without inventing a language score", () => {
  const d = normalizeOverview({
    ...input,
    sessions: [
      {
        ...session,
        evaluation: {
          ...evaluation,
          rubricVersion: "legacy-v0",
          language: null,
          dimensionFeedback: null,
        },
      },
    ],
  });
  assert.equal(d.sessions[0].evaluation.totalScore, null);
  assert.equal(d.sessions[0].evaluation.scoreMax, 10);
  assert.equal(d.averageOverall, null);
  assert.equal(d.excludedEvaluations, 1);
});
test("conversation changes exclude scores and disable new PDF", () => {
  const d = normalizeOverview({
    ...input,
    sessions: [{ ...session, lastMessageAt: "2026-11-03T05:01:00Z" }],
  });
  assert.equal(isEvaluationCurrent(d.sessions[0]), false);
  assert.equal(canDownloadEvaluation(d.sessions[0]), false);
  assert.equal(d.averageOverall, null);
});
test("missing evaluatedThrough never claims new score is current", () => {
  const d = normalizeOverview({
    ...input,
    sessions: [
      { ...session, evaluation: { ...evaluation, evaluatedThrough: null } },
    ],
  });
  assert.equal(canDownloadEvaluation(d.sessions[0]), false);
});
test("missing reason or language prevents a complete 30-point report", () => {
  for (const patch of [
    { language: null },
    { dimensionFeedback: { ...reasons, language: "" } },
  ]) {
    const d = normalizeOverview({
      ...input,
      sessions: [{ ...session, evaluation: { ...evaluation, ...patch } }],
    });
    assert.equal(d.sessions[0].evaluation.totalScore, null);
    assert.equal(canDownloadEvaluation(d.sessions[0]), false);
  }
});
test("zero remains a valid F rather than missing", () => {
  const d = normalizeOverview({
    ...input,
    sessions: [
      {
        ...session,
        evaluation: {
          ...evaluation,
          technical: 0,
          communication: 0,
          language: 0,
          confidence: 0,
          overall: 0,
        },
      },
    ],
  });
  assert.equal(d.averageOverall, 0);
  assert.equal(d.averageGrade, "F");
});
test("invalid scores cannot become valid grades", () => {
  for (const technical of [null, "8", -1, 11, NaN])
    assert.equal(
      normalizeOverview({
        ...input,
        sessions: [{ ...session, evaluation: { ...evaluation, technical } }],
      }).sessions[0].evaluation.totalScore,
      null,
    );
});
test("no history does not invent an F grade", () =>
  assert.equal(normalizeOverview({ sessions: [] }).averageGrade, null));
test("null arrays and invalid overview are handled safely", () => {
  const d = normalizeOverview({
    ...input,
    sessions: [
      {
        ...session,
        evaluation: { ...evaluation, strengths: null, improvements: null },
      },
    ],
  });
  assert.deepEqual(d.sessions[0].evaluation.strengths, []);
  assert.throws(() => normalizeOverview({}), /รายงาน/);
});
for (const [score, grade] of [
  [0, "F"],
  [15, "D"],
  [18, "C"],
  [21, "B"],
  [24, "A"],
  [30, "A"],
  [31, null],
])
  test(`grade ${score} is ${grade}`, () =>
    assert.equal(gradeFromTotalScore(score), grade));
test("partial rubric is not displayed as a valid scoring policy", () =>
  assert.equal(normalizeRubric({ version: "broken" }), null));
