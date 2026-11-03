import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { GeminiService } from './gemini.service';

const generateContent = jest.fn<
  Promise<{ text: string }>,
  [{ model: string; contents: string }]
>();
const generateContentStream = jest.fn<
  Promise<AsyncIterable<{ text: string }>>,
  [{ model: string; contents: string }]
>();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent, generateContentStream },
  })),
}));

describe('GeminiService provider failures', () => {
  function service(settings: Record<string, string> = {}) {
    return new GeminiService(
      new ConfigService({
        GEMINI_API_KEY: 'test-key',
        ...settings,
      }),
    );
  }

  beforeEach(() => {
    generateContent.mockReset();
    generateContentStream.mockReset();
  });

  it('uses configured models and falls back on a missing model', async () => {
    generateContent
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ text: 'First interview question' });
    const result = await service({
      GEMINI_MODEL: 'models/primary',
      GEMINI_FALLBACK_MODELS: ' secondary, secondary, ',
    }).ask('Start');
    expect(result.model).toBe('secondary');
    expect(
      generateContent.mock.calls.map(([request]) => request.model),
    ).toEqual(['models/primary', 'secondary']);
  });

  it.each(['ask', 'stream'] as const)(
    '%s stops on invalid credentials and does not leak provider details',
    async (method) => {
      generateContent.mockRejectedValue({
        status: '403',
        message: 'secret-key',
      });
      generateContentStream.mockRejectedValue({
        status: '403',
        message: 'secret-key',
      });
      try {
        await service()[method]('Start');
        throw new Error('Expected provider failure');
      } catch (error: unknown) {
        if (!(error instanceof HttpException)) throw error;
        expect(error.getResponse()).toMatchObject({
          code: 'GEMINI_CONFIGURATION_ERROR',
        });
        expect(JSON.stringify(error.getResponse())).not.toContain('secret-key');
      }
      expect(
        method === 'ask' ? generateContent : generateContentStream,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it('retries quota failures then returns actionable quota guidance', async () => {
    jest.useFakeTimers();
    try {
      generateContent.mockRejectedValue({ error: { code: 429 } });
      const pending = expect(
        service({ GEMINI_FALLBACK_MODELS: '' }).ask('Start'),
      ).rejects.toMatchObject({ response: { code: 'GEMINI_QUOTA_EXCEEDED' } });
      await jest.runAllTimersAsync();
      await pending;
      expect(generateContent).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('streams using the fallback when the primary is unavailable', async () => {
    const chunks = (async function* () {
      yield await Promise.resolve({ text: 'Hello' });
    })();
    generateContentStream
      .mockRejectedValueOnce({ status: 404 })
      .mockResolvedValueOnce(chunks);
    const result = await service().stream('Start');
    expect(result.model).toBe('gemini-3.5-flash-lite');
    expect(result.stream).toBe(chunks);
  });

  it('reports missing models after all fallbacks fail', async () => {
    generateContent.mockRejectedValue({ status: 404 });
    await expect(service().ask('Start')).rejects.toMatchObject({
      response: { code: 'GEMINI_MODEL_UNAVAILABLE' },
    });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it.each(['ask', 'stream'] as const)(
    '%s switches away from an overloaded primary before retrying it',
    async (method) => {
      const chunks = (async function* () {
        yield await Promise.resolve({ text: 'Hello' });
      })();
      generateContent
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce({ text: 'Evaluation JSON' });
      generateContentStream
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce(chunks);
      const result = await service()[method]('Evaluate');
      expect(result.model).toBe('gemini-3.5-flash-lite');
      const calls = method === 'ask' ? generateContent : generateContentStream;
      expect(calls.mock.calls.map(([request]) => request.model)).toEqual([
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
      ]);
    },
  );

  it('still retries the final overloaded model and returns an unavailable error', async () => {
    jest.useFakeTimers();
    try {
      generateContent.mockRejectedValue({ status: 503 });
      const pending = expect(service().ask('Evaluate')).rejects.toMatchObject({
        response: { code: 'GEMINI_UNAVAILABLE' },
      });
      await jest.runAllTimersAsync();
      await pending;
      expect(
        generateContent.mock.calls.map(([request]) => request.model),
      ).toEqual([
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.8-flash',
        'gemini-3.8-flash',
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
