import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  role: UserRole;
}
