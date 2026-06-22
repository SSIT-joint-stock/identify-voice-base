import { IdentifyService } from '../service/identify.service';
import { identifyFile } from './identify-test-utils';

describe(IdentifyService.name, () => {
  it('delegates identify request to use case', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue('result') };
    const service = new IdentifyService(useCase as never);

    await expect(
      service.identify(identifyFile, 'operator-1', 'SINGLE', 20),
    ).resolves.toBe('result');
    expect(useCase.execute).toHaveBeenCalledWith(
      identifyFile,
      'operator-1',
      'SINGLE',
      20,
    );
  });
});
