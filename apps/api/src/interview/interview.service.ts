import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

type InterviewRecord = {
  id: string;
  title: string;
  position: string;
  experienceLevel: string;
  difficulty: string;
  status: string;
  summary: string | null;
  resumeFileName: string | null;
  resumeText: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  private cleanText(value?: string | null) {
    if (value == null) return value;
    return value.split(String.fromCharCode(0)).join('').trim();
  }

  async create(
    userId: string,
    dto: CreateInterviewDto,
  ): Promise<InterviewRecord> {
    this.logger.log(
      `Create interview user=${userId} position=${dto.position} difficulty=${dto.difficulty}`,
    );

    const interview = (await this.prisma.interview.create({
      data: {
        interviewType: dto.interviewType,
        title: this.cleanText(dto.title) ?? dto.title,
        position: this.cleanText(dto.position) ?? dto.position,
        experienceLevel: dto.experienceLevel,
        difficulty: dto.difficulty,
        summary: this.cleanText(dto.summary) ?? null,
        resumeFileName: this.cleanText(dto.resumeFileName) ?? null,
        resumeText: this.cleanText(dto.resumeText) ?? null,
        resumeUploadedAt: dto.resumeText?.trim() ? new Date() : null,
        userId,
      },
    })) as InterviewRecord;

    this.logger.log(
      `Create interview success interview=${interview.id} user=${userId}`,
    );

    return interview;
  }

  findAllByUser(userId: string): Promise<InterviewRecord[]> {
    this.logger.log(`List interviews user=${userId}`);

    return this.prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<InterviewRecord> {
    this.logger.log(`Get interview user=${userId} interview=${id}`);

    const interview = (await this.prisma.interview.findFirst({
      where: { id, userId },
    })) as InterviewRecord | null;

    if (!interview) {
      this.logger.warn(`Interview not found user=${userId} interview=${id}`);
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateInterviewDto,
  ): Promise<InterviewRecord> {
    this.logger.log(`Update interview user=${userId} interview=${id}`);

    const current = await this.findOne(userId, id);
    const started = await this.prisma.chatSession.count({
      where: { interviewId: id },
    });
    if (current.status !== 'draft' || started)
      throw new BadRequestException(
        'Cannot change interview context after practice starts',
      );

    const changed = await this.prisma.interview.updateMany({
      where: { id, userId, status: 'draft', chatSessions: { none: {} } },
      data: {
        ...(dto.interviewType !== undefined && {
          interviewType: dto.interviewType,
        }),
        revision: { increment: 1 },
        ...(dto.title !== undefined && {
          title: this.cleanText(dto.title) ?? dto.title,
        }),
        ...(dto.position !== undefined && {
          position: this.cleanText(dto.position) ?? dto.position,
        }),
        ...(dto.experienceLevel !== undefined && {
          experienceLevel: dto.experienceLevel,
        }),
        ...(dto.difficulty !== undefined && {
          difficulty: dto.difficulty,
        }),
        ...(dto.summary !== undefined && {
          summary: this.cleanText(dto.summary) ?? null,
        }),
        ...(dto.resumeFileName !== undefined && {
          resumeFileName: this.cleanText(dto.resumeFileName) ?? null,
        }),
        ...(dto.resumeText !== undefined && {
          resumeText: this.cleanText(dto.resumeText) ?? null,
          resumeUploadedAt: dto.resumeText?.trim() ? new Date() : null,
        }),
      },
    });
    if (!changed.count)
      throw new BadRequestException('Interview has already started');
    const interview = await this.findOne(userId, id);

    this.logger.log(`Update interview success user=${userId} interview=${id}`);

    return interview;
  }

  async remove(userId: string, id: string): Promise<InterviewRecord> {
    this.logger.log(`Delete interview user=${userId} interview=${id}`);

    await this.findOne(userId, id);

    const interview = (await this.prisma.interview.delete({
      where: { id },
    })) as InterviewRecord;

    this.logger.log(`Delete interview success user=${userId} interview=${id}`);

    return interview;
  }
}
