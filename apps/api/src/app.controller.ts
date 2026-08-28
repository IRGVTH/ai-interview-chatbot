import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service";

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHello() {
    return {
      message: "AI Interview Chatbot API",
    };
  }

  @Get("health")
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "connected",
    };
  }
 
}