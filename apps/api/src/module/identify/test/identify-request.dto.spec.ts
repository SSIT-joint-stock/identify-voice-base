import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdentifyRequestDto } from '../dto/identify-request.dto';

describe(IdentifyRequestDto.name, () => {
  it('converts a valid multipart top_k_records value to a number', async () => {
    const dto = plainToInstance(IdentifyRequestDto, {
      type: 'SINGLE',
      top_k_records: '20',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.top_k_records).toBe(20);
  });

  it('accepts any positive integer top_k_records value', async () => {
    const dto = plainToInstance(IdentifyRequestDto, {
      type: 'SINGLE',
      top_k_records: '7',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.top_k_records).toBe(7);
  });

  it('rejects non-positive top_k_records values', async () => {
    const dto = plainToInstance(IdentifyRequestDto, {
      type: 'SINGLE',
      top_k_records: '0',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
