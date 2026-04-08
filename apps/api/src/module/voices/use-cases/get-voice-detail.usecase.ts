import storageConfig from '@/config/storage.config';
import { BaseUseCase } from '@/shared/interfaces/base-usecase.interface';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import { VoicesRepository } from '../repository/voices.repository';

@Injectable()
export class GetVoiceDetailUseCase implements BaseUseCase<string, any> {
  constructor(
    private readonly voicesRepository: VoicesRepository,
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  async execute(id: string) {
    const user = await this.voicesRepository.findDetail(id);
    const activeRecord = user.voice_records.find((r) => r.is_active);

    // 1. Kiểm tra audio available (local disk check)
    let audioAvailable = false;
    if (activeRecord) {
      const audioPath = resolve(
        process.cwd(),
        'uploads/voices',
        basename(activeRecord.audio_file.file_path),
      );
      audioAvailable = existsSync(audioPath);
    }

    // 2. Lấy lịch sử nhận dạng (5 phiên gần nhất)
    const rawSessions = await this.voicesRepository.findIdentifyHistory(
      activeRecord?.voice_id || '',
    );

    const identifyHistory = rawSessions.map((s) => {
      const results = (s.results as any[]) || [];
      // Tìm score của user này trong results
      // Cả Single và Multi đều có matched_voice_id ở cấp độ kết quả match
      const myResult = results.find(
        (r) => r.matched_voice_id === activeRecord?.voice_id,
      );

      return {
        session_id: s.id,
        identified_at: s.identified_at,
        score: myResult?.score || null,
      };
    });

    // 3. Transform response
    return {
      id: user.id,
      voice_id: activeRecord?.voice_id || null,
      name: user.name,
      citizen_identification: user.citizen_identification,
      phone_number: user.phone_number,
      hometown: user.hometown,
      job: user.job,
      passport: user.passport,
      criminal_record: user.criminal_record,
      audio_url: activeRecord
        ? `${this.storage.cdnUrl}/${activeRecord.audio_file.file_path}`
        : null,
      audio_available: audioAvailable,
      is_active: activeRecord?.is_active || false,
      version: activeRecord?.version || 0,
      enrolled_at: activeRecord?.created_at || null,
      voice_history: user.voice_records.map((r) => ({
        version: r.version,
        audio_url: `${this.storage.cdnUrl}/${r.audio_file.file_path}`,
        is_active: r.is_active,
        created_at: r.created_at,
      })),
      identify_history: identifyHistory,
    };
  }
}
