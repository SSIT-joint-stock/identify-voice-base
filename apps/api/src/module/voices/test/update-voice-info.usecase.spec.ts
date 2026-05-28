import { UpdateVoiceInfoUseCase } from '../use-cases/update-voice-info.usecase';

describe(UpdateVoiceInfoUseCase.name, () => {
  it('updates voice owner info and maps response', async () => {
    const repository = {
      updateUserInfo: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'New Name',
        phone_number: '0900',
        job: 'Engineer',
        age: 31,
        gender: 'MALE',
      }),
    };

    const result = await new UpdateVoiceInfoUseCase(
      repository as never,
    ).execute({
      id: 'user-1',
      dto: { name: 'New Name' },
    });

    expect(result).toMatchObject({ id: 'user-1', name: 'New Name' });
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});
