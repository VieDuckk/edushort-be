import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private formatVideo(video: any) {
    if (!video) return null;
    return {
      ...video,
      videoUrl: this.storageService.getPublicUrl(video.videoKey),
      thumbnailUrl: video.thumbnailKey
        ? this.storageService.getPublicUrl(video.thumbnailKey)
        : null,
    };
  }

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
    let rawVideoToReview: any = null;

    if (!isCorrect && dto.videoIds && dto.videoIds.length > 0) {
      let matchingVideos = await this.prisma.video.findMany({
        where: {
          id: { in: dto.videoIds },
          categoryId: question.categoryId,
        },
        include: { category: true },
      });

      if (matchingVideos.length === 0) {
        matchingVideos = await this.prisma.video.findMany({
          where: {
            id: { in: dto.videoIds },
          },
          include: { category: true },
        });
      }

      if (matchingVideos.length === 0) {
        matchingVideos = await this.prisma.video.findMany({
          where: {
            categoryId: question.categoryId,
          },
          include: { category: true },
          take: 5,
        });
      }

      if (matchingVideos.length > 0) {
        const randomVideo =
          matchingVideos[Math.floor(Math.random() * matchingVideos.length)];
        videoToReviewId = randomVideo.id;
        rawVideoToReview = randomVideo;
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
      videoToReview: this.formatVideo(rawVideoToReview),
    };
  }

  async getReviewList(userId: number) {
    const list = await this.prisma.quizAnswer.findMany({
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

    return list.map((item) => ({
      ...item,
      videoToReview: this.formatVideo(item.videoToReview),
    }));
  }
}

