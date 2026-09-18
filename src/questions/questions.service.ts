import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const correctCount = dto.options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Question must have exactly 1 correct option');
    }

    // Nếu có videoId, kiểm tra video tồn tại và chưa có quiz khác
    if (dto.videoId !== undefined) {
      const video = await this.prisma.video.findUnique({
        where: { id: dto.videoId },
        include: { quiz: true },
      });
      if (!video) {
        throw new NotFoundException('Video not found');
      }
      if (video.quiz) {
        throw new BadRequestException('Video already has a quiz linked to it');
      }
    }

    return this.prisma.question.create({
      data: {
        content: dto.content,
        categoryId: dto.categoryId,
        ...(dto.videoId !== undefined && { videoId: dto.videoId }),
        options: {
          create: dto.options.map((opt) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: {
        options: true,
        category: true,
        video: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async findAll(categoryId?: number) {
    return this.prisma.question.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        options: true,
        category: true,
        video: {
          select: { id: true, title: true, thumbnailKey: true },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findById(id: number) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        category: true,
        video: {
          select: { id: true, title: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async update(id: number, dto: UpdateQuestionDto) {
    await this.findById(id);

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Cập nhật các đáp án nếu có
    if (dto.options && dto.options.length > 0) {
      const correctCount = dto.options.filter((opt) => opt.isCorrect === true).length;
      // Chỉ validate nếu có ít nhất 1 option được set isCorrect
      const hasCorrectSet = dto.options.some((opt) => opt.isCorrect !== undefined);
      if (hasCorrectSet && correctCount !== 1) {
        throw new BadRequestException('Question must have exactly 1 correct option');
      }

      // Cập nhật từng option
      await Promise.all(
        dto.options.map((opt) =>
          this.prisma.questionOption.update({
            where: { id: opt.id },
            data: {
              ...(opt.content !== undefined && { content: opt.content }),
              ...(opt.isCorrect !== undefined && { isCorrect: opt.isCorrect }),
            },
          }),
        ),
      );
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.videoId !== undefined && { videoId: dto.videoId }),
      },
      include: {
        options: true,
        category: true,
        video: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async remove(id: number) {
    await this.findById(id);

    await this.prisma.quizAnswer.deleteMany({
      where: { questionId: id },
    });

    await this.prisma.question.delete({
      where: { id },
    });

    return {
      message: 'Question deleted successfully',
    };
  }
}
