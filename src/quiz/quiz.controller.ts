import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('question')
  getRandomQuestion(@Query('videoIds') videoIdsStr?: string) {
    const videoIds = videoIdsStr
      ? videoIdsStr
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];
    return this.quizService.getRandomQuestion(videoIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post('answer')
  submitAnswer(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizService.submitAnswer(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('review')
  getReviewList(@CurrentUser() user: AuthUser) {
    return this.quizService.getReviewList(user.userId);
  }
}
