import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AdminCreateUserDto } from "../admin/dto/admin-create-user.dto";
import { AdminUpdateUserDto } from "../admin/dto/admin-update-user.dto";
import { UpdateUserRoleDto } from "../users/dto/update-user-role.dto";
import { UsersService } from "../users/users.service";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.findAll();
  }

  @Get(":id")
  getUser(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.updateByAdmin(id, dto);
  }

  @Patch(":id/role")
  updateUserRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }

  @Delete(":id")
  deleteUser(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}