import type { Request } from 'express';
import type { UserRole } from './role';

export type RequestUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: RequestUser;
};
