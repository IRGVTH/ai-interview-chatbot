import { RUBRIC, parseRubricEvaluation, average30, grade30 } from './rubric';
const valid = {
  technical: 24,
  communication: 27,
  language: 21,
  confidence: 30,
  dimensionFeedback: Object.fromEntries(
    ['technical', 'communication', 'language', 'confidence'].map((k) => [
      k,
      'ตอบตามคำถามได้ชัดเจน แต่ยังขาดตัวอย่างเพื่อยืนยันเหตุผล',
    ]),
  ),
  strengths: ['ตอบตรงประเด็น'],
  improvements: ['เพิ่มตัวอย่าง'],
  feedback: 'ควรเพิ่มตัวอย่างจากประสบการณ์จริง',
};
describe('30-point rubric', () => {
  it('computes a 25.5/30 average from four /30 scores, ignoring AI overall', () => {
    const parsed = parseRubricEvaluation(
      JSON.stringify({ ...valid, overall: 0 }),
    );
    expect(parsed.overall).toBe(25.5);
    expect(average30(parsed)).toBe(25.5);
    expect(grade30(average30(parsed))).toBe('A');
    expect(RUBRIC.dimensions.reduce((sum, d) => sum + d.weight, 0)).toBe(1);
  });
  it.each([
    [0, 'F'],
    [14.99, 'F'],
    [15, 'D'],
    [18, 'C'],
    [21, 'B'],
    [24, 'A'],
    [30, 'A'],
  ])('grades %s as %s', (score, grade) =>
    expect(grade30(Number(score))).toBe(grade),
  );
  it('accepts genuine zero and full marks', () => {
    expect(
      average30({ technical: 0, communication: 0, language: 0, confidence: 0 }),
    ).toBe(0);
    expect(
      average30({
        technical: 30,
        communication: 30,
        language: 30,
        confidence: 30,
      }),
    ).toBe(30);
  });
  it('uses a direct /30 scale, so four 10-point scores average to 10, not 30', () => {
    const parsed = parseRubricEvaluation(
      JSON.stringify({
        ...valid,
        technical: 10,
        communication: 10,
        language: 10,
        confidence: 10,
      }),
    );
    expect(parsed.overall).toBe(10);
    expect(grade30(parsed.overall)).toBe('F');
    expect(RUBRIC.max).toBe(30);
  });
  it.each([null, '8', -1, 31])(
    'rejects invalid or missing language %s',
    (language) =>
      expect(() =>
        parseRubricEvaluation(JSON.stringify({ ...valid, language })),
      ).toThrow(),
  );
  it('requires a substantive reason for every dimension', () =>
    expect(() =>
      parseRubricEvaluation(
        JSON.stringify({
          ...valid,
          dimensionFeedback: { ...valid.dimensionFeedback, language: '' },
        }),
      ),
    ).toThrow());
  it('rejects malformed JSON and missing arrays', () => {
    expect(() => parseRubricEvaluation('not json')).toThrow();
    expect(() =>
      parseRubricEvaluation(JSON.stringify({ ...valid, strengths: null })),
    ).toThrow();
  });
});
