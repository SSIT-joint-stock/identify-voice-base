import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { TERMINAL_INSTALLER_PATHS } from './terminal-launcher.constants';

@Injectable()
export class TerminalLauncherService {
  constructor(
    @Inject(TERMINAL_INSTALLER_PATHS)
    private readonly installerPaths: string[],
  ) {}

  async readInstaller(): Promise<string> {
    for (const installerPath of this.installerPaths) {
      try {
        await access(installerPath, constants.R_OK);
        return await readFile(installerPath, 'utf8');
      } catch (error) {
        if (this.isMissingFileError(error)) {
          continue;
        }

        throw new InternalServerErrorException(
          'Terminal launcher installer is unavailable',
        );
      }
    }

    throw new InternalServerErrorException(
      'Terminal launcher installer is unavailable',
    );
  }

  private isMissingFileError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    );
  }
}
