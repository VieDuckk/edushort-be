import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  controllers: [VideosController],
  providers: [VideosService],
  imports: [StorageModule],
})
export class VideosModule {}
