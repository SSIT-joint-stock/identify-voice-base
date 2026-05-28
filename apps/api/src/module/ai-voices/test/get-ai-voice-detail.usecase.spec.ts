import { GetAiVoiceDetailUseCase } from '../use-cases/get-voice-detail-ai.usecase';
import { cacheRecord } from './ai-voices-test-utils';

describe(GetAiVoiceDetailUseCase.name, () => {
  it('delegates to repository', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(cacheRecord) };

    await expect(
      new GetAiVoiceDetailUseCase(repo as never).execute(cacheRecord.voice_id),
    ).resolves.toBe(cacheRecord);
    expect(repo.findById).toHaveBeenCalledWith(cacheRecord.voice_id);
  });
});
