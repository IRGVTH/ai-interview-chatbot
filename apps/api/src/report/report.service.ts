import {
  RUBRIC,
  RUBRIC_VERSION,
  parseRubricEvaluation,
  total30,
  grade30,
} from './rubric';
import { interviewTypeContext } from '../interview/interview-type';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

type ChatMessageItem = {
  role: string;
  content: string;
  createdAt?: Date;
};

type InterviewSummary = {
  id: string;
  title: string;
  interviewType: string | null;
  position: string;
  experienceLevel: string;
  difficulty: string;
  status: string;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EvaluationItem = {
  sessionId: string;
  language?: number | null;
  rubricVersion?: string;
  rubricSnapshot?: unknown;
  dimensionFeedback?: Record<string, string> | null;
  evaluatedThrough?: Date | null;
  communication: number;
  technical: number;
  confidence: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  rawResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChatSessionItem = {
  id: string;
  title: string | null;
  lastMessageAt: Date | null;
  updatedAt: Date;
  memory: string | null;
  interview: InterviewSummary;
  messages: ChatMessageItem[];
  evaluation: EvaluationItem | null;
};

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async getOverview(userId: string) {
    const interviews = (await this.prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })) as InterviewSummary[];

    const sessions = (await this.prisma.chatSession.findMany({
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
    })) as ChatSessionItem[];

    const evaluations = (await this.prisma.chatEvaluation.findMany({
      where: {
        session: {
          userId,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })) as EvaluationItem[];

    const totalMessages = await this.prisma.chatMessage.count({
      where: {
        session: {
          userId,
        },
      },
    });

    const decoratedSessions = sessions.map((s) => ({
      ...s,
      evaluation: this.decorate(s.evaluation),
      lastMessageAt: this.latestMessageAt(s),
    }));
    const latestSession = decoratedSessions[0] ?? null;

    const eligible = decoratedSessions.filter(
      (s) =>
        s.evaluation?.totalScore != null &&
        s.evaluation.evaluatedThrough &&
        (!s.lastMessageAt || s.evaluation.evaluatedThrough >= s.lastMessageAt),
    );
    const avgOverall = eligible.length
      ? eligible.reduce((sum, s) => sum + s.evaluation.totalScore, 0) /
        eligible.length
      : null;

    return {
      totalInterviews: interviews.length,
      totalSessions: sessions.length,
      totalMessages,
      totalEvaluations: evaluations.length,
      averageOverall:
        avgOverall === null ? null : Number(avgOverall.toFixed(2)),
      scoreMax: 30,
      rubric: RUBRIC,
      gradeScale: RUBRIC.gradeScale,
      latestSession,
      interviews,
      sessions: decoratedSessions,
      evaluations: evaluations.map((e) => this.decorate(e)),
    };
  }

  async getSessionReport(userId: string, sessionId: string) {
    const session = (await this.prisma.chatSession.findFirst({
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
    })) as ChatSessionItem | null;

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return {
      ...session,
      lastMessageAt: this.latestMessageAt(session),
      evaluation: this.decorate(session.evaluation),
    };
  }

  async getEvaluation(userId: string, sessionId: string) {
    return (await this.getSessionReport(userId, sessionId)).evaluation;
  }

  async evaluateSession(userId: string, sessionId: string) {
    const session = (await this.prisma.chatSession.findFirst({
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
    })) as ChatSessionItem | null;

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    if (!session.messages.some((m) => m.role === 'user' && m.content.trim())) {
      throw new BadRequestException('กรุณาตอบอย่างน้อยหนึ่งคำถามก่อนประเมิน');
    }
    const evaluatedThrough = this.latestMessageAt(session);
    const transcript = session.messages
      .map((message: ChatMessageItem) => {
        return `${message.role.toUpperCase()}: ${message.content}`;
      })
      .join('\n');

    const prompt = `
You are an interview evaluator for a university portfolio project.

Evaluate the candidate's performance based on the full conversation.

${interviewTypeContext(session.interview.interviewType)}
Evaluate against this interview type; do not penalize missing coding in an HR or Behavioral interview.
Position: ${session.interview.position}
Experience level: ${session.interview.experienceLevel}
Difficulty: ${session.interview.difficulty}
Interview title: ${session.title || 'Practice Chat'}

Conversation transcript:
${transcript || 'No conversation yet.'}

Scoring rubric (follow the level descriptions for every dimension):
${JSON.stringify(RUBRIC)}
Return ONLY JSON with numeric technical, communication, language, confidence (0..10),
dimensionFeedback: {technical: string, communication: string, language: string, confidence: string},
strengths: string[], improvements: string[], feedback: string.
Every dimensionFeedback must explain in Thai WHY the score fits the rubric, mention specific evidence from the USER answers, and suggest what would improve it.
Use only USER answer evidence; never attribute the interviewer's words to the user. Do not invent quotes.
Do not infer voice, facial expression, personality or mental state from text.
Judge content according to the selected interview type and experience. Do not penalize non-coding HR/Behavioral answers for lacking code.
Evaluate language quality in the language actually used; Thai is acceptable.
If evidence is very limited, explicitly say so in each relevant reason rather than assuming skill.
All explanations, strengths, improvements and feedback must be in Thai.
Do not provide overall/grade/total: the server computes the weighted result.
`.trim();

    const result = await this.geminiService.ask(prompt);
    const parsed = parseRubricEvaluation(result.text);

    const evaluationData = {
      ...parsed,
      rubricVersion: RUBRIC_VERSION,
      rubricSnapshot: RUBRIC,
      evaluatedThrough,
      rawResponse: result.text,
    };
    const saved = (await this.prisma.chatEvaluation.upsert({
      where: { sessionId: session.id },
      create: { sessionId: session.id, ...evaluationData },
      update: evaluationData,
    })) as EvaluationItem;
    return this.decorate(saved);
  }

  private latestMessageAt(session: ChatSessionItem): Date | null {
    const dates = session.messages.flatMap((m) =>
      m.createdAt ? [m.createdAt.getTime()] : [],
    );
    if (session.lastMessageAt) dates.push(session.lastMessageAt.getTime());
    return dates.length ? new Date(Math.max(...dates)) : null;
  }

  private decorate(e: EvaluationItem | null) {
    if (!e) return null;
    const complete =
      e.rubricVersion === RUBRIC_VERSION &&
      RUBRIC.dimensions.every(
        (d) =>
          typeof e.dimensionFeedback?.[d.key] === 'string' &&
          e.dimensionFeedback[d.key].trim().length >= 10,
      ) &&
      typeof e.language === 'number' &&
      [e.technical, e.communication, e.language, e.confidence].every(
        (v) => Number.isFinite(v) && v >= 0 && v <= 10,
      );
    const totalScore = complete
      ? total30({
          technical: e.technical,
          communication: e.communication,
          language: e.language,
          confidence: e.confidence,
        })
      : null;
    return {
      ...e,
      totalScore,
      scoreMax: complete ? 30 : 10,
      grade: totalScore === null ? null : grade30(totalScore),
    };
  }
}
