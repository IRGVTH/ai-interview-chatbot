/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- Supertest exposes untyped response bodies; these integration tests assert the actual HTTP contract. */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as PDFDocument from 'pdfkit';
import { AppModule } from '../src/app.module';
import { GeminiService } from '../src/gemini/gemini.service';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { RUBRIC } from '../src/report/rubric';
import type { GenerateContentConfig } from '@google/genai';
import { INTERVIEW_CLOSING_MESSAGE } from '../src/chat/interview-progress';

if (
  process.env.RTM_TEST_DATABASE !== '1' ||
  !process.env.DATABASE_URL?.includes('/rtm_test')
)
  throw new Error('Use pnpm test:rtm for an isolated disposable database');
const ai = {
  ask: jest.fn((prompt: string, config?: GenerateContentConfig) =>
    Promise.resolve({
      text: prompt.includes('Return ONLY JSON:')
        ? JSON.stringify({
            technical: 8,
            communication: 8,
            language: 8,
            confidence: 8,
            dimensionFeedback: {
              technical: 'คำตอบระบุ SELECT ตรงคำถาม',
              communication: 'อธิบายเป็นลำดับ',
              language: 'อ่านเข้าใจ',
              confidence: 'มีเหตุผลจากข้อความ ไม่ประเมินสภาพจิตใจ',
            },
            strengths: ['ตอบตรงคำถาม'],
            improvements: ['เพิ่มตัวอย่างกรณีผิดพลาด'],
            feedback: 'คำตอบตรงประเด็น',
            exampleAnswers: [
              {
                messageId: JSON.parse(prompt.split('Transcript: ')[1]).find(
                  (m: { role: string }) => m.role === 'user',
                ).id,
                answer: 'ใช้ SELECT เฉพาะข้อมูลจำเป็น',
              },
            ],
          })
        : JSON.stringify({
            interviewType: (
              config?.responseJsonSchema as {
                properties: { interviewType: { enum: string[] } };
              }
            ).properties.interviewType.enum[0],
            difficulty: (
              config?.responseJsonSchema as {
                properties: { difficulty: { enum: string[] } };
              }
            ).properties.difficulty.enum[0],
            question: 'กรุณาอธิบายการทดสอบ Login และโครงการ RTM-MOON-83 ครับ',
          }),
      model: 'test-model',
      attempts: 1,
    }),
  ),
};
describe('FR API regression with PGlite PostgreSQL and deterministic AI boundary', () => {
  let app: INestApplication,
    db: PrismaService,
    token: string,
    tokenB: string,
    interviewId: string,
    sessionId: string;
  const email = `rtm-${randomUUID()}@example.com`,
    password = 'Test-only-Password-47';
  const auth = (t = token) => ({ Authorization: `Bearer ${t}` });
  const setup = {
    title: 'RTM Thai QA',
    interviewType: 'Technical',
    position: 'QA Tester',
    experienceLevel: '0-1',
    difficulty: 'easy',
    summary: '',
  };
  beforeAll(async () => {
    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 1,
      }),
    });
    await client.$connect();
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(client)
      .overrideProvider(GeminiService)
      .useValue(ai)
      .compile();
    app = mod.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
  }, 30000);
  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });
  it('FR-01 registers, hashes password and never returns a password', async () => {
    const a = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'RTM A' })
      .expect(201);
    token = a.body.accessToken;
    expect(a.body.user.password).toBeUndefined();
    const row = await db.user.findUnique({ where: { email } });
    expect(row?.password).not.toBe(password);
    expect(row?.password).toMatch(/^\$2/);
    const b = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `b-${email}`, password, name: 'RTM B' })
      .expect(201);
    tokenB = b.body.accessToken;
  });
  it('FR-01 rejects duplicate normalized email and wrong credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email.toUpperCase(), password })
      .expect(409);
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-secret' })
      .expect(401);
    const absent = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `missing-${email}`, password })
      .expect(401);
    expect(wrong.body.message).toEqual(absent.body.message);
  });
  it('FR-01 concurrent registration reports a conflict instead of a server error', async () => {
    const body = { email: `race-${email}`, password };
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer()).post('/auth/register').send(body),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.user.count({ where: { email: body.email } })).toBe(1);
  });
  it('FR-01 logs in again and retains user identity', async () => {
    const r = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    token = r.body.accessToken;
    expect(r.body.user.email).toBe(email);
  });
  it('FR-02/03 rejects missing type, missing position and whitespace title', async () => {
    for (const patch of [
      { interviewType: '' },
      { position: '' },
      { title: '   ' },
    ])
      await request(app.getHttpServer())
        .post('/interviews')
        .set(auth())
        .send({ ...setup, ...patch })
        .expect(400);
  });
  it.each(['HR', 'Technical', 'Coding', 'Behavioral'])(
    'FR-02 saves and forwards %s context',
    async (type) => {
      const i = await request(app.getHttpServer())
        .post('/interviews')
        .set(auth())
        .send({ ...setup, interviewType: type })
        .expect(201);
      expect(i.body.interviewType).toBe(type);
      await request(app.getHttpServer())
        .post('/chat/sessions')
        .set(auth())
        .send({ interviewId: i.body.id })
        .expect(201);
      expect(ai.ask.mock.calls.at(-1)?.[0]).toContain(
        `"interviewType":"${type}"`,
      );
    },
  );
  it.each(['easy', 'medium', 'hard'])(
    'FR-04 persists and forwards %s difficulty',
    async (difficulty) => {
      const i = await request(app.getHttpServer())
        .post('/interviews')
        .set(auth())
        .send({ ...setup, difficulty })
        .expect(201);
      await request(app.getHttpServer())
        .post('/chat/sessions')
        .set(auth())
        .send({ interviewId: i.body.id })
        .expect(201);
      expect(ai.ask.mock.calls.at(-1)?.[0]).toContain(
        `"difficulty":"${difficulty}"`,
      );
    },
  );
  it('FR-03/05/17 starts with a saved first question, contextual resume, and status', async () => {
    const r = await request(app.getHttpServer())
      .post('/interviews')
      .set(auth())
      .send({
        ...setup,
        resumeText: 'Project RTM-MOON-83, stock validation',
        resumeFileName: 'synthetic.pdf',
      })
      .expect(201);
    interviewId = r.body.id;
    const s = await request(app.getHttpServer())
      .post('/chat/sessions')
      .set(auth())
      .send({ interviewId })
      .expect(201);
    sessionId = s.body.id;
    const detail = await request(app.getHttpServer())
      .get(`/chat/sessions/${sessionId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.messages[0].role).toBe('assistant');
    expect(detail.body.interview.status).toBe('in_progress');
    expect(detail.body.interview.startedAt).toBeTruthy();
    expect(ai.ask.mock.calls.at(-1)?.[0]).toContain('RTM-MOON-83');
  });
  it('FR-14 resumes instead of creating duplicate sessions', async () => {
    const s = await request(app.getHttpServer())
      .post('/chat/sessions')
      .set(auth())
      .send({ interviewId })
      .expect(201);
    expect(s.body.id).toBe(sessionId);
    expect(await db.chatSession.count({ where: { interviewId } })).toBe(1);
  });
  it('FR-07 rejects whitespace without saving a message', async () => {
    const n = await db.chatMessage.count({ where: { sessionId } });
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ content: '  ', requestId: randomUUID() })
      .expect(400);
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(n);
  });
  it('FR-06/07/14 sends a pair, replays idempotently, and isolates history', async () => {
    const body = {
      content: 'ใช้ SELECT id ตรวจข้อมูล RTM-ANSWER-47',
      requestId: randomUUID(),
    };
    const a = await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send(body)
      .expect(201);
    const calls = ai.ask.mock.calls.length;
    const b = await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send(body)
      .expect(201);
    expect(b.body.userMessage.id).toBe(a.body.userMessage.id);
    expect(ai.ask.mock.calls.length).toBe(calls);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ content: 'คำตอบที่สอง', requestId: randomUUID() })
      .expect(201);
    expect(ai.ask.mock.calls.at(-1)?.[0]).toContain('RTM-ANSWER-47');
    expect(a.body.assistantMessage.content).toBe(
      'กรุณาอธิบายการทดสอบ Login และโครงการ RTM-MOON-83 ครับ',
    );
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(5);
  });
  it('FR-07/14 rolls back a failed AI turn', async () => {
    const n = await db.chatMessage.count({ where: { sessionId } });
    ai.ask.mockRejectedValueOnce(new Error('provider unavailable'));
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ content: 'ลองใหม่', requestId: randomUUID() })
      .expect(500);
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(n);
  });
  it('FR-02/06/07 rejects type drift and coaching output without saving a half-turn', async () => {
    const i = await request(app.getHttpServer())
      .post('/interviews')
      .set(auth())
      .send({ ...setup, interviewType: 'HR', position: 'Cloud Engineer' })
      .expect(201);
    const s = await request(app.getHttpServer())
      .post('/chat/sessions')
      .set(auth())
      .send({ interviewId: i.body.id })
      .expect(201);
    for (const invalid of [
      'ยินดีด้วยครับ **Feedback:** ดีมาก **Follow-up Question (Behavioral - Easy):** จัดการเวลาอย่างไร?',
      JSON.stringify({
        interviewType: 'Behavioral',
        difficulty: 'easy',
        question: 'จัดการเวลาอย่างไร?',
      }),
      JSON.stringify({
        interviewType: 'HR',
        difficulty: 'easy',
        question: 'สนใจ Cloud เพราะอะไร?',
        feedback: 'ตอบดีมาก',
        betterExampleAnswer: 'ตัวอย่างคำตอบ',
      }),
    ]) {
      ai.ask.mockResolvedValueOnce({
        text: invalid,
        model: 'test-model',
        attempts: 1,
      });
      await request(app.getHttpServer())
        .post(`/chat/sessions/${s.body.id}/messages`)
        .set(auth())
        .send({
          content: 'สนใจ Cloud จากการ deploy โครงการ',
          requestId: randomUUID(),
        })
        .expect(502);
      expect(
        await db.chatMessage.count({ where: { sessionId: s.body.id } }),
      ).toBe(1);
      expect(
        (await db.chatSession.findUnique({ where: { id: s.body.id } }))
          ?.turnVersion,
      ).toBe(0);
    }
    const r = await request(app.getHttpServer())
      .post(`/chat/sessions/${s.body.id}/messages`)
      .set(auth())
      .send({
        content: 'สนใจ Cloud จากการ deploy โครงการ',
        requestId: randomUUID(),
      })
      .expect(201);
    expect(r.body.assistantMessage.content).not.toContain('interviewType');
    expect(ai.ask.mock.calls.at(-1)?.[1]?.systemInstruction).toContain(
      'Do not change them',
    );
    expect(ai.ask.mock.calls.at(-1)?.[1]?.responseMimeType).toBe(
      'application/json',
    );
  });
  it('FR-02/14 rejects an invalid first question before creating a session', async () => {
    const i = await request(app.getHttpServer())
      .post('/interviews')
      .set(auth())
      .send(setup)
      .expect(201);
    ai.ask.mockResolvedValueOnce({
      text: 'Feedback: เก่งมาก',
      model: 'test-model',
      attempts: 1,
    });
    await request(app.getHttpServer())
      .post('/chat/sessions')
      .set(auth())
      .send({ interviewId: i.body.id })
      .expect(502);
    expect(
      await db.chatSession.count({ where: { interviewId: i.body.id } }),
    ).toBe(0);
    expect(
      (await db.interview.findUnique({ where: { id: i.body.id } }))?.status,
    ).toBe('draft');
  });
  it('FR-01/06/14/17/18 denies another account and anonymous callers', async () => {
    for (const url of [
      `/interviews/${interviewId}`,
      `/chat/sessions/${sessionId}`,
      `/report/sessions/${sessionId}/evaluation`,
      `/report/sessions/${sessionId}/pdf`,
    ]) {
      await request(app.getHttpServer()).get(url).set(auth(tokenB)).expect(404);
      await request(app.getHttpServer()).get(url).expect(401);
    }
    await request(app.getHttpServer())
      .post(`/report/sessions/${sessionId}/complete`)
      .set(auth(tokenB))
      .expect(404);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth(tokenB))
      .send({ content: 'unauthorized', requestId: randomUUID() })
      .expect(404);
  });

  it('FR-07/14 stream transport returns saved content and safely replays the request', async () => {
    const body = { content: 'คำตอบผ่านหน้าจอแชต', requestId: randomUUID() };
    const n = await db.chatMessage.count({ where: { sessionId } });
    const a = await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages/stream`)
      .set(auth())
      .send(body)
      .expect(201);
    expect(a.text).toContain('กรุณาอธิบาย');
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages/stream`)
      .set(auth())
      .send(body)
      .expect(201);
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(n + 2);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ ...body, content: 'changed content' })
      .expect(409);
  });
  it('FR-03/04 freezes setup once practice has started', async () => {
    await request(app.getHttpServer())
      .patch(`/interviews/${interviewId}`)
      .set(auth())
      .send({ position: 'Another role' })
      .expect(400);
  });
  it('FR-07/14 concurrent sends commit one complete pair and reject stale history', async () => {
    const n = await db.chatMessage.count({ where: { sessionId } });
    const response = {
      text: JSON.stringify({
        interviewType: 'Technical',
        difficulty: 'easy',
        question: 'คำถามถัดไปจากคำตอบจริง',
      }),
      model: 'test-model',
      attempts: 1,
    };
    const releases: (() => void)[] = [];
    ai.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releases.push(() => resolve(response));
          if (releases.length === 2) releases.forEach((release) => release());
        }),
    );
    ai.ask.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releases.push(() => resolve(response));
          if (releases.length === 2) releases.forEach((release) => release());
        }),
    );
    const results = await Promise.all(
      ['A', 'B'].map((content) =>
        request(app.getHttpServer())
          .post(`/chat/sessions/${sessionId}/messages`)
          .set(auth())
          .send({ content, requestId: randomUUID() }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(n + 2);
    const rows = await db.chatMessage.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(rows[0].role).toBe('assistant');
    for (let i = 1; i < rows.length; i += 2) {
      expect(rows[i].role).toBe('user');
      expect(rows[i + 1].role).toBe('assistant');
      expect(rows[i + 1].createdAt.getTime()).toBeGreaterThan(
        rows[i].createdAt.getTime(),
      );
    }
  });
  it('FR-10/15/18 omits stale grades from averages and blocks stale PDF', async () => {
    await request(app.getHttpServer())
      .post(`/report/sessions/${sessionId}/evaluate`)
      .set(auth())
      .expect(201);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ content: 'คำตอบหลังประเมิน', requestId: randomUUID() })
      .expect(201);
    const r = await request(app.getHttpServer())
      .get('/report/overview')
      .set(auth())
      .expect(200);
    expect(r.body.averageOverall).toBeNull();
    expect(r.body.averageGrade).toBeNull();
    expect(r.body.excludedEvaluations).toBe(1);
    await request(app.getHttpServer())
      .get(`/report/sessions/${sessionId}/pdf`)
      .set(auth())
      .expect(400);
    await db.chatEvaluation.deleteMany({ where: { sessionId } });
  });
  it('FR-10/12 rejects malformed scores without completing the interview', async () => {
    ai.ask.mockResolvedValueOnce({
      text: '{"technical":null}',
      model: 'test-model',
      attempts: 1,
    });
    await request(app.getHttpServer())
      .post(`/report/sessions/${sessionId}/complete`)
      .set(auth())
      .expect(502);
    expect(
      await db.chatEvaluation.findUnique({ where: { sessionId } }),
    ).toBeNull();
    expect(
      (await db.interview.findUnique({ where: { id: interviewId } }))?.status,
    ).toBe('in_progress');
  });
  it('FR-09/10/11/12/13/16 completes atomically with rubric, four reasons and grounded examples', async () => {
    const r = await request(app.getHttpServer())
      .post(`/report/sessions/${sessionId}/complete`)
      .set(auth())
      .expect(201);
    expect(r.body.rubricVersion).toBe(RUBRIC.version);
    expect(r.body.overall).toBe(8);
    expect(r.body.grade).toBe('A');
    expect(Object.keys(r.body.dimensionFeedback)).toHaveLength(4);
    expect(r.body.exampleAnswers[0].originalAnswer).toContain('SELECT');
    const i = await db.interview.findUnique({ where: { id: interviewId } });
    expect(i?.status).toBe('completed');
    expect(i?.finishedAt).toBeTruthy();
    const closed = await db.chatMessage.findMany({
      where: { sessionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(closed.at(-1)?.content).toBe(INTERVIEW_CLOSING_MESSAGE);
    await request(app.getHttpServer())
      .post(`/report/sessions/${sessionId}/complete`)
      .set(auth())
      .expect(201);
    expect(await db.chatMessage.count({ where: { sessionId } })).toBe(
      closed.length,
    );
  });
  it('FR-12 completed sessions reject new messages and retain their evaluation', async () => {
    await request(app.getHttpServer())
      .post(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .send({ content: 'late', requestId: randomUUID() })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/chat/sessions/${sessionId}/messages`)
      .set(auth())
      .expect(400);
  });
  it('FR-14/15 re-login retrieves the same history and reconciles totals', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const r = await request(app.getHttpServer())
      .get('/report/overview')
      .set(auth(login.body.accessToken))
      .expect(200);
    expect(r.body.totalInterviews).toBe(10);
    expect(r.body.averageOverall).toBe(8);
    expect(r.body.averageGrade).toBe('A');
    expect(
      r.body.sessions.find((s: { id: string }) => s.id === sessionId).evaluation
        .grade,
    ).toBe('A');
    expect(r.body.evaluations[0].sessionId).toBe(sessionId);
    expect(r.body.totalMessages).toBe(await db.chatMessage.count());
  });
  it('FR-18 exports an authenticated PDF with an embedded Thai font', async () => {
    const r = await request(app.getHttpServer())
      .get(`/report/sessions/${sessionId}/pdf`)
      .set(auth())
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
    expect(r.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(r.body.toString('latin1')).toContain('/FontFile2');
    writeFileSync(join(tmpdir(), 'rtm-report-verification.pdf'), r.body);
  });
  it('FR-17 rejects unreadable and unsupported files with an actionable error', async () => {
    await request(app.getHttpServer())
      .post('/resumes/parse')
      .set(auth())
      .attach('file', Buffer.from('not a pdf'), {
        filename: 'bad.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/resumes/parse')
      .set(auth())
      .attach('file', Buffer.from('text'), {
        filename: 'bad.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });
  it('FR-17 extracts a real DOCX including Thai text', async () => {
    const r = await request(app.getHttpServer())
      .post('/resumes/parse')
      .set(auth())
      .attach('file', join(__dirname, 'fixtures', 'synthetic-resume.docx'), {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);
    expect(r.body.text).toContain('RTM-MOON-83');
    expect(r.body.text).toContain('ทดสอบระบบ');
  });
  it('FR-17 extracts a real text PDF', async () => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    const buf = new Promise<Buffer>((resolve) => {
      doc.on('data', (b) => chunks.push(b));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
    doc.text('Synthetic resume RTM-MOON-83 QA Tester');
    doc.end();
    const r = await request(app.getHttpServer())
      .post('/resumes/parse')
      .set(auth())
      .attach('file', await buf, {
        filename: 'valid.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    expect(r.body.text).toContain('RTM-MOON-83');
  });
  it('FR-12 automatically closes after ten answers, includes the final answer and safely retries scoring', async () => {
    const i = await request(app.getHttpServer())
      .post('/interviews')
      .set(auth())
      .send(setup)
      .expect(201);
    const s = await request(app.getHttpServer())
      .post('/chat/sessions')
      .set(auth())
      .send({ interviewId: i.body.id })
      .expect(201);
    for (let n = 1; n <= 9; n++) {
      const r = await request(app.getHttpServer())
        .post(`/chat/sessions/${s.body.id}/messages`)
        .set(auth())
        .send({ content: `คำตอบข้อ ${n} SELECT`, requestId: randomUUID() })
        .expect(201);
      if (n === 9)
        expect(r.body.assistantMessage.content).toContain('คำถามสุดท้าย');
    }
    expect(
      (await db.interview.findUnique({ where: { id: i.body.id } }))?.status,
    ).toBe('in_progress');
    const final = {
      content: 'FINAL-ANSWER-10 ใช้ SELECT และตรวจ input',
      requestId: randomUUID(),
    };
    ai.ask.mockResolvedValueOnce({
      text: '{"technical":null}',
      model: 'test-model',
      attempts: 1,
    });
    await request(app.getHttpServer())
      .post(`/chat/sessions/${s.body.id}/messages/stream`)
      .set(auth())
      .send(final)
      .expect(502);
    expect(
      await db.chatMessage.count({ where: { sessionId: s.body.id } }),
    ).toBe(19);
    expect(
      await db.chatEvaluation.count({ where: { sessionId: s.body.id } }),
    ).toBe(0);
    const defaultAsk = ai.ask.getMockImplementation();
    if (!defaultAsk) throw new Error('AI fixture missing');
    ai.ask.mockImplementationOnce(async (prompt, config) => {
      const result = await defaultAsk(prompt, config);
      const evaluation = JSON.parse(result.text);
      const transcript = JSON.parse(prompt.split('Transcript: ')[1]);
      evaluation.exampleAnswers[0].messageId = transcript.at(-1).id;
      return { ...result, text: JSON.stringify(evaluation) };
    });
    const r = await request(app.getHttpServer())
      .post(`/chat/sessions/${s.body.id}/messages/stream`)
      .set(auth())
      .send(final)
      .expect(201);
    expect(r.text).toBe(INTERVIEW_CLOSING_MESSAGE);
    const lastPrompt = ai.ask.mock.calls.at(-1)?.[0];
    expect(lastPrompt).toContain('Return ONLY JSON:');
    expect(lastPrompt).toContain('FINAL-ANSWER-10');
    const calls = ai.ask.mock.calls.length;
    const replay = await request(app.getHttpServer())
      .post(`/chat/sessions/${s.body.id}/messages/stream`)
      .set(auth())
      .send(final)
      .expect(201);
    expect(replay.text).toBe(r.text);
    expect(ai.ask.mock.calls.length).toBe(calls);
    expect(
      await db.chatMessage.count({ where: { sessionId: s.body.id } }),
    ).toBe(21);
    const report = await request(app.getHttpServer())
      .get(`/report/sessions/${s.body.id}/evaluation`)
      .set(auth())
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/chat/sessions/${s.body.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.questionLimit).toBe(10);
    expect(detail.body.interview.status).toBe('completed');
    expect(detail.body.interview.finishedAt).toBeTruthy();
    expect(report.body.grade).toBe('A');
    expect(report.body.sourceTurnVersion).toBe(detail.body.turnVersion);
    expect(report.body.exampleAnswers[0].originalAnswer).toBe(final.content);
    await request(app.getHttpServer())
      .post(`/chat/sessions/${s.body.id}/messages`)
      .set(auth())
      .send({ content: 'ข้อที่ 11', requestId: randomUUID() })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/report/sessions/${s.body.id}/pdf`)
      .set(auth())
      .expect(200);
  });
  it('FR-12 completes an existing over-limit room without asking another question', async () => {
    const owner = await db.user.findUniqueOrThrow({ where: { email } });
    const i = await db.interview.create({
      data: { ...setup, userId: owner.id, status: 'in_progress' },
    });
    const s = await db.chatSession.create({
      data: {
        userId: owner.id,
        interviewId: i.id,
        turnVersion: 12,
        messages: {
          create: Array.from({ length: 12 }, (_, n) => ({
            role: 'user',
            content: `คำตอบเดิม ${n + 1} SELECT`,
          })),
        },
      },
    });
    const detail = await request(app.getHttpServer())
      .get(`/chat/sessions/${s.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.questionLimit).toBe(10);
    const r = await request(app.getHttpServer())
      .post(`/report/sessions/${s.id}/complete`)
      .set(auth())
      .expect(201);
    expect(r.body.grade).toBe('A');
    expect(
      (await db.interview.findUnique({ where: { id: i.id } }))?.status,
    ).toBe('completed');
    expect(
      await db.chatMessage.count({
        where: { sessionId: s.id, content: INTERVIEW_CLOSING_MESSAGE },
      }),
    ).toBe(1);
  });
  it('FR-12 concurrent final answers save only one closure and evaluation', async () => {
    const owner = await db.user.findUniqueOrThrow({ where: { email } });
    const i = await db.interview.create({
      data: { ...setup, userId: owner.id, status: 'in_progress' },
    });
    const s = await db.chatSession.create({
      data: {
        userId: owner.id,
        interviewId: i.id,
        turnVersion: 9,
        messages: {
          create: Array.from({ length: 9 }, (_, n) => ({
            role: 'user',
            content: `คำตอบ ${n + 1} SELECT`,
          })),
        },
      },
    });
    const defaultAsk = ai.ask.getMockImplementation();
    if (!defaultAsk) throw new Error('AI fixture missing');
    const releases: (() => void)[] = [];
    const gated = async (prompt: string, config?: GenerateContentConfig) => {
      const result = await defaultAsk(prompt, config);
      await new Promise<void>((resolve) => {
        releases.push(resolve);
        if (releases.length === 2) releases.forEach((release) => release());
      });
      return result;
    };
    ai.ask.mockImplementationOnce(gated).mockImplementationOnce(gated);
    const results = await Promise.all(
      ['FINAL-A', 'FINAL-B'].map((content) =>
        request(app.getHttpServer())
          .post(`/chat/sessions/${s.id}/messages`)
          .set(auth())
          .send({ content, requestId: randomUUID() }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db.chatMessage.count({ where: { sessionId: s.id, role: 'user' } }),
    ).toBe(10);
    expect(
      await db.chatMessage.count({
        where: { sessionId: s.id, content: INTERVIEW_CLOSING_MESSAGE },
      }),
    ).toBe(1);
    expect(await db.chatEvaluation.count({ where: { sessionId: s.id } })).toBe(
      1,
    );
    expect(
      (await db.interview.findUnique({ where: { id: i.id } }))?.status,
    ).toBe('completed');
  });
});
