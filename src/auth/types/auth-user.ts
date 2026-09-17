import { UserRole } from '@prisma/client';

export interface AuthUser {
  userId: number;
  email: string;
  username: string;
  role: UserRole;
}
