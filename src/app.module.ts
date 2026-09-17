import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { PrismaModule } from 'prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { VideosModule } from './videos/videos.module';
import { CategoriesModule } from './categories/categories.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizModule } from './quiz/quiz.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    PrismaModule,
    UsersModule,
    VideosModule,
    CategoriesModule,
    StorageModule,
    AuthModule,
    QuestionsModule,
    QuizModule,
  ],
})
export class AppModule {}