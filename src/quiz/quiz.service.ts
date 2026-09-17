import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getRandomQuestion(videoIds: number[]) {
    if (!videoIds || videoIds.length === 0) {
      throw new NotFoundException('No questions available for watched videos');
    }

    const videos = await this.prisma.video.findMany({
      where: { id: { in: videoIds } },
      select: { id: true, categoryId: true },
    });

    const categoryIds = [
      ...new Set(
        videos
          .map((v) => v.categoryId)
          .filter((catId): catId is number => catId !== null),
      ),
    ];

    if (categoryIds.length === 0) {
      throw new NotFoundException('No questions available for watched videos');
    }

    const questions = await this.prisma.question.findMany({
      where: { categoryId: { in: categoryIds } },
      include: {
        options: true,
        category: true,
      },
    });

    if (questions.length === 0) {
      throw new NotFoundException('No questions available for watched videos');
    }

    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    // Shuffle options & sanitize isCorrect
    const shuffledOptions = [...randomQuestion.options]
      .sort(() => Math.random() - 0.5)
      .map(({ id, label, content }) => ({
        id,
        label,
        content,
      }));

    return {
      id: randomQuestion.id,
      content: randomQuestion.content,
      categoryId: randomQuestion.categoryId,
      category: randomQuestion.category,
      options: shuffledOptions,
    };
  }

  async submitAnswer(userId: number, dto: SubmitAnswerDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const selectedOption = question.options.find(
      (opt) => opt.id === dto.selectedOptionId,
    );

    if (!selectedOption) {
      throw new BadRequestException('Invalid selected option');
    }

    const isCorrect = selectedOption.isCorrect;
    let videoToReviewId: number | null = null;
    let videoToReview: any = null;

    if (!isCorrect && dto.videoIds && dto.videoIds.length > 0) {
      const matchingVideos = await this.prisma.video.findMany({
        where: {
          id: { in: dto.videoIds },
          categoryId: question.categoryId,
        },
        include: { category: true },
      });

      if (matchingVideos.length > 0) {
        const randomVideo =
          matchingVideos[Math.floor(Math.random() * matchingVideos.length)];
        videoToReviewId = randomVideo.id;
        videoToReview = randomVideo;
      }
    }

    await this.prisma.quizAnswer.create({
      data: {
        userId,
        questionId: dto.questionId,
        selectedOptionId: dto.selectedOptionId,
        isCorrect,
        videoToReviewId,
      },
    });

    const correctOption = question.options.find((opt) => opt.isCorrect);

    return {
      isCorrect,
      correctOptionId: correctOption?.id,
      videoToReview,
    };
  }

  async getReviewList(userId: number) {
    return this.prisma.quizAnswer.findMany({
      where: {
        userId,
        isCorrect: false,
      },
      include: {
        question: {
          include: {
            category: true,
            options: true,
          },
        },
        selectedOption: true,
        videoToReview: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
