export const TERMINAL_INSTALLER_PATH = "/api/terminal/install.sh";
export const TERMINAL_PROTOCOL_URI = "identify-app://open";
export const TERMINAL_OPEN_COOLDOWN_MS = 1_000;

export type InstallerAction = "install" | "reinstall" | "uninstall";

export function getInstallerUrl(origin: string): string {
  const parsedOrigin = new URL(origin);

  if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
    throw new Error("Installer origin must use HTTP or HTTPS");
  }

  return new URL(TERMINAL_INSTALLER_PATH, parsedOrigin.origin).toString();
}

function quoteShellArgument(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function buildInstallerCommand(
  installerUrl: string,
  action: InstallerAction,
): string {
  return [
    `bash -o pipefail -c 'curl -fsSL "$1" | bash -s -- "$2"' _`,
    quoteShellArgument(installerUrl),
    quoteShellArgument(action),
  ].join(" ");
}
