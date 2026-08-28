import type { Request } from 'express';

export type RequestUser = {
  id: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: RequestUser;
};
