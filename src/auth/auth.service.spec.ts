import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from 'prisma/prisma.service';


describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const user = {
        id: 1,
        email: 'owner@test.com',
        username: 'owner',
        name: 'Owner',
        avatarUrl: null,
        role: 'OWNER',
        passwordHash: await bcrypt.hash('123456', 10),
      };

      prismaMock.user.findFirst.mockResolvedValue(user);

      jwtMock.signAsync.mockResolvedValue('access-token');

      const result = await service.login({
        identifier: 'owner@test.com',
        password: '123456',
      });

      expect(prismaMock.user.findFirst).toHaveBeenCalled();

      expect(jwtMock.signAsync).toHaveBeenCalled();

      expect(result.accessToken).toBe('access-token');

      expect(result.user.role).toBe('OWNER');
    });

    it('should reject invalid user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          identifier: 'wrong@test.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password', async () => {
      const user = {
        id: 1,
        email: 'owner@test.com',
        username: 'owner',
        name: 'Owner',
        avatarUrl: null,
        role: 'OWNER',
        passwordHash: await bcrypt.hash('correct-password', 10),
      };

      prismaMock.user.findFirst.mockResolvedValue(user);

      await expect(
        service.login({
          identifier: 'owner@test.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtMock.signAsync).not.toHaveBeenCalled();
    });
  });
});
