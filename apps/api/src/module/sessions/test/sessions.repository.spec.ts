import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SessionsRepository } from '../repository/sessions.repository';
import { createSessionsPrismaMock, sessionRecord } from './sessions-test-utils';

describe(SessionsRepository.name, () => {
  let prisma: ReturnType<typeof createSessionsPrismaMock>;
  let repository: SessionsRepository;

  beforeEach(() => {
    prisma = createSessionsPrismaMock();
    repository = new SessionsRepository(
      prisma as never,
      { cdnUrl: 'http://cdn.local' } as never,
    );
  });

  it('creates identify session', async () => {
    prisma.identify_sessions.create.mockResolvedValue(sessionRecord);

    await expect(
      repository.create({
        user_id: 'operator-1',
        audio_file_id: 'audio-1',
        results: [],
      }),
    ).resolves.toBe(sessionRecord);
  });

  it('finds sessions with pagination and top score', async () => {
    prisma.identify_sessions.findMany.mockResolvedValue([sessionRecord]);
    prisma.identify_sessions.count.mockResolvedValue(1);

    const result = await repository.findAll({ page: 2, page_size: 5 });

    expect(prisma.identify_sessions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(result.items[0]).toMatchObject({
      id: 'session-1',
      audio_url: 'http://cdn.local/identify/audio.wav',
      result_count: 1,
      top_score: 0.9,
    });
  });

  it('filters sessions by owner for operators', async () => {
    prisma.identify_sessions.findMany.mockResolvedValue([sessionRecord]);
    prisma.identify_sessions.count.mockResolvedValue(1);

    await repository.findAll({ page: 1 }, {
      id: 'operator-1',
      role: Role.OPERATOR,
    } as never);

    expect(prisma.identify_sessions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 'operator-1' }),
      }),
    );
  });

  it('finds session detail or throws when missing', async () => {
    prisma.identify_sessions.findFirst.mockResolvedValueOnce(sessionRecord);

    await expect(repository.findOne('session-1')).resolves.toMatchObject({
      id: 'session-1',
      audio_url: 'http://cdn.local/identify/audio.wav',
    });

    prisma.identify_sessions.findFirst.mockResolvedValueOnce(null);
    await expect(repository.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filters session detail by owner for operators', async () => {
    prisma.identify_sessions.findFirst.mockResolvedValue(sessionRecord);

    await repository.findOne('session-1', {
      id: 'operator-1',
      role: Role.OPERATOR,
    } as never);

    expect(prisma.identify_sessions.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1', user_id: 'operator-1' },
      }),
    );
  });
});
