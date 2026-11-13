import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenTerminalEntryPoint } from "@/feature/terminal-launcher/components/open-terminal-entry-point";

describe("OpenTerminalEntryPoint", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens only the fixed terminal URI and exposes the setup fallback", () => {
    render(
      <MemoryRouter>
        <OpenTerminalEntryPoint />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Open Terminal" }).getAttribute("href"),
    ).toBe("identify-app://open");
    expect(
      screen
        .getByRole("link", {
          name: "Terminal không mở? Xem hướng dẫn",
        })
        .getAttribute("href"),
    ).toBe("/terminal/setup");
  });

  it("applies a one-second cooldown after a user click", () => {
    render(
      <MemoryRouter>
        <OpenTerminalEntryPoint />
      </MemoryRouter>,
    );

    const openTerminal = screen.getByRole("link", { name: "Open Terminal" });
    fireEvent.click(openTerminal);

    expect(openTerminal.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(openTerminal.getAttribute("aria-disabled")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(openTerminal.getAttribute("aria-disabled")).toBeNull();
  });
});
