import console from "node:console";
import { readFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_IGNORE_PATH = ".trivyignore.yaml";
const CATEGORIES = ["vulnerabilities", "misconfigurations", "secrets"];
const ALLOWED_ENTRY_FIELDS = new Set([
  "id",
  "statement",
  "expired_at",
  "paths",
  "purls",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateStringArray(value, field, location, errors) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => !isNonEmptyString(item))
  ) {
    errors.push(
      location + "." + field + " must be a non-empty array of strings.",
    );
  }
}

export function validateTrivyIgnorePolicy(source, options = {}) {
  const ignorePath = options.ignorePath ?? DEFAULT_IGNORE_PATH;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const errors = [];
  let document;

  try {
    document = JSON.parse(source);
  } catch {
    return [ignorePath + " must use JSON-compatible YAML syntax."];
  }

  if (!isPlainObject(document)) {
    return [
      ignorePath + " must contain an object with Trivy ignore categories.",
    ];
  }

  for (const key of Object.keys(document)) {
    if (!CATEGORIES.includes(key)) {
      errors.push(ignorePath + " contains unsupported category " + key + ".");
    }
  }

  for (const category of CATEGORIES) {
    const entries = document[category];
    if (!Array.isArray(entries)) {
      errors.push(ignorePath + "." + category + " must be an array.");
      continue;
    }

    entries.forEach((entry, index) => {
      const location = ignorePath + "." + category + "[" + index + "]";
      if (!isPlainObject(entry)) {
        errors.push(location + " must be an object.");
        return;
      }

      for (const key of Object.keys(entry)) {
        if (!ALLOWED_ENTRY_FIELDS.has(key)) {
          errors.push(location + " contains unsupported field " + key + ".");
        }
      }

      if (!isNonEmptyString(entry.id)) {
        errors.push(location + ".id must be a non-empty string.");
      }
      if (!isNonEmptyString(entry.statement)) {
        errors.push(location + ".statement must be a non-empty string.");
      }

      if (!isNonEmptyString(entry.expired_at)) {
        errors.push(location + ".expired_at must be a YYYY-MM-DD string.");
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expired_at)) {
        errors.push(location + ".expired_at must use YYYY-MM-DD.");
      } else {
        const expiry = new Date(entry.expired_at + "T00:00:00.000Z");
        const isCalendarDate =
          !Number.isNaN(expiry.getTime()) &&
          expiry.toISOString().slice(0, 10) === entry.expired_at;
        if (!isCalendarDate) {
          errors.push(location + ".expired_at is not a valid calendar date.");
        } else if (entry.expired_at < today) {
          errors.push(location + " expired on " + entry.expired_at + ".");
        }
      }

      if ("paths" in entry) {
        validateStringArray(entry.paths, "paths", location, errors);
      }
      if ("purls" in entry) {
        validateStringArray(entry.purls, "purls", location, errors);
      }
    });
  }

  return errors;
}

function runCli() {
  const ignorePath = process.argv[2] ?? DEFAULT_IGNORE_PATH;
  const errors = validateTrivyIgnorePolicy(readFileSync(ignorePath, "utf8"), {
    ignorePath,
  });

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(
      "Trivy ignore exceptions are structurally valid and time-bound.",
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}
