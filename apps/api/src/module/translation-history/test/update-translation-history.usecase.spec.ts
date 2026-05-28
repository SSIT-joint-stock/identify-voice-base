import { BadRequestError } from '@/common/response';
import { Role } from '@prisma/client';
import { UpdateTranslationHistoryUseCase } from '../use-cases/update-translation-history.usecase';
import { translationRecord } from './translation-history-test-utils';

describe(UpdateTranslationHistoryUseCase.name, () => {
  it('updates translation when editor owns record', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(translationRecord),
      updateEditedTranslation: jest.fn().mockResolvedValue({
        ...translationRecord,
        edited_translated_text: 'Edited',
        edited_at: new Date('2026-01-02'),
        edited_by: 'user-1',
      }),
    };

    const result = await new UpdateTranslationHistoryUseCase(
      repository as never,
    ).execute({
      id: 'history-1',
      translatedText: ' Edited ',
      editorId: 'user-1',
      editorRole: Role.OPERATOR,
    });

    expect(repository.updateEditedTranslation).toHaveBeenCalledWith(
      'history-1',
      'Edited',
      'user-1',
    );
    expect(result).toMatchObject({ effective_translated_text: 'Edited' });
  });

  it('allows admin to update any record', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(translationRecord),
      updateEditedTranslation: jest.fn().mockResolvedValue(translationRecord),
    };

    await expect(
      new UpdateTranslationHistoryUseCase(repository as never).execute({
        id: 'history-1',
        translatedText: 'Admin edit',
        editorId: 'admin-1',
        editorRole: Role.ADMIN,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects empty, missing, or unauthorized update', async () => {
    const repository = {
      findById: jest.fn(),
      updateEditedTranslation: jest.fn(),
    };

    await expect(
      new UpdateTranslationHistoryUseCase(repository as never).execute({
        id: 'history-1',
        translatedText: ' ',
        editorId: 'user-1',
        editorRole: Role.OPERATOR,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    repository.findById.mockResolvedValueOnce(null);
    await expect(
      new UpdateTranslationHistoryUseCase(repository as never).execute({
        id: 'missing',
        translatedText: 'Edit',
        editorId: 'user-1',
        editorRole: Role.OPERATOR,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);

    repository.findById.mockResolvedValueOnce(translationRecord);
    await expect(
      new UpdateTranslationHistoryUseCase(repository as never).execute({
        id: 'history-1',
        translatedText: 'Edit',
        editorId: 'other-user',
        editorRole: Role.OPERATOR,
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
