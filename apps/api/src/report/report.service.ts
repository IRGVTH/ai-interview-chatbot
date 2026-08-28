import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
type ChatMessageItem = {
  role: string;
  content: string;
};

type ChatSessionItem = {
  messages: ChatMessageItem[];
};

type EvaluationItem = {
  overall: number;
};
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async getOverview(userId: string) {
    const [interviews, sessions, evaluations, totalMessages] =
      await Promise.all([
        this.prisma.interview.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.chatSession.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          include: {
            interview: true,
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
            evaluation: true,
          },
        }),
        this.prisma.chatEvaluation.findMany({
          where: {
            session: {
              userId,
            },
          },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.chatMessage.count({
          where: {
            session: {
              userId,
            },
          },
        }),
      ]);

    const latestSession = sessions[0] ?? null;

    const avgOverall =
      evaluations.length > 0
        ? evaluations.reduce<number>(
            (sum: number, item: EvaluationItem) => sum + item.overall,
            0,
          ) / evaluations.length
        : 0;

    return {
      totalInterviews: interviews.length,
      totalSessions: sessions.length,
      totalMessages,
      totalEvaluations: evaluations.length,
      averageOverall: Number(avgOverall.toFixed(2)),
      latestSession,
      interviews,
      sessions,
      evaluations,
    };
  }

  async getEvaluation(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        interview: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        evaluation: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return session.evaluation;
  }

  async evaluateSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        interview: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        evaluation: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const transcript = session.messages
      .map(
        (message: { role: string; content: string }) =>
          `${message.role.toUpperCase()}: ${message.content}`,
      )
      .join('\n');

    const prompt = `
You are an interview evaluator for a university portfolio project.

Evaluate the candidate's performance based on the full conversation.

Position: ${session.interview.position}
Experience level: ${session.interview.experienceLevel}
Difficulty: ${session.interview.difficulty}
Interview title: ${session.title || 'Practice Chat'}

Conversation transcript:
${transcript || 'No conversation yet.'}

Return ONLY valid JSON in this exact format:
{
  "communication": number,
  "technical": number,
  "confidence": number,
  "overall": number,
  "strengths": [string, string],
  "improvements": [string, string],
  "feedback": string
}

Rules:
- Scores must be numbers from 0 to 10
- strengths must contain exactly 2 items
- improvements must contain exactly 2 items
- feedback must be written in Thai language only
- strengths must be written in Thai language only
- improvements must be written in Thai language only
- Do not include markdown
- Do not include extra text outside JSON
`.trim();

    const result = await this.geminiService.ask(prompt);
    const parsed = this.parseEvaluation(result.text);

    const saved = await this.prisma.chatEvaluation.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        communication: parsed.communication,
        technical: parsed.technical,
        confidence: parsed.confidence,
        overall: parsed.overall,
        strengths: parsed.strengths,
        improvements: parsed.improvements,
        feedback: parsed.feedback,
        rawResponse: result.text,
      },
      update: {
        communication: parsed.communication,
        technical: parsed.technical,
        confidence: parsed.confidence,
        overall: parsed.overall,
        strengths: parsed.strengths,
        improvements: parsed.improvements,
        feedback: parsed.feedback,
        rawResponse: result.text,
      },
    });

    return saved;
  }

  private parseEvaluation(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('Gemini did not return valid JSON');
    }

    const jsonText = cleaned.slice(start, end + 1);
    const data = JSON.parse(jsonText);

    return {
      communication: this.clampScore(data.communication),
      technical: this.clampScore(data.technical),
      confidence: this.clampScore(data.confidence),
      overall: this.clampScore(data.overall),
      strengths: this.normalizeStringArray(data.strengths, 'strengths'),
      improvements: this.normalizeStringArray(
        data.improvements,
        'improvements',
      ),
      feedback: String(data.feedback || '').trim(),
    };
  }

  private clampScore(value: unknown) {
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(10, Number(num.toFixed(1))));
  }

  private normalizeStringArray(value: unknown, fallbackLabel: string) {
    if (Array.isArray(value)) {
      return value.slice(0, 2).map((item) => String(item));
    }

    return [`No ${fallbackLabel} provided`, `No ${fallbackLabel} provided`];
  }
}
