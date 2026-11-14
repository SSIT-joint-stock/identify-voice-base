#!/usr/bin/env bash

set -Eeuo pipefail

readonly IMAGE="${1:?Usage: docker.verify.sh <backend-image:tag>}"
readonly TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly API_DIR="$(cd -- "${TEST_DIR}/../.." && pwd)"
readonly SOURCE_INSTALLER="${API_DIR}/src/assets/terminal/install.sh"
readonly CONTAINER_INSTALLER="/app/apps/api/dist/assets/terminal/install.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"
[[ -r "${SOURCE_INSTALLER}" ]] || fail "source installer is not readable"
docker image inspect "${IMAGE}" >/dev/null 2>&1 || fail "image does not exist: ${IMAGE}"

docker run --rm --entrypoint sh "${IMAGE}" -ec \
  "test -r '${CONTAINER_INSTALLER}'
   grep -Fq '# Managed-By: identify-app' '${CONTAINER_INSTALLER}'
   grep -Fq 'readonly EXPECTED_URI=\"identify-app://open\"' '${CONTAINER_INSTALLER}'" || \
  fail "final image does not contain a valid terminal launcher artifact"

readonly SOURCE_CHECKSUM="$(sha256sum "${SOURCE_INSTALLER}" | awk '{print $1}')"
readonly IMAGE_CHECKSUM="$(
  docker run --rm --entrypoint sha256sum "${IMAGE}" "${CONTAINER_INSTALLER}" |
    awk '{print $1}'
)"

[[ "${SOURCE_CHECKSUM}" == "${IMAGE_CHECKSUM}" ]] || \
  fail "image artifact checksum differs from versioned source"

printf 'PASS: terminal launcher Docker artifact (%s)\n' "${IMAGE_CHECKSUM}"
