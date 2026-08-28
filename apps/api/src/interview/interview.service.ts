import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInterviewDto) {
    this.logger.log(
      `Create interview user=${userId} position=${dto.position} difficulty=${dto.difficulty}`,
    );

    const interview = await this.prisma.interview.create({
      data: {
        ...dto,
        userId,
      },
    });

    this.logger.log(`Create interview success interview=${interview.id} user=${userId}`);

    return interview;
  }

  findAllByUser(userId: string) {
    this.logger.log(`List interviews user=${userId}`);

    return this.prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, id: string) {
    this.logger.log(`Get interview user=${userId} interview=${id}`);

    const interview = await this.prisma.interview.findFirst({
      where: { id, userId },
    });

    if (!interview) {
      this.logger.warn(`Interview not found user=${userId} interview=${id}`);
      throw new NotFoundException("Interview not found");
    }

    return interview;
  }

  async update(userId: string, id: string, dto: UpdateInterviewDto) {
    this.logger.log(`Update interview user=${userId} interview=${id}`);

    await this.findOne(userId, id);

    const interview = await this.prisma.interview.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Update interview success user=${userId} interview=${id}`);

    return interview;
  }

  async remove(userId: string, id: string) {
    this.logger.log(`Delete interview user=${userId} interview=${id}`);

    await this.findOne(userId, id);

    const interview = await this.prisma.interview.delete({
      where: { id },
    });

    this.logger.log(`Delete interview success user=${userId} interview=${id}`);

    return interview;
  }
}