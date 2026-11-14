import { Public } from '@/common/decorators/public.decorator';
import { RawResponse } from '@/common/decorators';
import { Controller, Get, Header } from '@nestjs/common';
import {
  TERMINAL_INSTALLER_CONTENT_TYPE,
  TERMINAL_INSTALLER_ROUTE,
  TERMINAL_LAUNCHER_CONTROLLER_ROUTE,
} from './terminal-launcher.constants';
import { TerminalLauncherService } from './terminal-launcher.service';

@Controller(TERMINAL_LAUNCHER_CONTROLLER_ROUTE)
export class TerminalLauncherController {
  constructor(
    private readonly terminalLauncherService: TerminalLauncherService,
  ) {}

  @Public()
  @RawResponse()
  @Get(TERMINAL_INSTALLER_ROUTE)
  @Header('Content-Type', TERMINAL_INSTALLER_CONTENT_TYPE)
  @Header('Content-Disposition', 'inline; filename="install.sh"')
  getInstaller(): Promise<string> {
    return this.terminalLauncherService.readInstaller();
  }
}
