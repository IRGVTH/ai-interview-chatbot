import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Server } from 'node:http';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfReport } from './report-pdf';

const sample: PdfReport = {
  id: 'owned',
  title: 'Practice',
  interview: {
    title: 'IT Support',
    position: 'IT Support',
    experienceLevel: 'Student',
    difficulty: 'Easy',
  },
  evaluation: {
    communication: 8,
    technical: 7,
    confidence: 8,
    overall: 7.7,
    strengths: ['Clear answers'],
    improvements: ['More examples'],
    feedback: 'Good work',
    updatedAt: new Date(),
  },
};

describe('Report PDF endpoint', () => {
  let app: INestApplication;
  const getSessionReport = jest.fn<Promise<PdfReport>, [string, string]>();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: { getSessionReport } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: { id: string };
          }>();
          if (req.headers.authorization !== 'Bearer test-user') return false;
          req.user = { id: 'user-1' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => getSessionReport.mockReset());

  it('downloads a PDF attachment using the authenticated owner', async () => {
    getSessionReport.mockResolvedValue(sample);
    await request(app.getHttpServer() as Server)
      .get('/report/sessions/owned/pdf')
      .set('Authorization', 'Bearer test-user')
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect('Content-Disposition', /attachment/)
      .expect('Cache-Control', 'no-store');
    expect(getSessionReport).toHaveBeenCalledWith('user-1', 'owned');
  });
  it('requires authentication before retrieving a report', async () => {
    await request(app.getHttpServer() as Server)
      .get('/report/sessions/owned/pdf')
      .expect(403);
    expect(getSessionReport).not.toHaveBeenCalled();
  });
  it('returns 400 when there is no saved score', async () => {
    getSessionReport.mockResolvedValue({ ...sample, evaluation: null });
    await request(app.getHttpServer() as Server)
      .get('/report/sessions/owned/pdf')
      .set('Authorization', 'Bearer test-user')
      .expect(400);
  });
  it('does not export inaccessible sessions', async () => {
    getSessionReport.mockRejectedValue(
      new NotFoundException('Chat session not found'),
    );
    await request(app.getHttpServer() as Server)
      .get('/report/sessions/other-user/pdf')
      .set('Authorization', 'Bearer test-user')
      .expect(404);
  });
});
