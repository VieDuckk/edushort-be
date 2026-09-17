import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';
import { PrismaService } from 'prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all users ordered by createdAt desc', async () => {
      const users = [
        {
          id: 2,
          email: 'b@test.com',
          username: 'b',
          name: 'B',
          avatarUrl: null,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
          _count: { videos: 0 },
        },
        {
          id: 1,
          email: 'a@test.com',
          username: 'a',
          name: 'A',
          avatarUrl: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          _count: { videos: 3 },
        },
      ];

      prismaMock.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return user when it exists', async () => {
      const user = {
        id: 1,
        email: 'owner@test.com',
        username: 'owner',
        name: 'Owner',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { videos: 5 },
      };

      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result.id).toBe(1);
      expect(result.email).toBe('owner@test.com');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingUser = {
      id: 1,
      email: 'owner@test.com',
      username: 'owner',
      name: 'Owner',
      avatarUrl: null,
      role: 'OWNER',
      passwordHash: 'hash',
    };

    it('should update and return the user profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      prismaMock.user.update.mockResolvedValue({
        id: 1,
        email: 'owner@test.com',
        username: 'owner',
        name: 'Owner Updated',
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(1, { name: 'Owner Updated' }, 1);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { name: 'Owner Updated' },
        }),
      );
      expect(result.name).toBe('Owner Updated');
    });

    it('should throw ForbiddenException when updating another user', async () => {
      // userId=2 tries to update id=1
      await expect(
        service.update(1, { name: 'Hacker' }, 2),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.update(1, { name: 'X' }, 1)).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should only pass defined fields to update', async () => {
      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      prismaMock.user.update.mockResolvedValue({
        id: 1,
        email: 'owner@test.com',
        username: 'owner',
        name: 'Owner',
        avatarUrl: 'https://cdn.test/avatar.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(1, { avatarUrl: 'https://cdn.test/avatar.jpg' }, 1);

      const callArg = prismaMock.user.update.mock.calls[0][0];
      // name không được truyền → không có trong data
      expect(callArg.data).not.toHaveProperty('name');
      expect(callArg.data.avatarUrl).toBe('https://cdn.test/avatar.jpg');
    });
  });
});
