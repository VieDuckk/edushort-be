import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { VideosService } from './videos.service';
import { PrismaService } from 'prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('VideosService', () => {
  let service: VideosService;

  const prismaMock = {
    video: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  const storageMock = {
    createVideoKey: jest.fn(),
    createThumbnailKey: jest.fn(),
    createPresignedUploadUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    exists: jest.fn(),
    deleteObject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StorageService,
          useValue: storageMock,
        },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  describe('findAll', () => {
    it('should return paginated videos', async () => {
      const videos = [
        {
          id: 1,
          title: 'Test video',
          videoKey: 'videos/test.mp4',
          thumbnailKey: null,
          fileSize: BigInt(1000),
          views: 10,
          author: {
            id: 1,
            username: 'owner',
          },
          category: null,
        },
      ];

      prismaMock.video.findMany.mockResolvedValue(videos);
      prismaMock.video.count.mockResolvedValue(1);

      storageMock.getPublicUrl.mockImplementation(
        (key: string) => `https://cdn.test/${key}`,
      );

      const result = await service.findAll({
        page: 1,
        limit: 10,
        sort: 'latest',
      });

      expect(prismaMock.video.findMany).toHaveBeenCalled();
      expect(prismaMock.video.count).toHaveBeenCalled();

      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].videoUrl).toBe('https://cdn.test/videos/test.mp4');
    });
  });

  describe('findById', () => {
    it('should return video detail', async () => {
      const video = {
        id: 1,
        title: 'Test video',
        videoKey: 'videos/test.mp4',
        thumbnailKey: 'thumbnails/test.jpg',
        fileSize: BigInt(1000),
        views: 10,
        author: {
          id: 1,
          username: 'owner',
        },
        category: null,
      };

      prismaMock.video.findUnique.mockResolvedValue(video);

      storageMock.getPublicUrl.mockImplementation(
        (key: string) => `https://cdn.test/${key}`,
      );

      const result = await service.findById(1);

      expect(prismaMock.video.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
          },
        }),
      );

      expect(result.id).toBe(1);
      expect(result.videoUrl).toBe('https://cdn.test/videos/test.mp4');
      expect(result.thumbnailUrl).toBe('https://cdn.test/thumbnails/test.jpg');
    });

    it('should throw when video does not exist', async () => {
      prismaMock.video.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('increaseView', () => {
    it('should increase video views', async () => {
      prismaMock.video.findUnique.mockResolvedValue({
        id: 1,
      });

      prismaMock.video.update.mockResolvedValue({
        id: 1,
        views: 11,
      });

      const result = await service.increaseView(1);

      expect(prismaMock.video.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
          },
        }),
      );

      expect(result.views).toBe(11);
    });
  });

  describe('createUploadUrl', () => {
    it('should create video upload url', async () => {
      storageMock.createVideoKey.mockReturnValue('videos/2026/09/test.mp4');

      storageMock.createPresignedUploadUrl.mockResolvedValue({
        url: 'https://r2.test/upload',
        key: 'videos/2026/09/test.mp4',
      });

      const result = await service.createUploadUrl('test.mp4', 'video/mp4');

      expect(storageMock.createVideoKey).toHaveBeenCalledWith('test.mp4');

      expect(storageMock.createPresignedUploadUrl).toHaveBeenCalledWith(
        'videos/2026/09/test.mp4',
        'video/mp4',
      );

      expect(result.url).toBe('https://r2.test/upload');
    });

    it('should pass contentType to storage without validation', async () => {
      // createUploadUrl does not validate contentType — that responsibility
      // belongs to the DTO / controller layer. The service just forwards.
      storageMock.createVideoKey.mockReturnValue('videos/2026/09/test.jpg');

      storageMock.createPresignedUploadUrl.mockResolvedValue({
        url: 'https://r2.test/upload-img',
        key: 'videos/2026/09/test.jpg',
      });

      const result = await service.createUploadUrl('test.jpg', 'image/jpeg');

      expect(storageMock.createVideoKey).toHaveBeenCalledWith('test.jpg');
      expect(result.url).toBe('https://r2.test/upload-img');
    });
  });

  describe('createThumbnailUploadUrl', () => {
    it('should create thumbnail upload url', async () => {
      storageMock.createThumbnailKey.mockReturnValue(
        'thumbnails/2026/09/test.jpg',
      );

      storageMock.createPresignedUploadUrl.mockResolvedValue({
        url: 'https://r2.test/upload-thumbnail',
        key: 'thumbnails/2026/09/test.jpg',
      });

      const result = await service.createThumbnailUploadUrl(
        'test.jpg',
        'image/jpeg',
      );

      expect(storageMock.createThumbnailKey).toHaveBeenCalledWith('test.jpg');

      expect(storageMock.createPresignedUploadUrl).toHaveBeenCalledWith(
        'thumbnails/2026/09/test.jpg',
        'image/jpeg',
      );

      expect(result.url).toBe('https://r2.test/upload-thumbnail');
    });

    it('should reject non-image file', async () => {
      await expect(
        service.createThumbnailUploadUrl('test.mp4', 'video/mp4'),
      ).rejects.toThrow(BadRequestException);

      expect(storageMock.createThumbnailKey).not.toHaveBeenCalled();
    });
  });
});
