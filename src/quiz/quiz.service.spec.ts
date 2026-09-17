import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { PrismaService } from 'prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('QuizService', () => {
  let service: QuizService;

  const prismaMock = {
    video: {
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    quizAnswer: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const storageServiceMock = {
    getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  describe('getRandomQuestion', () => {
    it('should throw NotFoundException if videoIds is empty', async () => {
      await expect(service.getRandomQuestion([])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if videos have no categories', async () => {
      prismaMock.video.findMany.mockResolvedValue([
        { id: 1, categoryId: null },
      ]);

      await expect(service.getRandomQuestion([1])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if no questions match categoryIds', async () => {
      prismaMock.video.findMany.mockResolvedValue([
        { id: 1, categoryId: 10 },
      ]);
      prismaMock.question.findMany.mockResolvedValue([]);

      await expect(service.getRandomQuestion([1])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return a random question with hidden isCorrect property', async () => {
      prismaMock.video.findMany.mockResolvedValue([
        { id: 1, categoryId: 10 },
      ]);
      const mockQuestion = {
        id: 1,
        content: 'What is 2+2?',
        categoryId: 10,
        category: { id: 10, name: 'Math' },
        options: [
          { id: 1, label: 'A', content: '4', isCorrect: true },
          { id: 2, label: 'B', content: '5', isCorrect: false },
        ],
      };
      prismaMock.question.findMany.mockResolvedValue([mockQuestion]);

      const result = await service.getRandomQuestion([1]);

      expect(result.id).toEqual(1);
      expect(result.content).toEqual('What is 2+2?');
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).not.toHaveProperty('isCorrect');
    });
  });

  describe('submitAnswer', () => {
    it('should throw NotFoundException if question does not exist', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAnswer(1, {
          questionId: 999,
          selectedOptionId: 1,
          videoIds: [1, 2],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if selectedOptionId is invalid', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 1,
        options: [{ id: 1, isCorrect: true }],
      });

      await expect(
        service.submitAnswer(1, {
          questionId: 1,
          selectedOptionId: 999,
          videoIds: [1, 2],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process correct answer and not set videoToReview', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 1,
        categoryId: 10,
        options: [
          { id: 1, isCorrect: true },
          { id: 2, isCorrect: false },
        ],
      });
      prismaMock.quizAnswer.create.mockResolvedValue({});

      const result = await service.submitAnswer(1, {
        questionId: 1,
        selectedOptionId: 1,
        videoIds: [1, 2],
      });

      expect(result.isCorrect).toBe(true);
      expect(result.correctOptionId).toBe(1);
      expect(result.videoToReview).toBeNull();
      expect(prismaMock.quizAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: 1,
          selectedOptionId: 1,
          isCorrect: true,
          videoToReviewId: null,
        },
      });
    });

    it('should process wrong answer and pick matching video to review', async () => {
      prismaMock.question.findUnique.mockResolvedValue({
        id: 1,
        categoryId: 10,
        options: [
          { id: 1, isCorrect: true },
          { id: 2, isCorrect: false },
        ],
      });
      const matchingVideo = {
        id: 2,
        title: 'Math Intro',
        categoryId: 10,
        videoKey: 'videos/test.mp4',
        thumbnailKey: 'thumbnails/test.jpg',
      };
      prismaMock.video.findMany.mockResolvedValue([matchingVideo]);
      prismaMock.quizAnswer.create.mockResolvedValue({});

      const result = await service.submitAnswer(1, {
        questionId: 1,
        selectedOptionId: 2,
        videoIds: [1, 2],
      });

      expect(result.isCorrect).toBe(false);
      expect(result.correctOptionId).toBe(1);
      expect(result.videoToReview).toEqual({
        ...matchingVideo,
        videoUrl: 'https://cdn.test/videos/test.mp4',
        thumbnailUrl: 'https://cdn.test/thumbnails/test.jpg',
      });
      expect(prismaMock.quizAnswer.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          questionId: 1,
          selectedOptionId: 2,
          isCorrect: false,
          videoToReviewId: 2,
        },
      });
    });
  });

  describe('getReviewList', () => {
    it('should return review list for user with formatted videoToReview', async () => {
      const matchingVideo = {
        id: 2,
        title: 'Math Intro',
        videoKey: 'videos/test.mp4',
        thumbnailKey: 'thumbnails/test.jpg',
      };
      const reviewItems = [
        {
          id: 1,
          isCorrect: false,
          questionId: 1,
          videoToReviewId: 2,
          videoToReview: matchingVideo,
        },
      ];
      prismaMock.quizAnswer.findMany.mockResolvedValue(reviewItems);

      const result = await service.getReviewList(1);
      expect(result).toEqual([
        {
          ...reviewItems[0],
          videoToReview: {
            ...matchingVideo,
            videoUrl: 'https://cdn.test/videos/test.mp4',
            thumbnailUrl: 'https://cdn.test/thumbnails/test.jpg',
          },
        },
      ]);
      expect(prismaMock.quizAnswer.findMany).toHaveBeenCalledWith({
        where: { userId: 1, isCorrect: false },
        include: {
          question: { include: { category: true, options: true } },
          selectedOption: true,
          videoToReview: { include: { category: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

