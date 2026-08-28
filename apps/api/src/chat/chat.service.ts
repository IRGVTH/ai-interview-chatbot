import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { GeminiService } from "../gemini/gemini.service";
import { CreateChatSessionDto } from "./dto/create-chat-session.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async createSession(userId: string, dto: CreateChatSessionDto) {
    const interview = await this.prisma.interview.findFirst({
      where: {
        id: dto.interviewId,
        userId,
      },
    });

    if (!interview) {
      throw new NotFoundException("Interview not found");
    }

    return this.prisma.chatSession.create({
      data: {
        userId,
        interviewId: interview.id,
        title: dto.title ?? `${interview.position} Interview`,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        interview: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async findOne(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        interview: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Chat session not found");
    }

    return session;
  }

  async sendMessage(userId: string, sessionId: string, dto: SendMessageDto) {
    const session = await this.findOne(userId, sessionId);

    const userMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: dto.content,
      },
    });

    const historyText = session.messages
  .map((message: { role: string; content: string }) => {
    return `${message.role.toUpperCase()}: ${message.content}`;
  })
  .join("\n");

    const prompt = this.buildPrompt({
      title: session.title ?? "Interview Chat",
      position: session.interview.position,
      experienceLevel: session.interview.experienceLevel,
      difficulty: session.interview.difficulty,
      summary: session.interview.summary ?? "",
      historyText,
      currentUserMessage: dto.content,
    });

    const geminiResponse = await this.geminiService.ask(prompt);

    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: geminiResponse.text,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return {
      sessionId: session.id,
      model: geminiResponse.model,
      attempts: geminiResponse.attempts,
      userMessage,
      assistantMessage,
    };
  }

  private buildPrompt(input: {
    title: string;
    position: string;
    experienceLevel: string;
    difficulty: string;
    summary: string;
    historyText: string;
    currentUserMessage: string;
  }) {
    return `
You are an AI interviewer for a university portfolio project.

Interview title: ${input.title}
Position: ${input.position}
Experience level: ${input.experienceLevel}
Difficulty: ${input.difficulty}
Interview summary: ${input.summary || "-"}

Rules:
- Ask like a real interviewer.
- Keep the conversation focused on the candidate's answer.
- Be helpful but not too verbose.
- Give short feedback when needed.
- If the user asks for the next question, continue naturally.
- If the user answer is weak, point out one or two improvements.
- If the user answer is strong, acknowledge it and move forward.

Conversation history:
${input.historyText || "No previous messages."}

Current user message:
${input.currentUserMessage}

Reply now as the interviewer.
`.trim();
  }
}