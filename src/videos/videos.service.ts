import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import 'multer';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { serializeBigInt } from '../common/utils/serialize-bigint';

import { CreateVideoDto } from './dto/create-video.dto';
import { GetVideosDto } from './dto/get-videos.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: GetVideosDto) {
    const { page, limit, search, categoryId, sort } = query;

    const where: Prisma.VideoWhereInput = {
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),

      ...(categoryId
        ? {
            categoryId,
          }
        : {}),
    };

    const orderBy: Prisma.VideoOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'popular'
          ? { views: 'desc' }
          : { createdAt: 'desc' };

    const [videos, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
      }),

      this.prisma.video.count({
        where,
      }),
    ]);

    const data = videos.map((video) => ({
      ...video,
      videoUrl: this.storageService.getPublicUrl(video.videoKey),
      thumbnailUrl: video.thumbnailKey
        ? this.storageService.getPublicUrl(video.thumbnailKey)
        : null,
    }));

    return serializeBigInt({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  async findById(id: number) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const result = {
      ...video,
      videoUrl: this.storageService.getPublicUrl(video.videoKey),
      thumbnailUrl: video.thumbnailKey
        ? this.storageService.getPublicUrl(video.thumbnailKey)
        : null,
    };

    return serializeBigInt(result);
  }

  async createUploadUrl(fileName: string, contentType: string) {
    const key = this.storageService.createVideoKey(fileName);

    return this.storageService.createPresignedUploadUrl(key, contentType);
  }

  async create(data: CreateVideoDto, authorId: number) {
    const isExternalVideo =
      data.videoKey.startsWith('http://') ||
      data.videoKey.startsWith('https://');

    if (!isExternalVideo) {
      if (!data.videoKey.startsWith('videos/')) {
        throw new BadRequestException('Invalid video key');
      }

      const videoExists = await this.storageService.exists(data.videoKey);

      if (!videoExists) {
        throw new BadRequestException(
          'Video file has not been uploaded to storage',
        );
      }
    }

    if (data.thumbnailKey) {
      const isExternalThumb =
        data.thumbnailKey.startsWith('http://') ||
        data.thumbnailKey.startsWith('https://');

      if (!isExternalThumb) {
        if (!data.thumbnailKey.startsWith('thumbnails/')) {
          throw new BadRequestException('Invalid thumbnail key');
        }

        const thumbnailExists = await this.storageService.exists(
          data.thumbnailKey,
        );

        if (!thumbnailExists) {
          throw new BadRequestException(
            'Thumbnail file has not been uploaded to storage',
          );
        }
      }
    }

    if (data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    let video;

    try {
      video = await this.prisma.video.create({
        data: {
          title: data.title,
          description: data.description,
          videoKey: data.videoKey,
          thumbnailKey: data.thumbnailKey,
          duration: data.duration,
          fileSize: data.fileSize,
          categoryId: data.categoryId,
          authorId,
        },
      });
    } catch (error) {
      if (!isExternalVideo) {
        await this.storageService
          .deleteObject(data.videoKey)
          .catch(() => undefined);
      }

      if (
        data.thumbnailKey &&
        !(
          data.thumbnailKey.startsWith('http://') ||
          data.thumbnailKey.startsWith('https://')
        )
      ) {
        await this.storageService
          .deleteObject(data.thumbnailKey)
          .catch(() => undefined);
      }

      throw error;
    }

    return serializeBigInt({
      ...video,
      videoUrl: this.storageService.getPublicUrl(video.videoKey),
      thumbnailUrl: video.thumbnailKey
        ? this.storageService.getPublicUrl(video.thumbnailKey)
        : null,
    });
  }

  async increaseView(id: number) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return this.prisma.video.update({
      where: {
        id,
      },
      data: {
        views: {
          increment: 1,
        },
      },
      select: {
        id: true,
        views: true,
      },
    });
  }

  async update(id: number, data: UpdateVideoDto, userId: number) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this video',
      );
    }

    if (data.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const updated = await this.prisma.video.update({
      where: {
        id,
      },
      data: {
        ...(data.title !== undefined && {
          title: data.title,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.categoryId !== undefined && {
          categoryId: data.categoryId,
        }),
      },
    });

    return serializeBigInt(updated);
  }

  async remove(id: number, userId: number) {
    const video = await this.prisma.video.findUnique({
      where: {
        id,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this video',
      );
    }

    if (
      !video.videoKey.startsWith('http://') &&
      !video.videoKey.startsWith('https://')
    ) {
      await this.storageService
        .deleteObject(video.videoKey)
        .catch(() => undefined);
    }

    if (
      video.thumbnailKey &&
      !video.thumbnailKey.startsWith('http://') &&
      !video.thumbnailKey.startsWith('https://')
    ) {
      await this.storageService
        .deleteObject(video.thumbnailKey)
        .catch(() => undefined);
    }

    await this.prisma.video.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Video deleted successfully',
    };
  }

  async createThumbnailUploadUrl(fileName: string, contentType: string) {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Thumbnail must be an image');
    }

    const key = this.storageService.createThumbnailKey(fileName);

    return this.storageService.createPresignedUploadUrl(key, contentType);
  }

  async uploadFile(
    file: Express.Multer.File,
    type: 'video' | 'thumbnail' = 'video',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageService.uploadFile(file, type);
  }
}
