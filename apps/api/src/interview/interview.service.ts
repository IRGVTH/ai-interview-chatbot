import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateInterviewDto,
  ): Promise<InterviewRecord> {
    this.logger.log(
      `Create interview user=${userId} position=${dto.position} difficulty=${dto.difficulty}`,
    );

    const interview = (await this.prisma.interview.create({
      data: {
        ...dto,
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
    }) as Promise<InterviewRecord[]>;
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

    await this.findOne(userId, id);

    const interview = (await this.prisma.interview.update({
      where: { id },
      data: dto,
    })) as InterviewRecord;

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
