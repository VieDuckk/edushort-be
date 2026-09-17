import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { CategoriesService } from './categories.service';
import { PrismaService } from 'prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const prismaMock = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    video: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all categories ordered by name', async () => {
      const categories = [
        { id: 1, name: 'Education', slug: 'education', _count: { videos: 5 } },
        { id: 2, name: 'Tech', slug: 'tech', _count: { videos: 3 } },
      ];

      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(prismaMock.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Education');
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return category when it exists', async () => {
      const category = {
        id: 1,
        name: 'Education',
        slug: 'education',
        _count: { videos: 5 },
      };

      prismaMock.category.findUnique.mockResolvedValue(category);

      const result = await service.findById(1);

      expect(prismaMock.category.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result.id).toBe(1);
      expect(result.name).toBe('Education');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return the new category', async () => {
      const created = { id: 3, name: 'Science', slug: 'science' };

      prismaMock.category.create.mockResolvedValue(created);

      const result = await service.create({
        name: 'Science',
        slug: 'science',
      });

      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: 'Science', slug: 'science' },
      });
      expect(result.id).toBe(3);
    });

    it('should throw ConflictException on duplicate name/slug (P2002)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '0.0.0' },
      );

      prismaMock.category.create.mockRejectedValue(prismaError);

      await expect(
        service.create({ name: 'Education', slug: 'education' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('DB connection lost');

      prismaMock.category.create.mockRejectedValue(unexpectedError);

      await expect(
        service.create({ name: 'X', slug: 'x' }),
      ).rejects.toThrow('DB connection lost');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the category', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'education',
      });

      prismaMock.category.update.mockResolvedValue({
        id: 1,
        name: 'Education Updated',
        slug: 'education',
      });

      const result = await service.update(1, { name: 'Education Updated' });

      expect(prismaMock.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { name: 'Education Updated' },
        }),
      );
      expect(result.name).toBe('Education Updated');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaMock.category.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate name/slug (P2002)', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'education',
      });

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '0.0.0' },
      );

      prismaMock.category.update.mockRejectedValue(prismaError);

      await expect(service.update(1, { slug: 'tech' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should only pass defined fields to update', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'education',
      });

      prismaMock.category.update.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'edu-new',
      });

      await service.update(1, { slug: 'edu-new' });

      const callArg = prismaMock.category.update.mock.calls[0][0];
      // name không được truyền vào → không có trong data
      expect(callArg.data).not.toHaveProperty('name');
      expect(callArg.data.slug).toBe('edu-new');
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the category and return success message', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'education',
      });

      prismaMock.video.count.mockResolvedValue(0);

      const result = await service.remove(1);

      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.message).toBe('Category deleted successfully');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);

      expect(prismaMock.video.count).not.toHaveBeenCalled();
      expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when category has videos', async () => {
      prismaMock.category.findUnique.mockResolvedValue({
        id: 1,
        name: 'Education',
        slug: 'education',
      });

      prismaMock.video.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(ConflictException);

      expect(prismaMock.category.delete).not.toHaveBeenCalled();
    });
  });
});
