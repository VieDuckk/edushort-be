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

    return this.prisma.question.create({
      data: {
        content: dto.content,
        categoryId: dto.categoryId,
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
      },
    });
  }

  async findAll(categoryId?: number) {
    return this.prisma.question.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        options: true,
        category: true,
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

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      },
      include: {
        options: true,
        category: true,
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
