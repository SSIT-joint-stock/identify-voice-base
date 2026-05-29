import { VoicesService } from '../service/voices.service';

describe(VoicesService.name, () => {
  function createService() {
    const useCases = {
      findAll: { execute: jest.fn().mockResolvedValue('find-all') },
      detail: { execute: jest.fn().mockResolvedValue('detail') },
      update: { execute: jest.fn().mockResolvedValue('update') },
      delete: { execute: jest.fn().mockResolvedValue('delete') },
      embedding: { execute: jest.fn().mockResolvedValue('embedding') },
      denoise: { execute: jest.fn().mockResolvedValue('denoise') },
    };
    const service = new VoicesService(
      useCases.findAll as never,
      useCases.detail as never,
      useCases.update as never,
      useCases.delete as never,
      useCases.embedding as never,
      useCases.denoise as never,
    );

    return { service, useCases };
  }

  it('delegates all public methods to their use cases', async () => {
    const { service, useCases } = createService();

    await expect(service.findAll({ page: 1 })).resolves.toBe('find-all');
    await expect(service.findOne('user-1')).resolves.toBe('detail');
    await expect(service.update('user-1', { name: 'New' })).resolves.toBe(
      'update',
    );
    await expect(service.deleteVoice('user-1')).resolves.toBe('delete');
    await expect(
      service.updateEmbedding('user-1', ['audio-1'], 'admin-1'),
    ).resolves.toBe('embedding');
    await expect(service.denoiseEnrollAudio('user-1', 'admin-1')).resolves.toBe(
      'denoise',
    );

    expect(useCases.update.execute).toHaveBeenCalledWith({
      id: 'user-1',
      dto: { name: 'New' },
    });
  });
});
