import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

type GeminiModel = 'gemini-3.1-flash-lite' | 'gemini-3.7-flash';
type StreamChunk = { text?: string };

type RetryableGeminiError = {
  status?: unknown;
  error?: {
    code?: unknown;
  };
  name?: string;
  stack?: string;
};

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;
  private readonly models: GeminiModel[] = [
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
  ];
  private formatStatus(status: unknown) {
    return typeof status === 'string' || typeof status === 'number'
      ? String(status)
      : 'unknown';
  }
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async ask(prompt: string) {
    const maxAttemptsPerModel = 3;
    const requestTimeoutMs = 25_000;

    let lastError: unknown;

    for (const model of this.models) {
      for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
        try {
          this.logger.log(`Gemini ask start model=${model} attempt=${attempt}`);

          const response = await this.withTimeout(
            this.ai.models.generateContent({
              model,
              contents: prompt,
            }),
            requestTimeoutMs,
          );

          this.logger.log(
            `Gemini ask success model=${model} attempt=${attempt}`,
          );

          return {
            text: response.text ?? '',
            model,
            attempts: attempt,
          };
        } catch (error: unknown) {
          lastError = error;

          const { status, isRetryable } = this.getRetryInfo(error, true);

          this.logger.warn(
            `Gemini ask failed model=${model} attempt=${attempt} status=${this.formatStatus(
              status,
            )} retryable=${isRetryable}`,
          );

          if (!isRetryable || attempt === maxAttemptsPerModel) {
            break;
          }

          const delayMs = this.getBackoffDelayMs(attempt);
          this.logger.warn(
            `Gemini ask retry model=${model} nextAttempt=${attempt + 1} delay=${delayMs}ms`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    this.logger.error(
      'Gemini final error',
      lastError instanceof Error ? lastError.stack : undefined,
    );
    throw new InternalServerErrorException('Gemini request failed');
  }

  async stream(prompt: string) {
    const maxAttemptsPerModel = 3;
    let lastError: unknown;

    for (const model of this.models) {
      for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
        try {
          this.logger.log(
            `Gemini stream start model=${model} attempt=${attempt}`,
          );

          const response = await this.ai.models.generateContentStream({
            model,
            contents: prompt,
          });

          this.logger.log(
            `Gemini stream success model=${model} attempt=${attempt}`,
          );

          return {
            stream: response as unknown as AsyncIterable<StreamChunk>,
            model,
            attempts: attempt,
          };
        } catch (error: unknown) {
          lastError = error;

          const { status, isRetryable } = this.getRetryInfo(error, false);

          this.logger.warn(
            `Gemini stream failed model=${model} attempt=${attempt} status=${this.formatStatus(
              status,
            )} retryable=${isRetryable}`,
          );

          if (!isRetryable || attempt === maxAttemptsPerModel) {
            break;
          }

          const delayMs = this.getBackoffDelayMs(attempt);
          this.logger.warn(
            `Gemini stream retry model=${model} nextAttempt=${attempt + 1} delay=${delayMs}ms`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    this.logger.error(
      'Gemini stream final error',
      lastError instanceof Error ? lastError.stack : undefined,
    );
    throw new InternalServerErrorException('Gemini request failed');
  }

  private getRetryInfo(error: unknown, includeTimeout: boolean) {
    const candidate = error as RetryableGeminiError | null;

    const status = candidate?.status ?? candidate?.error?.code;
    const isRetryable =
      status === 429 ||
      status === 503 ||
      status === 408 ||
      (typeof status === 'number' && status >= 500) ||
      (includeTimeout && candidate?.name === 'TimeoutError');

    return { status, isRetryable };
  }

  private getBackoffDelayMs(attempt: number) {
    const base = 1000 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 250);
    return base + jitter;
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const err = new Error(`Request timed out after ${ms}ms`);
        err.name = 'TimeoutError';
        reject(err);
      }, ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }
}
