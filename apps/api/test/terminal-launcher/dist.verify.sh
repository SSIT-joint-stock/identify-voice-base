#!/usr/bin/env bash

set -Eeuo pipefail

readonly TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly API_DIR="$(cd -- "${TEST_DIR}/../.." && pwd)"
readonly SOURCE_INSTALLER="${API_DIR}/src/assets/terminal/install.sh"
readonly DIST_INSTALLER="${API_DIR}/dist/assets/terminal/install.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

[[ -r "${SOURCE_INSTALLER}" ]] || fail "source installer is not readable: ${SOURCE_INSTALLER}"
[[ -r "${DIST_INSTALLER}" ]] || fail "build artifact is not readable: ${DIST_INSTALLER}"

bash -n "${SOURCE_INSTALLER}" || fail "source installer has invalid Bash syntax"
cmp --silent "${SOURCE_INSTALLER}" "${DIST_INSTALLER}" || \
  fail "dist installer does not match the versioned source artifact"

grep -Fq 'readonly EXPECTED_URI="identify-app://open"' "${DIST_INSTALLER}" || \
  fail "dist installer does not contain the fixed protocol URI"
grep -Fq '# Managed-By: identify-app' "${DIST_INSTALLER}" || \
  fail "dist installer does not contain the launcher ownership marker"

printf 'PASS: terminal launcher dist artifact\n'
