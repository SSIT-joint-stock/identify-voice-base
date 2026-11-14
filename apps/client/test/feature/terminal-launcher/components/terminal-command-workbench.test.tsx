import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TerminalCommandWorkbench } from "@/feature/terminal-launcher/components/terminal-command-workbench";

const installerUrl = "https://voice.example/api/terminal/install.sh";

describe("TerminalCommandWorkbench", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("copies the selected installer action", async () => {
    render(
      <TerminalCommandWorkbench
        installerUrl={installerUrl}
        endpointState="ready"
        onRetry={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Install command" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining(`'${installerUrl}' 'install'`),
      );
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Uninstall" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Copy Uninstall command" }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenLastCalledWith(
        expect.stringContaining(`'${installerUrl}' 'uninstall'`),
      );
    });
  });

  it("offers manual copy when clipboard access fails", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));

    render(
      <TerminalCommandWorkbench
        installerUrl={installerUrl}
        endpointState="ready"
        onRetry={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Install command" }),
    );

    expect(
      await screen.findByText(/Command vẫn có thể được chọn và copy thủ công/),
    ).toBeTruthy();
  });

  it("exposes retry without hiding the command when the endpoint fails", () => {
    const onRetry = vi.fn();

    render(
      <TerminalCommandWorkbench
        installerUrl={installerUrl}
        endpointState="error"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Thử lại endpoint" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText(/Endpoint hiện không phản hồi/)).toBeTruthy();
    expect(screen.getByLabelText("Install command")).toBeTruthy();
  });
});
