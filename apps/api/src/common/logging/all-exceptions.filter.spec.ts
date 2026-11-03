import {
  Controller,
  Get,
  INestApplication,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Server } from 'node:http';
import { AllExceptionsFilter } from './all-exceptions.filter';

@Controller()
class FailureController {
  @Get('gemini')
  gemini() {
    throw new ServiceUnavailableException({
      code: 'GEMINI_QUOTA_EXCEEDED',
      message: 'Gemini quota or billing limit reached.',
    });
  }

  @Get('unauthorized')
  unauthorized() {
    throw new UnauthorizedException();
  }

  @Get('unexpected')
  unexpected() {
    throw new Error('private provider details');
  }
}

describe('AllExceptionsFilter HTTP responses', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FailureController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes Gemini guidance where the chat reader expects a string', async () => {
    await request(app.getHttpServer() as Server)
      .get('/gemini')
      .expect(503)
      .expect({
        statusCode: 503,
        code: 'GEMINI_QUOTA_EXCEEDED',
        message: 'Gemini quota or billing limit reached.',
      });
  });

  it('preserves authentication errors at the top level', async () => {
    await request(app.getHttpServer() as Server)
      .get('/unauthorized')
      .expect(401)
      .expect({
        statusCode: 401,
        message: 'Unauthorized',
      });
  });

  it('does not return private details for unexpected exceptions', async () => {
    await request(app.getHttpServer() as Server)
      .get('/unexpected')
      .expect(500)
      .expect({
        statusCode: 500,
        message: 'Internal server error',
      });
  });
});
