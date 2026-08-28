import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateInterviewDto } from "./dto/create-interview.dto";
import { UpdateInterviewDto } from "./dto/update-interview.dto";

@Injectable()
export class InterviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInterviewDto) {
    return this.prisma.interview.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  findAllByUser(userId: string) {
    return this.prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(userId: string, id: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, userId },
    });

    if (!interview) {
      throw new NotFoundException("Interview not found");
    }

    return interview;
  }

  async update(userId: string, id: string, dto: UpdateInterviewDto) {
    await this.findOne(userId, id);

    return this.prisma.interview.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.interview.delete({
      where: { id },
    });
  }
}