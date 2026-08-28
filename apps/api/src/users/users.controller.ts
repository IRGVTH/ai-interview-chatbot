import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private requireAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin only');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async listUsers(@Req() req: AuthenticatedRequest) {
    this.requireAdmin(req);
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/:id/role')
  async updateUserRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    this.requireAdmin(req);
    return this.usersService.updateRole(id, dto.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/:id')
  async deleteUser(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.requireAdmin(req);
    return this.usersService.remove(id);
  }
}
