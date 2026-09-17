import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from 'prisma/prisma.service';

describe('QuestionsService', () => {
  let service: QuestionsService;

  const prismaMock = {
    category: {
      findUnique: jest.fn(),
    },
    question: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
  });

  describe('create', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          content: 'Test question?',
          categoryId: 999,
          options: [
            { label: 'A', content: 'Opt A', isCorrect: true },
            { label: 'B', content: 'Opt B', isCorrect: false },
            { label: 'C', content: 'Opt C', isCorrect: false },
            { label: 'D', content: 'Opt D', isCorrect: false },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if correct options count is not 1', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 1, name: 'Math' });

      await expect(
        service.create({
          content: 'Test question?',
          categoryId: 1,
          options: [
            { label: 'A', content: 'Opt A', isCorrect: true },
            { label: 'B', content: 'Opt B', isCorrect: true },
            { label: 'C', content: 'Opt C', isCorrect: false },
            { label: 'D', content: 'Opt D', isCorrect: false },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create question with options', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 1, name: 'Math' });
      const createdQuestion = {
        id: 1,
        content: '1 + 1 = ?',
        categoryId: 1,
        options: [
          { id: 1, label: 'A', content: '2', isCorrect: true },
          { id: 2, label: 'B', content: '3', isCorrect: false },
          { id: 3, label: 'C', content: '4', isCorrect: false },
          { id: 4, label: 'D', content: '5', isCorrect: false },
        ],
      };
      prismaMock.question.create.mockResolvedValue(createdQuestion);

      const result = await service.create({
        content: '1 + 1 = ?',
        categoryId: 1,
        options: [
          { label: 'A', content: '2', isCorrect: true },
          { label: 'B', content: '3', isCorrect: false },
          { label: 'C', content: '4', isCorrect: false },
          { label: 'D', content: '5', isCorrect: false },
        ],
      });

      expect(result).toEqual(createdQuestion);
      expect(prismaMock.question.create).toHaveBeenCalledWith({
        data: {
          content: '1 + 1 = ?',
          categoryId: 1,
          options: {
            create: [
              { label: 'A', content: '2', isCorrect: true },
              { label: 'B', content: '3', isCorrect: false },
              { label: 'C', content: '4', isCorrect: false },
              { label: 'D', content: '5', isCorrect: false },
            ],
          },
        },
        include: {
          options: true,
          category: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all questions', async () => {
      const questions = [{ id: 1, content: 'Q1' }];
      prismaMock.question.findMany.mockResolvedValue(questions);

      const result = await service.findAll();
      expect(result).toEqual(questions);
    });

    it('should filter by categoryId if provided', async () => {
      const questions = [{ id: 1, content: 'Q1', categoryId: 2 }];
      prismaMock.question.findMany.mockResolvedValue(questions);

      const result = await service.findAll(2);
      expect(result).toEqual(questions);
      expect(prismaMock.question.findMany).toHaveBeenCalledWith({
        where: { categoryId: 2 },
        include: { options: true, category: true },
        orderBy: { id: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });

    it('should return question if found', async () => {
      const question = { id: 1, content: 'Q1' };
      prismaMock.question.findUnique.mockResolvedValue(question);
      const result = await service.findById(1);
      expect(result).toEqual(question);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if question does not exist', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should delete question if found', async () => {
      prismaMock.question.findUnique.mockResolvedValue({ id: 1 });
      prismaMock.question.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);
      expect(result).toEqual({ message: 'Question deleted successfully' });
      expect(prismaMock.question.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
