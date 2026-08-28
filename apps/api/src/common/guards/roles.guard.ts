import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { UserRole } from "../types/role";

type RequestWithUser = Request & {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userRole = request.user?.role;

    if (!userRole) {
      throw new UnauthorizedException("User role not found");
    }

    return requiredRoles.includes(userRole);
  }
}