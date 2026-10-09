import { parseInterviewResponse } from './interview-response';

const context = { interviewType: 'HR', difficulty: 'easy' };
const valid = {
  ...context,
  question:
    'จากการ deploy โครงการ อะไรทำให้คุณสนใจตำแหน่ง Cloud Engineer ครับ?',
};

describe('Interview question contract', () => {
  it('renders only the trimmed question from the structured response', () => {
    expect(
      parseInterviewResponse(
        JSON.stringify({ ...valid, question: ` ${valid.question} ` }),
        context,
      ),
    ).toBe(valid.question);
  });
  it.each([
    'ยินดีด้วยครับ **Feedback:** ตอบดีมาก **Better Example Answer:** ตัวอย่าง',
    '```json\n' + JSON.stringify(valid) + '\n```',
    'null',
    '[]',
    JSON.stringify({ ...valid, interviewType: 'Behavioral' }),
    JSON.stringify({ ...valid, difficulty: 'hard' }),
    JSON.stringify({ ...valid, question: '   ' }),
    JSON.stringify({ ...valid, question: ['คำถาม'] }),
    JSON.stringify({ ...valid, question: 'ก'.repeat(4001) }),
    JSON.stringify({ ...valid, feedback: 'ดีมาก' }),
  ])('rejects malformed, mismatched or coaching payloads: %s', (text) => {
    expect(() => parseInterviewResponse(text, context)).toThrow();
  });
  it('preserves code needed to understand a Coding question', () => {
    const coding = { interviewType: 'Coding', difficulty: 'medium' };
    const question =
      'โค้ดนี้ใช้เวลาทำงานเท่าใดครับ?\n```js\nfor (let i = 0; i < n; i++) work(i);\n```';
    expect(
      parseInterviewResponse(JSON.stringify({ ...coding, question }), coding),
    ).toBe(question);
  });
});
