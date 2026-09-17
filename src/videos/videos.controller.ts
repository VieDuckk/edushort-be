import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';

import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user';

import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { GetVideosDto } from './dto/get-videos.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  findAll(@Query() query: GetVideosDto) {
    return this.videosService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.videosService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: 'video' | 'thumbnail' = 'video',
  ) {
    return this.videosService.uploadFile(file, type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('thumbnail-upload-url')
  createThumbnailUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.videosService.createThumbnailUploadUrl(
      dto.fileName,
      dto.contentType,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('upload-url')
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.videosService.createUploadUrl(dto.fileName, dto.contentType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post()
  create(@Body() dto: CreateVideoDto, @CurrentUser() user: AuthUser) {
    return this.videosService.create(dto, user.userId);
  }

  @Post(':id/view')
  increaseView(@Param('id', ParseIntPipe) id: number) {
    return this.videosService.increaseView(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.videosService.update(id, dto, user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.videosService.remove(id, user.userId);
  }
}
