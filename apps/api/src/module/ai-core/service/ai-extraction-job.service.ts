import { aiCoreConfig } from '@/config';
import { RedisService } from '@/database/redis/redis.service';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { copyFile, mkdtemp, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { promisify } from 'util';
import { OcrRequestDto } from '../dto/ocr-request.dto';
import { SpeechToTextRequestDto } from '../dto/speech-to-text-request.dto';
import { AiOcrUseCase } from '../usecase/ai-ocr.usecase';
import { AiSpeechToTextUseCase } from '../usecase/ai-speech-to-text.usecase';

type ExtractionJobMode = 'ocr' | 'speech-to-text';
type ExtractionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ExtractionJobDto = OcrRequestDto | SpeechToTextRequestDto;
type OcrPageResult = {
  page: number;
  text?: string;
  result?: Array<{ text?: string }>;
};

export interface ExtractionJobState {
  job_id: string;
  status: ExtractionJobStatus;
  progress: number;
  mode: ExtractionJobMode;
  result?: unknown;
  error?: string;
  created_at: string;
  updated_at: string;
}

const EXTRACTION_JOB_TTL_SECONDS = 60 * 30;
const execFileAsync = promisify(execFile);

@Injectable()
export class AiExtractionJobService {
  private readonly logger = new Logger(AiExtractionJobService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly ocrUseCase: AiOcrUseCase,
    private readonly speechToTextUseCase: AiSpeechToTextUseCase,
    @Inject(aiCoreConfig.KEY)
    private readonly config: ConfigType<typeof aiCoreConfig>,
  ) {}

  async createOcrJob(file: Express.Multer.File, dto: OcrRequestDto) {
    return this.createJob('ocr', file, dto);
  }

  async createSpeechToTextJob(
    file: Express.Multer.File,
    dto: SpeechToTextRequestDto,
  ) {
    return this.createJob('speech-to-text', file, dto);
  }

  async getJob(jobId: string) {
    const rawJob = await this.redisService.get(this.getJobKey(jobId));

    if (!rawJob) {
      throw new NotFoundException(
        'Extraction job không tồn tại hoặc đã hết hạn.',
      );
    }

    return JSON.parse(rawJob) as ExtractionJobState;
  }

  private async createJob(
    mode: ExtractionJobMode,
    file: Express.Multer.File,
    dto: ExtractionJobDto,
  ) {
    const jobId = randomUUID();
    const now = new Date().toISOString();

    await this.saveJob({
      job_id: jobId,
      status: 'pending',
      progress: 0,
      mode,
      created_at: now,
      updated_at: now,
    });

    void this.runJob(jobId, mode, file, dto);

    return { job_id: jobId };
  }

  private async runJob(
    jobId: string,
    mode: ExtractionJobMode,
    file: Express.Multer.File,
    dto: ExtractionJobDto,
  ) {
    let progressTimer: NodeJS.Timeout | undefined;

    try {
      await this.patchJob(jobId, {
        status: 'processing',
        progress: 5,
      });

      progressTimer = this.startProgressTimer(jobId);

      const result =
        mode === 'ocr'
          ? await this.runOcrJob(jobId, file, dto as OcrRequestDto)
          : await this.speechToTextUseCase.execute(
              file,
              dto as SpeechToTextRequestDto,
            );

      await this.patchJob(jobId, {
        status: 'completed',
        progress: 100,
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(`Extraction job ${jobId} failed: ${message}`);

      await this.patchJob(jobId, {
        status: 'failed',
        error: message,
      }).catch(() => {});
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
    }
  }

  private async runOcrJob(
    jobId: string,
    file: Express.Multer.File,
    dto: OcrRequestDto,
  ) {
    if (!this.isPdfFile(file)) {
      return this.ocrUseCase.execute(file, dto);
    }

    return this.runPdfOcrInBatches(jobId, file, dto);
  }

  private isPdfFile(file: Express.Multer.File) {
    return (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    );
  }

  private async runPdfOcrInBatches(
    jobId: string,
    file: Express.Multer.File,
    dto: OcrRequestDto,
  ) {
    const workingDir = await mkdtemp(join(tmpdir(), 'identify-ocr-pdf-'));

    try {
      const sourcePath = join(
        workingDir,
        this.sanitizeFileName(file.originalname),
      );
      if (file.buffer) {
        await writeFile(sourcePath, file.buffer);
      } else if (file.path) {
        await copyFile(file.path, sourcePath);
      } else {
        throw new Error('Không đọc được file PDF đầu vào.');
      }

      const totalPages = await this.getPdfPageCount(sourcePath);
      const batchSize = Math.max(1, this.config.ocr.pdfBatchSize);
      const pages: OcrPageResult[] = [];

      for (let startPage = 1; startPage <= totalPages; startPage += batchSize) {
        const endPage = Math.min(startPage + batchSize - 1, totalPages);
        const batchFile = await this.createPdfPageBatch(
          sourcePath,
          workingDir,
          startPage,
          endPage,
        );
        const batchResult = await this.ocrUseCase.execute(batchFile, {
          ...dto,
          format: false,
        });
        pages.push(...this.normalizeOcrPages(batchResult, startPage, endPage));

        await this.patchJob(jobId, {
          status: 'processing',
          progress: Math.min(
            99,
            Math.max(5, Math.round((endPage / totalPages) * 100)),
          ),
          result: {
            results: pages,
            completed_pages: endPage,
            total_pages: totalPages,
          },
        });
      }

      return {
        results: pages,
        completed_pages: totalPages,
        total_pages: totalPages,
      };
    } finally {
      await rm(workingDir, { recursive: true, force: true });
    }
  }

  private async getPdfPageCount(filePath: string) {
    const { stdout } = await execFileAsync('pdfinfo', [filePath]);
    const match = stdout.match(/^Pages:\s+(\d+)/im);
    const pageCount = match ? Number(match[1]) : 0;

    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new Error('Không xác định được số trang PDF.');
    }

    return pageCount;
  }

  private async createPdfPageBatch(
    sourcePath: string,
    workingDir: string,
    startPage: number,
    endPage: number,
  ): Promise<Express.Multer.File> {
    const pagePattern = join(
      workingDir,
      `batch-${startPage}-${endPage}-page-%d.pdf`,
    );
    await execFileAsync('pdfseparate', [
      '-f',
      String(startPage),
      '-l',
      String(endPage),
      sourcePath,
      pagePattern,
    ]);

    const pageFiles = (await readdir(workingDir))
      .filter((fileName) =>
        fileName.startsWith(`batch-${startPage}-${endPage}-page-`),
      )
      .sort(
        (a, b) =>
          this.getPageNumberFromFileName(a) - this.getPageNumberFromFileName(b),
      )
      .map((fileName) => join(workingDir, fileName));
    const batchPath = join(workingDir, `batch-${startPage}-${endPage}.pdf`);

    if (pageFiles.length === 1) {
      return this.createLocalPdfMulterFile(pageFiles[0], startPage, endPage);
    }

    await execFileAsync('pdfunite', [...pageFiles, batchPath]);

    return this.createLocalPdfMulterFile(batchPath, startPage, endPage);
  }

  private createLocalPdfMulterFile(
    path: string,
    startPage: number,
    endPage: number,
  ) {
    return {
      path,
      originalname: `pages-${startPage}-${endPage}.pdf`,
      filename: basename(path),
      mimetype: 'application/pdf',
    } as Express.Multer.File;
  }

  private getPageNumberFromFileName(fileName: string) {
    const match = fileName.match(/page-(\d+)\.pdf$/);
    return match ? Number(match[1]) : 0;
  }

  private normalizeOcrPages(
    batchResult: unknown,
    startPage: number,
    endPage: number,
  ): OcrPageResult[] {
    const results = (batchResult as { results?: unknown })?.results;

    if (Array.isArray(results)) {
      return results.map((page, index) => {
        const record = page as OcrPageResult;
        const pageNumber = startPage + index;

        return {
          ...record,
          page: pageNumber,
          text: record.text ?? this.extractTextFromOcrPage(record),
        };
      });
    }

    if (typeof results === 'string') {
      return [
        {
          page: startPage,
          text:
            startPage === endPage
              ? results
              : `[Trang ${startPage}-${endPage}]\n${results}`,
        },
      ];
    }

    return [];
  }

  private extractTextFromOcrPage(page: OcrPageResult) {
    return (
      page.result
        ?.map((item) => item.text?.trim())
        .filter(Boolean)
        .join('\n') ?? ''
    );
  }

  private sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'source.pdf';
  }

  private startProgressTimer(jobId: string) {
    return setInterval(() => {
      void this.bumpProcessingProgress(jobId).catch((error) => {
        this.logger.warn(
          `Cannot update extraction job ${jobId} progress: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 2000);
  }

  private async bumpProcessingProgress(jobId: string) {
    const currentJob = await this.getJob(jobId);

    if (currentJob.status !== 'processing') {
      return;
    }

    const nextProgress =
      currentJob.progress < 70
        ? currentJob.progress + 5
        : currentJob.progress < 90
          ? currentJob.progress + 2
          : currentJob.progress + 1;

    await this.patchJob(jobId, {
      status: 'processing',
      progress: Math.min(nextProgress, 95),
    });
  }

  private async patchJob(
    jobId: string,
    patch: Partial<Omit<ExtractionJobState, 'job_id' | 'created_at' | 'mode'>>,
  ) {
    const currentJob = await this.getJob(jobId);

    await this.saveJob({
      ...currentJob,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  }

  private async saveJob(job: ExtractionJobState) {
    await this.redisService.set(
      this.getJobKey(job.job_id),
      JSON.stringify(job),
      EXTRACTION_JOB_TTL_SECONDS,
    );
  }

  private getJobKey(jobId: string) {
    return `ai-core:extraction-job:${jobId}`;
  }
}
