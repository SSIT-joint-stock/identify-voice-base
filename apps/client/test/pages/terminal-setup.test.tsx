import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TerminalSetup from "@/pages/TerminalSetup";

describe("TerminalSetup", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );
  });

  it("shows an origin-aware install command when the endpoint is ready", async () => {
    render(<TerminalSetup />);

    expect(
      screen.getByRole("heading", { name: "Setup Ubuntu Terminal Launcher" }),
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Endpoint sẵn sàng")).toBeTruthy();
    });

    expect(
      screen.getByText(/http:\/\/localhost:5173\/api\/terminal\/install\.sh/),
    ).toBeTruthy();

    expect(
      screen.getByRole("link", { name: /Test Terminal/ }).getAttribute("href"),
    ).toBe("identify-app://open");
  });

  it("lets the user retry an unavailable installer endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<TerminalSetup />);

    expect(
      await screen.findByText(/Endpoint hiện không phản hồi/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại endpoint" }));

    await waitFor(() => {
      expect(screen.getByText("Endpoint sẵn sàng")).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
