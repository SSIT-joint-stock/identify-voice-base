import batchFileConfig from '@/config/batch-file.config';
import { StorageService } from '@/module/storage/service/storage.service';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { basename, extname } from 'path';
import { Readable } from 'stream';

@Injectable()
export class BatchFileStorageRepository {
  constructor(
    private readonly storageService: StorageService,
    @Inject(batchFileConfig.KEY)
    private readonly config: ConfigType<typeof batchFileConfig>,
  ) {}

  async saveUploadedFile(
    batchId: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const extension = extname(file.originalname) || '.bin';
    const fileName = `${itemId}-${randomUUID()}${extension}`;
    if (!file.buffer && !file.path) {
      throw new Error('Không đọc được file upload đầu vào.');
    }

    const stream = file.buffer
      ? Readable.from(file.buffer)
      : createReadStream(file.path);

    return this.storageService.save(
      stream,
      `${this.config.storageDir}/${batchId}`,
      fileName,
    );
  }

  async getUploadedFile(item: {
    filename: string;
    mime_type?: string;
    size?: number;
    storage_key?: string;
  }): Promise<Express.Multer.File | undefined> {
    if (!item.storage_key) return undefined;

    const readStream = await this.storageService.getReadStream(
      item.storage_key,
    );
    const buffer = await this.streamToBuffer(readStream);

    return {
      fieldname: 'files',
      originalname: item.filename,
      encoding: '7bit',
      mimetype: item.mime_type ?? 'application/octet-stream',
      size: item.size ?? buffer.length,
      destination: '',
      filename: basename(item.storage_key),
      buffer,
      stream: Readable.from(buffer),
    } as Express.Multer.File;
  }

  async deleteUploadedFile(storageKey?: string) {
    if (!storageKey) return;
    await this.storageService.delete(storageKey);
  }

  private async streamToBuffer(stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
