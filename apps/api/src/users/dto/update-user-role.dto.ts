import { IsIn } from 'class-validator';

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;
}
