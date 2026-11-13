import { resolve } from 'node:path';

export const TERMINAL_LAUNCHER_CONTROLLER_ROUTE = 'api/terminal';
export const TERMINAL_INSTALLER_ROUTE = 'install.sh';
export const TERMINAL_INSTALLER_PUBLIC_ROUTE = `${TERMINAL_LAUNCHER_CONTROLLER_ROUTE}/${TERMINAL_INSTALLER_ROUTE}`;
export const TERMINAL_INSTALLER_CONTENT_TYPE =
  'text/x-shellscript; charset=utf-8';

export const TERMINAL_INSTALLER_PATHS = Symbol('TERMINAL_INSTALLER_PATHS');

export function getTerminalInstallerPaths(): string[] {
  const sourcePath = resolve(process.cwd(), 'src/assets/terminal/install.sh');
  const buildPath = resolve(process.cwd(), 'dist/assets/terminal/install.sh');
  const sourceRelativePath = resolve(
    __dirname,
    '../../assets/terminal/install.sh',
  );
  const buildRelativePath = resolve(
    __dirname,
    '../../../assets/terminal/install.sh',
  );

  const orderedPaths =
    process.env.NODE_ENV === 'production'
      ? [buildPath, buildRelativePath]
      : [sourcePath, sourceRelativePath, buildPath, buildRelativePath];

  return [...new Set(orderedPaths)];
}
