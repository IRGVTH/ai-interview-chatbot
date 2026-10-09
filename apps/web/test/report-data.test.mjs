import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOverview,
  normalizeRubric,
  isEvaluationCurrent,
} from "../components/report/report-data.ts";
const evaluation = {
  id: "evaluation-1",
  overall: 8,
  technical: 8,
  communication: 8,
  confidence: 8,
  strengths: ["ชัดเจน"],
  improvements: ["เพิ่มตัวอย่าง"],
  feedback: "คำแนะนำเดิม",
};
const session = {
  id: "session-1",
  createdAt: "2026-10-09T10:00:00Z",
  interview: {
    title: "ฝึก QA",
    position: "QA Tester",
    difficulty: "easy",
    status: "in_progress",
  },
  evaluation,
};
const legacy = {
  totalInterviews: 1,
  totalSessions: 1,
  totalMessages: 3,
  averageOverall: 8,
  sessions: [session],
};
const rubric = {
  version: "thai-interview-v1",
  min: 0,
  max: 10,
  anchors: "เกณฑ์จริง",
  limitation: "จากข้อความ",
  dimensions: ["technical", "communication", "language", "confidence"].map(
    (key) => ({ key, label: key, weight: 0.25 }),
  ),
};
const current = () => ({
  ...legacy,
  rubric,
  sessions: [
    {
      ...session,
      turnVersion: 2,
      evaluation: {
        ...evaluation,
        language: 8,
        rubricVersion: rubric.version,
        sourceTurnVersion: 2,
        rubricSnapshot: rubric,
      },
    },
  ],
});
test("legacy API lacking rubric/gradeScale renders normalized report instead of crashing", () => {
  const data = normalizeOverview(legacy);
  assert.equal(data.legacyApi, true);
  assert.ok(data.gradeScale.description);
  assert.equal(data.rubric.dimensions.length, 4);
  assert.equal(data.sessions[0].evaluation.overall, 8);
  assert.equal(data.sessions[0].evaluation.grade, "A");
  assert.equal(data.sessions[0].evaluation.language, null);
  assert.equal(isEvaluationCurrent(data.sessions[0]), false);
  assert.equal(data.averageOverall, null);
  assert.equal(data.averageGrade, null);
  assert.equal(data.excludedEvaluations, 1);
});
test("no history and old average zero do not fabricate an F grade", () => {
  const data = normalizeOverview({
    ...legacy,
    sessions: [],
    totalInterviews: 0,
    totalSessions: 0,
    totalMessages: 0,
    averageOverall: 0,
  });
  assert.deepEqual(data.sessions, []);
  assert.equal(data.averageGrade, null);
});
test("current API preserves score and computes grade/average from eligible records", () => {
  const data = normalizeOverview(current());
  assert.equal(data.legacyApi, false);
  assert.equal(data.averageOverall, 8);
  assert.equal(data.averageGrade, "A");
  assert.equal(isEvaluationCurrent(data.sessions[0]), true);
});
test("stale evaluation is excluded and cannot be mistaken for current", () => {
  const input = current();
  input.sessions[0].turnVersion = 3;
  const data = normalizeOverview(input);
  assert.equal(data.averageGrade, null);
  assert.equal(data.excludedEvaluations, 1);
  assert.equal(isEvaluationCurrent(data.sessions[0]), false);
});
test("legacy null versions are never equal-valid versions", () => {
  const data = normalizeOverview({
    ...legacy,
    sessions: [
      {
        ...session,
        turnVersion: null,
        evaluation: { ...evaluation, sourceTurnVersion: null },
      },
    ],
  });
  assert.equal(isEvaluationCurrent(data.sessions[0]), false);
});
test("a rubric from before grade support gets the published display scale", () => {
  const normalized = normalizeRubric(rubric);
  assert.ok(normalized.gradeScale.description);
  assert.equal(normalized.version, rubric.version);
});
test("partial rubric is not presented as a complete scoring policy", () => {
  assert.equal(normalizeRubric({ version: "v1" }), null);
  assert.equal(normalizeRubric({ ...rubric, dimensions: null }), null);
});
test("invalid overall scores are not coerced, clamped or graded", () => {
  for (const overall of [null, "8", -1, 11, NaN])
    assert.equal(
      normalizeOverview({
        ...legacy,
        sessions: [{ ...session, evaluation: { ...evaluation, overall } }],
      }).sessions[0].evaluation.grade,
      null,
    );
});
test("genuine zero remains a valid F", () =>
  assert.equal(
    normalizeOverview({
      ...legacy,
      sessions: [{ ...session, evaluation: { ...evaluation, overall: 0 } }],
    }).sessions[0].evaluation.grade,
    "F",
  ));
test("malformed overview is rejected before being stored in render state", () => {
  for (const payload of [
    null,
    {},
    "text",
    { sessions: null },
    { sessions: [null] },
  ])
    assert.throws(() => normalizeOverview(payload), /รายงาน|สัมภาษณ์/);
});
test("null feedback arrays and examples are safe to render", () => {
  const data = normalizeOverview({
    ...legacy,
    sessions: [
      {
        ...session,
        evaluation: {
          ...evaluation,
          strengths: null,
          improvements: {},
          exampleAnswers: [null],
        },
      },
    ],
  });
  assert.deepEqual(data.sessions[0].evaluation.strengths, []);
  assert.deepEqual(data.sessions[0].evaluation.improvements, []);
  assert.deepEqual(data.sessions[0].evaluation.exampleAnswers, []);
});
