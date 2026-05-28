import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Readable } from 'stream';
import { StorageService } from '../service/storage.service';

describe(StorageService.name, () => {
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('initializes driver with known subdirectories', async () => {
    const driver = { onInit: jest.fn().mockResolvedValue(undefined) };
    const service = new StorageService(driver as never);

    await service.onModuleInit();

    expect(driver.onInit).toHaveBeenCalledWith([
      'voices',
      'identify',
      'update-voice',
    ]);
  });

  it('saves through driver and maps save errors to service unavailable', async () => {
    const stream = Readable.from(['data']);
    const driver = {
      save: jest.fn().mockResolvedValue({ storageKey: 'voices/a.wav' }),
    };
    const service = new StorageService(driver as never);

    await expect(service.save(stream, 'voices', 'a.wav')).resolves.toEqual({
      storageKey: 'voices/a.wav',
    });

    driver.save.mockRejectedValue(new Error('disk down'));
    await expect(
      service.save(stream, 'voices', 'a.wav'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('ignores empty delete and failed delete, and returns false for invalid exists', async () => {
    const driver = {
      delete: jest.fn().mockRejectedValue(new Error('delete failed')),
      exists: jest.fn().mockRejectedValue(new Error('exists failed')),
    };
    const service = new StorageService(driver as never);

    await expect(service.delete('')).resolves.toBeUndefined();
    await expect(service.delete('voices/a.wav')).resolves.toBeUndefined();
    await expect(service.exists('')).resolves.toBe(false);
    await expect(service.exists('voices/a.wav')).resolves.toBe(false);
  });

  it('returns read stream or rejects unsupported driver', async () => {
    const stream = Readable.from(['data']);
    await expect(
      new StorageService({
        getReadStream: jest.fn().mockResolvedValue(stream),
      } as never).getReadStream('voices/a.wav'),
    ).resolves.toBe(stream);

    await expect(
      new StorageService({} as never).getReadStream('voices/a.wav'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      new StorageService({} as never).getReadStream(''),
    ).rejects.toThrow('storageKey rỗng');
  });
});
