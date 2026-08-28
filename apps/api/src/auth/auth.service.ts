import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  UsersService,
  type AuthUser,
  type SafeUser,
} from '../users/users.service';

type AuthLikeUser = SafeUser & {
  password?: string | null;
};

type AuthResponse = {
  accessToken: string;
  user: SafeUser;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    this.logger.log(`Register attempt: ${dto.email}`);

    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      this.logger.warn(`Register failed (email exists): ${dto.email}`);
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    this.logger.log(`Register success: ${user.id} (${user.email})`);

    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login attempt: ${dto.email}`);

    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.password) {
      this.logger.warn(`Login failed (user not found): ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed (wrong password): ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login success: ${user.id} (${user.email})`);

    return this.buildResponse(user);
  }

  private buildResponse(user: AuthLikeUser): AuthResponse {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const token = this.jwtService.sign(payload);
    const { password: _password, ...safeUser } = user;

    return {
      accessToken: token,
      user: safeUser,
    };
  }
}
