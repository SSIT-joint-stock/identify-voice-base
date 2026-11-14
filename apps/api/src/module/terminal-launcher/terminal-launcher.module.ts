import { Module } from '@nestjs/common';
import {
  getTerminalInstallerPaths,
  TERMINAL_INSTALLER_PATHS,
  TERMINAL_INSTALLER_PUBLIC_ROUTE,
} from './terminal-launcher.constants';
import { TerminalLauncherController } from './terminal-launcher.controller';
import { TerminalLauncherService } from './terminal-launcher.service';

@Module({
  controllers: [TerminalLauncherController],
  providers: [
    {
      provide: TERMINAL_INSTALLER_PATHS,
      useFactory: getTerminalInstallerPaths,
    },
    TerminalLauncherService,
  ],
})
export class TerminalLauncherModule {}

export { TERMINAL_INSTALLER_PUBLIC_ROUTE };
