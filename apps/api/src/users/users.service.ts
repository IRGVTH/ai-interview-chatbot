import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { type UserRole } from '../common/types/role';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = SafeUser & {
  password: string | null;
};

type IdOnly = {
  id: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeUserSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.safeUserSelect,
    });
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...this.safeUserSelect,
        password: true,
      },
    });
  }

  findByEmailSafe(email: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.safeUserSelect,
    });
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; password?: string },
  ): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: {
      name?: string | null;
      email?: string;
      password?: string;
      role?: UserRole;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim() || null;
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      if (!email) {
        throw new ConflictException('Email is invalid');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }

      updateData.email = email;
    }

    if (data.password !== undefined) {
      if (data.password.length < 6) {
        throw new ConflictException('Password must be at least 6 characters');
      }

      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.safeUserSelect,
    });
  }

  async updateRole(id: string, role: UserRole): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: this.safeUserSelect,
    });
  }

  async updateByAdmin(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    },
  ): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: {
      name?: string | null;
      email?: string;
      password?: string;
      role?: UserRole;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim() || null;
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      if (!email) {
        throw new ConflictException('Email is invalid');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }

      updateData.email = email;
    }

    if (data.password !== undefined) {
      if (data.password.length < 6) {
        throw new ConflictException('Password must be at least 6 characters');
      }

      updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.safeUserSelect,
    });
  }

  async remove(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: { id },
      select: this.safeUserSelect,
    });
  }

  async create(data: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
  }): Promise<SafeUser> {
    const email = data.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: data.name?.trim() || null,
        role: data.role ?? 'USER',
      },
      select: this.safeUserSelect,
    });
  }
}
