import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
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

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; password?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updateData: {
      name?: string;
      email?: string;
      password?: string;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      if (!email) {
        throw new ConflictException("Email is invalid");
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException("Email already exists");
      }

      updateData.email = email;
    }

    if (data.password !== undefined) {
      if (data.password.length < 6) {
        throw new ConflictException("Password must be at least 6 characters");
      }

      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.safeUserSelect,
    });
  }

  async create(data: { email: string; password: string; name?: string }) {
    const email = data.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: data.name?.trim() || null,
      },
      select: this.safeUserSelect,
    });
  }
}