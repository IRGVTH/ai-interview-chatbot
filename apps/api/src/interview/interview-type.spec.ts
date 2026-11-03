import { ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { InterviewService } from './interview.service';
import { ChatService } from '../chat/chat.service';
import { ReportService } from '../report/report.service';
import { GeminiService } from '../gemini/gemini.service';
import { PrismaService } from '../database/prisma.service';
import { interviewTypeContext } from './interview-type';

const types = ['HR', 'Technical', 'Coding', 'Behavioral'];
const form = {
  title: 'Practice',
  position: 'Developer',
  difficulty: 'easy',
  experienceLevel: '0-1',
};

describe('Interview type persistence and AI flow', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });

  it.each(types)(
    'validates and persists %s on create and update',
    async (interviewType) => {
      const create = jest
        .fn<Promise<unknown>, [{ data: { interviewType?: string } }]>()
        .mockResolvedValue({ id: 'interview-1', ...form, interviewType });
      const update = jest
        .fn<Promise<unknown>, [{ data: { interviewType?: string } }]>()
        .mockResolvedValue({ id: 'interview-1', ...form, interviewType });
      const findFirst = jest.fn().mockResolvedValue({ id: 'interview-1' });
      const db = {
        interview: { create, update, findFirst },
      } as unknown as PrismaService;
      const service = new InterviewService(db);
      const dto = (await pipe.transform(
        { ...form, interviewType },
        { type: 'body', metatype: CreateInterviewDto },
      )) as CreateInterviewDto;
      await service.create('user-1', dto);
      expect(create.mock.calls[0][0].data.interviewType).toBe(interviewType);
      const patch = { interviewType };
      await service.update('user-1', 'interview-1', patch);
      expect(update.mock.calls[0][0].data.interviewType).toBe(interviewType);
    },
  );

  it('rejects unsupported types without disabling strict validation', async () => {
    await expect(
      pipe.transform(
        { ...form, interviewType: 'Unknown' },
        { type: 'body', metatype: CreateInterviewDto },
      ),
    ).rejects.toThrow();
  });

  it('supports old clients and does not guess historical types', async () => {
    await expect(
      pipe.transform(form, { type: 'body', metatype: CreateInterviewDto }),
    ).resolves.toMatchObject(form);
    expect(interviewTypeContext(null)).toContain('Unspecified');
  });

  it.each(types)(
    'passes %s to normal chat, streamed chat and report evaluation',
    async (interviewType) => {
      const session = {
        id: 's1',
        title: 'Practice',
        messages: [
          {
            role: 'user',
            content: 'ผมวิเคราะห์ปัญหาตามขั้นตอนและทดสอบผล',
            createdAt: new Date('2026-11-03T05:00:00Z'),
          },
        ],
        memory: null,
        interview: { ...form, interviewType },
      };
      const db = {
        chatSession: {
          findFirst: jest.fn().mockResolvedValue(session),
          update: jest.fn().mockResolvedValue(session),
        },
        chatMessage: {
          create: jest.fn().mockResolvedValue({
            id: 'm1',
            role: 'assistant',
            content: 'Hello',
          }),
        },
        chatEvaluation: { upsert: jest.fn().mockResolvedValue({ overall: 8 }) },
      } as unknown as PrismaService;
      const ask = jest
        .fn<
          Promise<{ text: string; model: string; attempts: number }>,
          [string]
        >()
        .mockResolvedValue({
          text: JSON.stringify({
            language: 8,
            dimensionFeedback: {
              technical: 'ตอบได้ตรงประเด็นแต่ยังขาดตัวอย่าง',
              communication: 'อธิบายได้ชัดเจนแต่ยังไม่กระชับ',
              language: 'ใช้ภาษาสุภาพและเหมาะสมกับงาน',
              confidence: 'แสดงเหตุผลและบทบาทของตนได้ชัดเจน',
            },
            communication: 8,
            technical: 8,
            confidence: 8,
            overall: 8,
            strengths: ['ตอบตรงคำถาม'],
            improvements: ['เพิ่มตัวอย่าง'],
            feedback: 'Good',
          }),
          model: 'test',
          attempts: 1,
        });
      const stream = jest
        .fn<
          Promise<{
            stream: AsyncIterable<{ text: string }>;
            model: string;
            attempts: number;
          }>,
          [string]
        >()
        .mockResolvedValue({
          stream: (async function* () {
            yield await Promise.resolve({ text: 'Hello' });
          })(),
          model: 'test',
          attempts: 1,
        });
      const ai = { ask, stream } as unknown as GeminiService;
      const chat = new ChatService(db, ai);
      await chat.sendMessage('user-1', 's1', { content: 'Hello' });
      expect(ask.mock.calls[0][0]).toContain(
        `Interview type: ${interviewType}`,
      );
      const res = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;
      await chat.sendMessageStream('user-1', 's1', { content: 'Hello' }, res);
      expect(stream.mock.calls[0][0]).toContain(
        `Interview type: ${interviewType}`,
      );
      await new ReportService(db, ai).evaluateSession('user-1', 's1');
      expect(ask.mock.calls[1][0]).toContain(
        `Interview type: ${interviewType}`,
      );
      const report = await new ReportService(db, ai).getSessionReport(
        'user-1',
        's1',
      );
      expect(report.interview.interviewType).toBe(interviewType);
    },
  );
});
