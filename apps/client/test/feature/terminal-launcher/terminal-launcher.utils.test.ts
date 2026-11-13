import { describe, expect, it } from "vitest";
import {
  buildInstallerCommand,
  getInstallerUrl,
} from "@/feature/terminal-launcher/terminal-launcher.utils";

describe("terminal launcher command generation", () => {
  it("builds an install command from the current web origin", () => {
    const installerUrl = getInstallerUrl("http://localhost:5173");

    expect(installerUrl).toBe("http://localhost:5173/api/terminal/install.sh");
    expect(buildInstallerCommand(installerUrl, "install")).toBe(
      `bash -o pipefail -c 'curl -fsSL "$1" | bash -s -- "$2"' _ 'http://localhost:5173/api/terminal/install.sh' 'install'`,
    );
  });

  it("rejects non-web origins", () => {
    expect(() => getInstallerUrl("file:///tmp/index.html")).toThrow(
      "Installer origin must use HTTP or HTTPS",
    );
  });

  it.each(["install", "reinstall", "uninstall"] as const)(
    "passes the %s action to the installer",
    (action) => {
      expect(
        buildInstallerCommand(
          "https://voice.example/api/terminal/install.sh",
          action,
        ),
      ).toContain(`'${action}'`);
    },
  );
});
