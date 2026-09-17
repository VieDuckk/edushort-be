import { Injectable } from '@nestjs/common';
import 'multer';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.getOrThrow<string>('R2_ACCOUNT_ID');

    this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET_NAME');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'R2_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  createVideoKey(fileName: string) {
    const extension = extname(fileName).toLowerCase();

    const now = new Date();

    const year = now.getUTCFullYear();

    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `videos/${year}/${month}/${randomUUID()}${extension}`;
  }

  createThumbnailKey(fileName: string) {
    const extension = extname(fileName).toLowerCase();

    const now = new Date();

    const year = now.getUTCFullYear();

    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `thumbnails/${year}/${month}/${randomUUID()}${extension}`;
  }

  createAvatarKey(fileName: string) {
    const extension = extname(fileName).toLowerCase() || '.jpg';

    const now = new Date();

    const year = now.getUTCFullYear();

    const month = String(now.getUTCMonth() + 1).padStart(2, '0');

    return `avatars/${year}/${month}/${randomUUID()}${extension}`;
  }

  async createPresignedUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 10,
    });

    return {
      url,
      key,
    };
  }

  async exists(key: string) {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  async deleteObject(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string) {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    const publicUrl = this.configService.getOrThrow<string>('R2_PUBLIC_URL');

    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    type: 'video' | 'thumbnail' | 'avatar' = 'video',
  ) {
    const key =
      type === 'video'
        ? this.createVideoKey(file.originalname)
        : type === 'thumbnail'
          ? this.createThumbnailKey(file.originalname)
          : this.createAvatarKey(file.originalname);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      key,
      url: this.getPublicUrl(key),
    };
  }
}

