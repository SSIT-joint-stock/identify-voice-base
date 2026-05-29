import { EnrollService } from '../service/enroll.service';
import { enrollDto, multerFile } from './enroll-test-utils';

describe(EnrollService.name, () => {
  it('delegates enroll request to use case', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue('result') };
    const service = new EnrollService(useCase as never);

    await expect(
      service.enroll(multerFile, enrollDto, 'operator-1'),
    ).resolves.toBe('result');
    expect(useCase.execute).toHaveBeenCalledWith(
      multerFile,
      enrollDto,
      'operator-1',
    );
  });
});
