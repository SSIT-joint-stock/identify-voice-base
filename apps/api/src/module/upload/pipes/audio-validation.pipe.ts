import { AudioPurpose } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class AudioValidationPipe implements PipeTransform {
  private readonly ALLOWED_MIMETYPES = [
    'audio/wav',
    'audio/mpeg',
    'audio/flac',
    'audio/ogg',
    'audio/x-wav',
    'audio/x-flac',
  ];

  private readonly ALLOWED_PURPOSES: AudioPurpose[] = [
    AudioPurpose.ENROLL,
    AudioPurpose.IDENTIFY,
    AudioPurpose.UPDATE_VOICE,
  ];

  transform(value: {
    file?: Express.Multer.File;
    files?: Express.Multer.File[];
    purpose: string;
  }) {
    const { file, files, purpose } = value;

    // Validate ít nhất một file tồn tại
    const hasFile = file != null || (files != null && files.length > 0);
    if (!hasFile) {
      throw new UnprocessableEntityException(
        'Vui lòng đính kèm ít nhất một file audio',
      );
    }

    // Validate mimetype cho tất cả files
    const allFiles = files ?? (file ? [file] : []);
    for (const f of allFiles) {
      if (!this.ALLOWED_MIMETYPES.includes(f.mimetype)) {
        throw new BadRequestException(
          'Định dạng file không được hỗ trợ. Chỉ chấp nhận WAV, MP3, FLAC, OGG',
        );
      }
    }

    // Validate purpose
    if (!purpose || !this.ALLOWED_PURPOSES.includes(purpose as AudioPurpose)) {
      throw new UnprocessableEntityException(
        'purpose không hợp lệ. Giá trị hợp lệ: ENROLL, IDENTIFY, UPDATE_VOICE',
      );
    }

    return value;
  }
}
