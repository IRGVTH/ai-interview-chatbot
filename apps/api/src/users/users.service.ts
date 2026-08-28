import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...this.safeUserSelect,
        password: true,
      },
    });
  }

  findByEmailSafe(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.safeUserSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });
  }

  async updateProfile(id: string, data: { name?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
      },
      select: this.safeUserSelect,
    });
  }

  create(data: { email: string; password: string; name?: string }) {
    return this.prisma.user.create({
      data,
      select: this.safeUserSelect,
    });
  }
}