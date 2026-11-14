import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Keep DOM state isolated between component tests.
afterEach(() => {
  cleanup();
});
