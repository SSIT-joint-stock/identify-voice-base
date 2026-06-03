import { Logger, NotFoundException } from '@nestjs/common';
import { DeleteVoiceUseCase } from '../use-cases/delete-voice.usecase';

describe(DeleteVoiceUseCase.name, () => {
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
  });

  it('deletes voice from AI Core and deactivates repository record', async () => {
    const repository = {
      findVoiceWithFiles: jest
        .fn()
        .mockResolvedValue({ voiceIds: ['voice-1'] }),
      deactivate: jest.fn().mockResolvedValue(undefined),
    };
    const aiCore = { deleteVoice: jest.fn().mockResolvedValue(undefined) };

    await new DeleteVoiceUseCase(repository as never, aiCore as never).execute(
      'user-1',
    );

    expect(aiCore.deleteVoice).toHaveBeenCalledWith('voice-1');
    expect(repository.deactivate).toHaveBeenCalledWith('user-1', undefined);
  });

  it('throws when voice profile or voice id is missing', async () => {
    const aiCore = { deleteVoice: jest.fn() };
    let repository = { findVoiceWithFiles: jest.fn().mockResolvedValue(null) };

    await expect(
      new DeleteVoiceUseCase(repository as never, aiCore as never).execute(
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    repository = {
      findVoiceWithFiles: jest.fn().mockResolvedValue({ voiceIds: [] }),
    };
    await expect(
      new DeleteVoiceUseCase(repository as never, aiCore as never).execute(
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
