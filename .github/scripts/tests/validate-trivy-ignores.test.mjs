import assert from "node:assert/strict";
import test from "node:test";

import { validateTrivyIgnorePolicy } from "../validate-trivy-ignores.mjs";

const TODAY = "2026-11-14";

function policy(overrides = {}) {
  return JSON.stringify({
    vulnerabilities: [],
    misconfigurations: [],
    secrets: [],
    ...overrides,
  });
}

test("accepts an empty ignore policy", () => {
  assert.deepEqual(validateTrivyIgnorePolicy(policy(), { today: TODAY }), []);
});

test("accepts an exception that expires today", () => {
  const source = policy({
    vulnerabilities: [
      {
        id: "CVE-2026-1234",
        statement: "Temporary exception while the fix is rolled out.",
        expired_at: TODAY,
        purls: ["pkg:npm/example@1.0.0"],
      },
    ],
  });

  assert.deepEqual(validateTrivyIgnorePolicy(source, { today: TODAY }), []);
});

test("rejects missing exception metadata", () => {
  const source = policy({ vulnerabilities: [{ id: "CVE-2026-1234" }] });
  const errors = validateTrivyIgnorePolicy(source, { today: TODAY });

  assert.match(errors.join("\n"), /statement/);
  assert.match(errors.join("\n"), /expired_at/);
});

test("rejects an expired exception", () => {
  const source = policy({
    secrets: [
      {
        id: "generic-api-key",
        statement: "Temporary false-positive exception.",
        expired_at: "2026-11-13",
      },
    ],
  });

  assert.match(
    validateTrivyIgnorePolicy(source, { today: TODAY }).join("\n"),
    /expired/,
  );
});

test("rejects non-JSON YAML shapes", () => {
  const source = "vulnerabilities: [{ id: CVE-2026-1234 }]";

  assert.match(
    validateTrivyIgnorePolicy(source, { today: TODAY }).join("\n"),
    /JSON-compatible YAML/,
  );
});

test("rejects unsupported categories and fields", () => {
  const source = policy({
    unknown: [],
    misconfigurations: [
      {
        id: "DS-001",
        statement: "Temporary exception.",
        expired_at: "2026-11-15",
        typo: true,
      },
    ],
  });
  const errors = validateTrivyIgnorePolicy(source, { today: TODAY });

  assert.match(errors.join("\n"), /unsupported category unknown/);
  assert.match(errors.join("\n"), /unsupported field typo/);
});
