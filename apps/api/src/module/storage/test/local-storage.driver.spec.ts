import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { Readable } from 'stream';
import { LocalStorageDriver } from '../drivers/local-storage.driver';

jest.mock('fs', () => ({
  constants: { F_OK: 0 },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(() => ({
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    end: jest.fn(),
  })),
  promises: {
    mkdir: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock('stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

describe(LocalStorageDriver.name, () => {
  let loggerLogSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerDebugSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('saves stream under configured root', async () => {
    const driver = new LocalStorageDriver({ rootDir: 'uploads' } as never);

    await expect(
      driver.save(Readable.from(['data']), 'voices', 'a.wav'),
    ).resolves.toEqual({ storageKey: 'voices/a.wav' });
    expect(fs.promises.mkdir).toHaveBeenCalledWith(
      expect.stringContaining('uploads/voices'),
      {
        recursive: true,
      },
    );
  });

  it('checks existence, reads streams, and ignores missing delete', async () => {
    const driver = new LocalStorageDriver({ rootDir: 'uploads' } as never);
    const stream = Readable.from(['data']);
    jest.mocked(fs.createReadStream).mockReturnValue(stream as never);
    jest.mocked(fs.promises.access).mockResolvedValue(undefined as never);
    jest.mocked(fs.promises.unlink).mockRejectedValue({ code: 'ENOENT' });

    await expect(driver.exists('voices/a.wav')).resolves.toBe(true);
    await expect(driver.getReadStream('voices/a.wav')).resolves.toBe(stream);
    await expect(driver.delete('voices/a.wav')).resolves.toBeUndefined();
  });

  it('initializes directories', async () => {
    const driver = new LocalStorageDriver({ rootDir: 'uploads' } as never);

    await driver.onInit(['voices', 'identify']);

    expect(fs.promises.mkdir).toHaveBeenCalledTimes(2);
  });
});
