import { parseEvaluation, gradeFromScore } from './rubric';
const valid = () => ({
  technical: 8,
  communication: 6,
  language: 10,
  confidence: 8,
  overall: 999,
  dimensionFeedback: {
    technical: 'ถูกต้อง',
    communication: 'ชัดเจน',
    language: 'เข้าใจง่าย',
    confidence: 'อธิบายเหตุผล',
  },
  strengths: ['ตอบตรงคำถาม'],
  improvements: ['เพิ่มตัวอย่าง'],
  feedback: 'สอดคล้องกับคำตอบ',
  exampleAnswers: [
    { messageId: 'answer-1', answer: 'ตัวอย่างโดยไม่แต่งประสบการณ์' },
  ],
});
describe('Versioned rubric validation (FR-09/10/11/13/16)', () => {
  it('computes the published equal-weight overall instead of trusting a model total', () =>
    expect(parseEvaluation(JSON.stringify(valid()), ['answer-1']).overall).toBe(
      8,
    ));
  it.each([null, '9', -1, 11])(
    'rejects invalid scores instead of fabricating a score: %s',
    (value) =>
      expect(() =>
        parseEvaluation(JSON.stringify({ ...valid(), technical: value }), [
          'answer-1',
        ]),
      ).toThrow(),
  );
  it('accepts genuine zero', () =>
    expect(
      parseEvaluation(JSON.stringify({ ...valid(), technical: 0 }), [
        'answer-1',
      ]).technical,
    ).toBe(0));
  it('rejects missing dimension reasons', () =>
    expect(() =>
      parseEvaluation(JSON.stringify({ ...valid(), dimensionFeedback: {} }), [
        'answer-1',
      ]),
    ).toThrow());
  it('rejects missing actionable improvements', () =>
    expect(() =>
      parseEvaluation(JSON.stringify({ ...valid(), improvements: [] }), [
        'answer-1',
      ]),
    ).toThrow());
  it('rejects examples for a message outside this session', () =>
    expect(() =>
      parseEvaluation(JSON.stringify(valid()), ['other-answer']),
    ).toThrow());
  it('rejects broken JSON', () =>
    expect(() => parseEvaluation('not JSON', ['answer-1'])).toThrow());
});

describe('Practice grades', () => {
  it.each([
    [10, 'A'],
    [8, 'A'],
    [7.99, 'B'],
    [7, 'B'],
    [6.99, 'C'],
    [6, 'C'],
    [5.99, 'D'],
    [5, 'D'],
    [4.99, 'F'],
    [0, 'F'],
  ])('maps boundary %s to %s', (score, grade) =>
    expect(gradeFromScore(score)).toBe(grade),
  );
  it.each([null, undefined, NaN, Infinity, -1, 11])(
    'does not grade missing/invalid score %s',
    (score) => expect(gradeFromScore(score)).toBeNull(),
  );
  it('does not pass arbitrary model fields to persistence', () =>
    expect(
      parseEvaluation(
        JSON.stringify({
          ...valid(),
          sessionId: 'foreign-session',
          rawResponse: 'injected',
        }),
        ['answer-1'],
      ),
    ).not.toHaveProperty('sessionId'));
});
