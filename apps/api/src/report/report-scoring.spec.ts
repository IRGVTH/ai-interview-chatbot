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
  technical: 24,
  communication: 27,
  language: 21,
  confidence: 30,
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
  const upsert = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({
    ...valid,
    overall: 25.5,
    rubricVersion: RUBRIC_VERSION,
  });
  const findFirst = jest.fn().mockResolvedValue(session);
  const db = {
    chatSession: { findFirst },
    chatEvaluation: { upsert },
  } as unknown as PrismaService;
  const ask = jest
    .fn<Promise<{ text: string }>, [string]>()
    .mockResolvedValue({ text });
  return {
    service: new ReportService(db, { ask } as unknown as GeminiService),
    upsert,
    findFirst,
    ask,
  };
}
describe('Report scoring persistence', () => {
  it('averages only current /30 session means and excludes old or stale evaluations', async () => {
    const first = {
      ...valid,
      rubricVersion: RUBRIC_VERSION,
      evaluatedThrough: at,
      overall: 25.5,
    };
    const second = {
      ...first,
      technical: 18,
      communication: 18,
      language: 18,
      confidence: 18,
      overall: 18,
    };
    const legacy = {
      ...first,
      rubricVersion: 'interview-30-v1',
      technical: 9,
      communication: 9,
      language: 9,
      confidence: 9,
      overall: 9,
    };
    const rows = [
      { ...session, evaluation: first },
      { ...session, evaluation: second },
      { ...session, evaluation: legacy },
      {
        ...session,
        evaluation: first,
        lastMessageAt: new Date(at.getTime() + 1000),
      },
    ];
    const db = {
      interview: { findMany: jest.fn().mockResolvedValue([]) },
      chatSession: { findMany: jest.fn().mockResolvedValue(rows) },
      chatEvaluation: {
        findMany: jest.fn().mockResolvedValue([first, second, legacy]),
      },
      chatMessage: { count: jest.fn().mockResolvedValue(4) },
    } as unknown as PrismaService;
    const overview = await new ReportService(
      db,
      {} as GeminiService,
    ).getOverview('u');
    expect(overview.averageOverall).toBe(21.75);
    expect(overview.scoreMax).toBe(30);
    expect(overview.sessions[0].evaluation?.totalScore).toBe(25.5);
    expect(overview.sessions[2].evaluation?.totalScore).toBeNull();
  });
  it('saves four /30 scores, their /30 mean, reasons and captured conversation timestamp', async () => {
    const { service, upsert, ask } = setup(
      JSON.stringify({ ...valid, overall: 0 }),
    );
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
    expect(args.update.overall).toBe(25.5);
    expect(args.update.language).toBe(21);
    expect(args.update.rubricVersion).toBe(RUBRIC_VERSION);
    expect(args.update.evaluatedThrough).toEqual(at);
    expect(args.update.dimensionFeedback).toEqual(valid.dimensionFeedback);
    expect(saved?.totalScore).toBe(25.5);
    expect(saved?.dimensionScoreMax).toBe(30);
    expect(saved?.scoreMax).toBe(30);
    expect(saved?.grade).toBe('A');
    expect(ask.mock.calls[0][0]).toContain('0..30 for EACH dimension');
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
