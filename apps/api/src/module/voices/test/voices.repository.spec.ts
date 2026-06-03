import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { VoicesRepository } from '../repository/voices.repository';
import {
  createVoicesPrismaMock,
  searchUtil,
  voiceRecord,
} from './voices-test-utils';

describe(VoicesRepository.name, () => {
  let prisma: ReturnType<typeof createVoicesPrismaMock>;
  let repository: VoicesRepository;

  beforeEach(() => {
    prisma = createVoicesPrismaMock();
    repository = new VoicesRepository(
      prisma as never,
      searchUtil as never,
      { cdnUrl: 'http://cdn.local' } as never,
    );
  });

  it('finds active voices with pagination and transforms response', async () => {
    prisma.voice_records.findMany.mockResolvedValue([voiceRecord]);
    prisma.voice_records.count.mockResolvedValue(1);

    const result = await repository.findActiveVoices({
      page: 2,
      page_size: 5,
      search: 'Nguyen',
    });

    expect(prisma.voice_records.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(result.items[0]).toMatchObject({
      id: 'user-1',
      voice_id: 'voice-1',
      audio_url: 'http://cdn.local/voices/audio.wav',
    });
  });

  it('filters active voices by owner for operators', async () => {
    prisma.voice_records.findMany.mockResolvedValue([voiceRecord]);
    prisma.voice_records.count.mockResolvedValue(1);

    await repository.findActiveVoices(
      { page: 1 },
      { id: 'operator-1', role: Role.OPERATOR },
    );

    expect(prisma.voice_records.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          audio_file: { uploaded_by: 'operator-1' },
        }),
      }),
    );
  });

  it('finds detail or throws when missing', async () => {
    prisma.users.findFirst.mockResolvedValueOnce({
      ...voiceRecord.user,
      voice_records: [voiceRecord],
    });
    await expect(repository.findDetail('user-1')).resolves.toMatchObject({
      id: 'user-1',
    });

    prisma.users.findFirst.mockResolvedValueOnce(null);
    await expect(repository.findDetail('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('allows operators to view matched voices without modify access', async () => {
    prisma.users.findFirst.mockResolvedValueOnce({
      ...voiceRecord.user,
      voice_records: [
        {
          ...voiceRecord,
          audio_file: {
            ...voiceRecord.audio_file,
            uploaded_by: 'operator-2',
          },
        },
      ],
    });
    prisma.identify_sessions.findFirst.mockResolvedValueOnce({
      id: 'session-1',
    });

    const result = await repository.findDetail('user-1', {
      id: 'operator-1',
      role: Role.OPERATOR,
    });

    expect(result).toMatchObject({
      id: 'user-1',
      can_modify: false,
      access_source: 'MATCHED_SESSION',
    });
    expect(prisma.identify_sessions.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user_id: 'operator-1',
        }),
      }),
    );
  });

  it('blocks unrelated operators from viewing voice detail', async () => {
    prisma.users.findFirst.mockResolvedValueOnce({
      ...voiceRecord.user,
      voice_records: [
        {
          ...voiceRecord,
          audio_file: {
            ...voiceRecord.audio_file,
            uploaded_by: 'operator-2',
          },
        },
      ],
    });
    prisma.identify_sessions.findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findDetail('user-1', {
        id: 'operator-1',
        role: Role.OPERATOR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates user info after detail check', async () => {
    prisma.users.findFirst
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({ id: 'user-1' });
    prisma.users.update.mockResolvedValue({ ...voiceRecord.user, name: 'New' });

    await expect(
      repository.updateUserInfo('user-1', { name: 'New' }),
    ).resolves.toMatchObject({ name: 'New' });
  });

  it('finds identify history and active voice files for delete', async () => {
    prisma.identify_sessions.findMany.mockResolvedValue([{ id: 'session-1' }]);
    await expect(repository.findIdentifyHistory('voice-1')).resolves.toEqual([
      { id: 'session-1' },
    ]);
    await expect(repository.findIdentifyHistory('')).resolves.toEqual([]);

    prisma.users.findFirst.mockResolvedValue({
      ...voiceRecord.user,
      voice_records: [voiceRecord],
    });
    await expect(repository.findVoiceWithFiles('user-1')).resolves.toEqual({
      userId: 'user-1',
      voiceIds: ['voice-1'],
      audioFileIds: ['audio-1'],
      audioPaths: ['voices/audio.wav'],
    });
  });

  it('deactivates active voice record or throws when none active', async () => {
    prisma.users.findFirst
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({
        ...voiceRecord.user,
        voice_records: [voiceRecord],
      });
    prisma.voice_records.update.mockResolvedValue({
      ...voiceRecord,
      is_active: false,
    });

    await expect(
      repository.deactivate('user-1', {
        id: 'operator-1',
        role: Role.OPERATOR,
      }),
    ).resolves.toMatchObject({
      is_active: false,
    });

    prisma.users.findFirst
      .mockResolvedValueOnce({ id: 'user-1' })
      .mockResolvedValueOnce({
        ...voiceRecord.user,
        voice_records: [{ ...voiceRecord, is_active: false }],
      });
    await expect(
      repository.deactivate('user-1', {
        id: 'operator-1',
        role: Role.OPERATOR,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
