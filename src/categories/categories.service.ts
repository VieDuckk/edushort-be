import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },

      include: {
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(data: { name: string; slug: string }) {
    try {
      return await this.prisma.category.create({
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name or slug already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    try {
      return await this.prisma.category.update({
        where: {
          id,
        },

        data: {
          ...(data.name !== undefined && {
            name: data.name,
          }),

          ...(data.slug !== undefined && {
            slug: data.slug,
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Category name or slug already exists');
      }

      throw error;
    }
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const videoCount = await this.prisma.video.count({
      where: {
        categoryId: id,
      },
    });

    if (videoCount > 0) {
      throw new ConflictException(
        'Cannot delete category because it contains videos',
      );
    }

    await this.prisma.category.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Category deleted successfully',
    };
  }
}
