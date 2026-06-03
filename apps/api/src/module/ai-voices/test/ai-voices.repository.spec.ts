import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AiVoicesRepository } from '../repository/ai-voices.repository';
import { cacheRecord, createAiVoicesPrismaMock } from './ai-voices-test-utils';

describe(AiVoicesRepository.name, () => {
  let prisma: ReturnType<typeof createAiVoicesPrismaMock>;
  let repository: AiVoicesRepository;

  beforeEach(() => {
    prisma = createAiVoicesPrismaMock();
    repository = new AiVoicesRepository(prisma as never);
  });

  it('lists non-enrolled AI identities with pagination and search filters', async () => {
    prisma.voice_records.findMany.mockResolvedValue([
      { voice_id: 'enrolled-1' },
    ]);
    prisma.ai_identities_cache.findMany.mockResolvedValue([cacheRecord]);
    prisma.ai_identities_cache.count.mockResolvedValue(1);

    const result = await repository.findNonEnrolled({
      page: 2,
      page_size: 5,
      search: 'AI',
    });

    expect(prisma.ai_identities_cache.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          voice_id: { notIn: ['enrolled-1'] },
          OR: expect.any(Array),
        }),
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      page_size: 5,
      total: 1,
      total_pages: 1,
    });
  });

  it('filters non-enrolled AI identities by operator sessions', async () => {
    prisma.voice_records.findMany.mockResolvedValue([
      { voice_id: 'enrolled-1' },
    ]);
    prisma.identify_sessions.findMany.mockResolvedValue([
      {
        results: {
          speakers: [
            { matched_voice_id: 'voice-1' },
            { matched_voice_id: 'voice-2' },
          ],
        },
      },
    ]);
    prisma.ai_identities_cache.findMany.mockResolvedValue([cacheRecord]);
    prisma.ai_identities_cache.count.mockResolvedValue(1);

    await repository.findNonEnrolled({ page: 1 }, {
      id: 'operator-1',
      role: Role.OPERATOR,
    } as never);

    expect(prisma.identify_sessions.findMany).toHaveBeenCalledWith({
      where: { user_id: 'operator-1' },
      select: { results: true },
    });
    expect(prisma.ai_identities_cache.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          voice_id: {
            notIn: ['enrolled-1'],
            in: ['voice-1', 'voice-2'],
          },
        }),
      }),
    );
  });

  it('returns cache by voice id or throws when not found', async () => {
    prisma.ai_identities_cache.findUnique.mockResolvedValueOnce(cacheRecord);
    await expect(repository.findById(cacheRecord.voice_id)).resolves.toBe(
      cacheRecord,
    );

    prisma.ai_identities_cache.findUnique.mockResolvedValueOnce(null);
    await expect(repository.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('finds the first identify session containing the AI voice id', async () => {
    prisma.identify_sessions.findFirst.mockResolvedValue({ id: 'session-1' });

    await expect(
      repository.findFirstSampleSession(cacheRecord.voice_id),
    ).resolves.toEqual({ id: 'session-1' });
    expect(prisma.identify_sessions.findFirst).toHaveBeenCalledWith({
      where: {
        results: {
          array_contains: [{ matched_voice_id: cacheRecord.voice_id }],
        },
      },
      orderBy: { identified_at: 'asc' },
    });
  });

  it('filters sample session by owner for operators', async () => {
    prisma.identify_sessions.findFirst.mockResolvedValue({ id: 'session-1' });

    await repository.findFirstSampleSession(cacheRecord.voice_id, {
      id: 'operator-1',
      role: Role.OPERATOR,
    } as never);

    expect(prisma.identify_sessions.findFirst).toHaveBeenCalledWith({
      where: {
        user_id: 'operator-1',
        results: {
          array_contains: [{ matched_voice_id: cacheRecord.voice_id }],
        },
      },
      orderBy: { identified_at: 'asc' },
    });
  });
});
