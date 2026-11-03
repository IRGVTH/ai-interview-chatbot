import { ReportService } from './report.service';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { RUBRIC_VERSION } from './rubric';
import { ServiceUnavailableException } from '@nestjs/common';
const at = new Date('2026-11-03T05:00:00Z');
const session = {
  id: 's',
  lastMessageAt: at,
  messages: [
    {
      role: 'user',
      content: 'ผมตรวจสอบปัญหาทีละขั้นตอนแล้วทดสอบผล',
      createdAt: at,
    },
  ],
  interview: {
    title: 'Practice',
    position: 'IT Support',
    interviewType: 'HR',
    experienceLevel: '0-1',
    difficulty: 'easy',
  },
};
const valid = {
  technical: 8,
  communication: 8,
  language: 8,
  confidence: 8,
  dimensionFeedback: Object.fromEntries(
    ['technical', 'communication', 'language', 'confidence'].map((key) => [
      key,
      'ตอบได้ตรงคำถามและใช้เหตุผลชัดเจน แต่ยังขาดตัวอย่างจากประสบการณ์จริง',
    ]),
  ),
  strengths: ['ตรงประเด็น'],
  improvements: ['เพิ่มตัวอย่าง'],
  feedback: 'สรุปได้ชัดเจน',
};
function setup(text: string) {
  const upsert = jest
    .fn<Promise<unknown>, [unknown]>()
    .mockResolvedValue({ ...valid, overall: 8, rubricVersion: RUBRIC_VERSION });
  const findFirst = jest.fn().mockResolvedValue(session);
  const db = {
    chatSession: { findFirst },
    chatEvaluation: { upsert },
  } as unknown as PrismaService;
  const ask = jest.fn().mockResolvedValue({ text });
  return {
    service: new ReportService(db, { ask } as unknown as GeminiService),
    upsert,
    findFirst,
    ask,
  };
}
describe('Report scoring persistence', () => {
  it('saves four scores, reasons, rubric snapshot and captured conversation timestamp', async () => {
    const { service, upsert } = setup(JSON.stringify({ ...valid, overall: 0 }));
    const saved = await service.evaluateSession('u', 's');
    expect(upsert).toHaveBeenCalledTimes(1);
    const args = upsert.mock.calls[0][0] as {
      update: {
        overall: number;
        language: number;
        rubricVersion: string;
        evaluatedThrough: Date;
        dimensionFeedback: unknown;
        rubricSnapshot: unknown;
      };
    };
    expect(args.update.overall).toBe(8);
    expect(args.update.language).toBe(8);
    expect(args.update.rubricVersion).toBe(RUBRIC_VERSION);
    expect(args.update.evaluatedThrough).toEqual(at);
    expect(args.update.dimensionFeedback).toEqual(valid.dimensionFeedback);
    expect(saved?.totalScore).toBe(24);
  });
  it('leaves prior evaluation untouched if AI omits a dimension or reason', async () => {
    const { service, upsert } = setup(
      JSON.stringify({ ...valid, language: null }),
    );
    await expect(service.evaluateSession('u', 's')).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
  it('requires user answers and does not call AI for empty conversations', async () => {
    const { service, findFirst, ask } = setup(JSON.stringify(valid));
    findFirst.mockResolvedValue({ ...session, messages: [] });
    await expect(service.evaluateSession('u', 's')).rejects.toThrow();
    expect(ask).not.toHaveBeenCalled();
  });
  it('keeps the saved legacy score when every Gemini model is unavailable', async () => {
    const { service, ask, upsert } = setup(JSON.stringify(valid));
    const unavailable = new ServiceUnavailableException({
      code: 'GEMINI_UNAVAILABLE',
      message: 'บริการ AI ไม่พร้อมใช้งานชั่วคราว',
    });
    ask.mockRejectedValueOnce(unavailable);
    await expect(service.evaluateSession('u', 's')).rejects.toBe(unavailable);
    expect(upsert).not.toHaveBeenCalled();
  });
});
