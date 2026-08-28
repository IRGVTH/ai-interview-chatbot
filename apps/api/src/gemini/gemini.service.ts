import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";

type GeminiModel = "gemini-3.1-flash-lite" | "gemini-3.7-flash";

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly models: GeminiModel[] = [
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
  ];

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
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
          const response = await this.withTimeout(
            this.ai.models.generateContent({
              model,
              contents: prompt,
            }),
            requestTimeoutMs,
          );

          return {
            text: response.text ?? "",
            model,
            attempts: attempt,
          };
        } catch (error: any) {
          lastError = error;

          const status = error?.status ?? error?.error?.code;
          const isRetryable =
            status === 429 ||
            status === 503 ||
            status === 408 ||
            (typeof status === "number" && status >= 500) ||
            error?.name === "TimeoutError";

          if (!isRetryable || attempt === maxAttemptsPerModel) {
            break;
          }

          const delayMs = this.getBackoffDelayMs(attempt);
          await this.sleep(delayMs);
        }
      }
    }

    console.error("Gemini final error:", lastError);
    throw new InternalServerErrorException("Gemini request failed");
  }

  private getBackoffDelayMs(attempt: number) {
    const base = 1000 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 250);
    return base + jitter;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const err = new Error(`Request timed out after ${ms}ms`);
        err.name = "TimeoutError";
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