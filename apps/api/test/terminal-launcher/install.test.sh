#!/usr/bin/env bash

set -euo pipefail

TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd -- "${TEST_DIR}/../.." && pwd)"
INSTALLER="${API_DIR}/src/assets/terminal/install.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file_exists() {
  [[ -f "$1" ]] || fail "expected file to exist: $1"
}

assert_executable() {
  [[ -x "$1" ]] || fail "expected file to be executable: $1"
}

assert_equals() {
  [[ "$1" == "$2" ]] || fail "expected '$2', got '$1'"
}

create_test_environment() {
  TEST_ROOT="$(mktemp -d)"
  export TEST_ROOT
  export HOME="${TEST_ROOT}/home"
  export XDG_DATA_HOME="${HOME}/.local/share"
  export XDG_CONFIG_HOME="${HOME}/.config"
  export IDENTIFY_APP_OS_RELEASE_FILE="${TEST_ROOT}/os-release"
  export IDENTIFY_APP_TEST_TERMINAL_LOG="${TEST_ROOT}/terminal.log"

  mkdir -p "${HOME}" "${TEST_ROOT}/bin"

  printf '%s\n' 'ID=ubuntu' 'VERSION_ID="24.04"' >"${IDENTIFY_APP_OS_RELEASE_FILE}"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'set -euo pipefail' \
    'mimeapps="${XDG_CONFIG_HOME}/mimeapps.list"' \
    'case "${1:-}" in' \
    '  query)' \
    '    [[ -f "$mimeapps" ]] || exit 0' \
    '    awk -F= -v mime="$3" '\''$1 == mime { split($2, handlers, ";"); print handlers[1]; exit }'\'' "$mimeapps"' \
    '    ;;' \
    '  default)' \
    '    mkdir -p "$(dirname "$mimeapps")"' \
    '    printf "[Default Applications]\n%s=%s;\n" "$3" "$2" >"$mimeapps"' \
    '    ;;' \
    '  *) exit 2 ;;' \
    'esac' >"${TEST_ROOT}/bin/xdg-mime"

  printf '%s\n' \
    '#!/usr/bin/env bash' \
    'printf "%s\n" "$*" >>"$IDENTIFY_APP_TEST_TERMINAL_LOG"' \
    >"${TEST_ROOT}/bin/gnome-terminal"

  chmod +x "${TEST_ROOT}/bin/xdg-mime" "${TEST_ROOT}/bin/gnome-terminal"
  export PATH="${TEST_ROOT}/bin:/usr/bin:/bin"
}

cleanup_test_environment() {
  if [[ -n "${TEST_ROOT:-}" && -d "${TEST_ROOT}" ]]; then
    rm -rf -- "${TEST_ROOT}"
  fi
}

test_install_registers_launcher() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install

  local launcher="${HOME}/.local/bin/identify-app-launcher"
  local desktop_entry="${XDG_DATA_HOME}/applications/identify-app.desktop"

  assert_file_exists "${launcher}"
  assert_executable "${launcher}"
  assert_file_exists "${desktop_entry}"
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" "identify-app.desktop"
  assert_equals "$(stat -c '%a' "${launcher}")" '755'
  assert_equals "$(stat -c '%a' "${desktop_entry}")" '644'
  grep -Fqx '# Managed-By: identify-app' "${launcher}" || fail "launcher ownership marker is missing"
  grep -Fqx 'X-Identify-App-Managed=true' "${desktop_entry}" || fail "desktop ownership marker is missing"
  grep -Fqx 'MimeType=x-scheme-handler/identify-app;' "${desktop_entry}" || fail "desktop MIME type is missing"

  if command -v desktop-file-validate >/dev/null 2>&1; then
    desktop-file-validate "${desktop_entry}" || fail "desktop entry validation failed"
  fi
}

test_install_preserves_foreign_launcher() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local launcher="${HOME}/.local/bin/identify-app-launcher"
  mkdir -p "$(dirname "${launcher}")"
  printf '%s\n' '#!/usr/bin/env bash' 'printf "foreign launcher\n"' >"${launcher}"

  if bash "${INSTALLER}" install; then
    fail "install should reject a launcher not managed by identify-app"
  fi

  assert_equals "$(tail -n 1 "${launcher}")" 'printf "foreign launcher\n"'
  [[ ! -e "${XDG_DATA_HOME}/applications/identify-app.desktop" ]] || \
    fail "install must not create a desktop entry after an ownership conflict"
}

test_install_preserves_foreign_desktop_entry() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local desktop_entry="${XDG_DATA_HOME}/applications/identify-app.desktop"
  mkdir -p "$(dirname "${desktop_entry}")"
  printf '%s\n' '[Desktop Entry]' 'Name=Foreign application' >"${desktop_entry}"

  if bash "${INSTALLER}" install; then
    fail "install should reject a desktop entry not managed by identify-app"
  fi

  assert_equals "$(tail -n 1 "${desktop_entry}")" 'Name=Foreign application'
  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "install must not create a launcher after a desktop entry ownership conflict"
}

test_install_preserves_foreign_protocol_handler() {
  create_test_environment
  trap cleanup_test_environment RETURN

  xdg-mime default 'another-application.desktop' 'x-scheme-handler/identify-app'

  if bash "${INSTALLER}" install; then
    fail "install should reject a protocol owned by another application"
  fi

  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" 'another-application.desktop'
  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "install must not create files after a protocol ownership conflict"
}

test_reinstall_refreshes_managed_artifacts() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install
  printf '%s\n' '# stale managed content' >>"${HOME}/.local/bin/identify-app-launcher"

  bash "${INSTALLER}" reinstall

  if grep -Fq '# stale managed content' "${HOME}/.local/bin/identify-app-launcher"; then
    fail "reinstall should replace stale managed launcher content"
  fi
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" 'identify-app.desktop'
}

test_uninstall_removes_managed_artifacts_and_association() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install
  bash "${INSTALLER}" uninstall

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "uninstall should remove the managed launcher"
  [[ ! -e "${XDG_DATA_HOME}/applications/identify-app.desktop" ]] || \
    fail "uninstall should remove the managed desktop entry"
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" ''
}

test_uninstall_preserves_another_protocol_handler() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install
  xdg-mime default 'another-application.desktop' 'x-scheme-handler/identify-app'

  bash "${INSTALLER}" uninstall

  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" 'another-application.desktop'
  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "uninstall should remove its managed launcher"
  [[ ! -e "${XDG_DATA_HOME}/applications/identify-app.desktop" ]] || \
    fail "uninstall should remove its managed desktop entry"
}

test_launcher_accepts_only_the_open_uri() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install
  local launcher="${HOME}/.local/bin/identify-app-launcher"

  "${launcher}" 'identify-app://open'
  assert_file_exists "${IDENTIFY_APP_TEST_TERMINAL_LOG}"
  assert_equals "$(wc -l <"${IDENTIFY_APP_TEST_TERMINAL_LOG}" | tr -d ' ')" '1'

  local invalid_uri
  for invalid_uri in \
    'identify-app://open?command=whoami' \
    'identify-app://open#fragment' \
    'identify-app://other' \
    'identify-app://open;touch /tmp/identify-app-injection'; do
    if "${launcher}" "${invalid_uri}"; then
      fail "launcher should reject URI: ${invalid_uri}"
    fi
  done

  if "${launcher}" 'identify-app://open' 'extra-argument'; then
    fail "launcher should reject extra arguments"
  fi

  assert_equals "$(wc -l <"${IDENTIFY_APP_TEST_TERMINAL_LOG}" | tr -d ' ')" '1'
}

test_install_does_not_leave_partial_files_on_permission_error() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local applications_dir="${XDG_DATA_HOME}/applications"
  mkdir -p "${applications_dir}"
  chmod 0500 "${applications_dir}"

  if bash "${INSTALLER}" install; then
    fail "install should fail when the applications directory is not writable"
  fi

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "failed install must not leave a partial launcher"
  [[ ! -e "${applications_dir}/identify-app.desktop" ]] || \
    fail "failed install must not leave a partial desktop entry"
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" ''
}

test_install_rejects_unsupported_operating_system() {
  create_test_environment
  trap cleanup_test_environment RETURN

  printf '%s\n' 'ID=debian' 'VERSION_ID="12"' >"${IDENTIFY_APP_OS_RELEASE_FILE}"

  if bash "${INSTALLER}" install; then
    fail "install should reject an unsupported operating system"
  fi

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "unsupported OS must not receive a launcher"
  [[ ! -e "${XDG_DATA_HOME}/applications/identify-app.desktop" ]] || \
    fail "unsupported OS must not receive a desktop entry"
}

test_uninstall_is_safe_when_launcher_is_not_installed() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" uninstall

  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" ''
  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || fail "unexpected launcher file"
  [[ ! -e "${XDG_DATA_HOME}/applications/identify-app.desktop" ]] || fail "unexpected desktop entry"
}

test_uninstall_preserves_foreign_files() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local launcher="${HOME}/.local/bin/identify-app-launcher"
  mkdir -p "$(dirname "${launcher}")"
  printf '%s\n' '#!/usr/bin/env bash' 'printf "foreign launcher\n"' >"${launcher}"

  if bash "${INSTALLER}" uninstall; then
    fail "uninstall should reject a launcher not managed by identify-app"
  fi

  assert_file_exists "${launcher}"
  assert_equals "$(tail -n 1 "${launcher}")" 'printf "foreign launcher\n"'
}

test_install_requires_xdg_mime() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local bash_path
  bash_path="$(command -v bash)"
  rm -- "${TEST_ROOT}/bin/xdg-mime"

  if PATH="${TEST_ROOT}/bin" "${bash_path}" "${INSTALLER}" install; then
    fail "install should fail when xdg-mime is unavailable"
  fi

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "missing dependency must not leave a launcher"
}

test_launcher_reports_missing_gnome_terminal() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}" install
  local runtime_bin="${TEST_ROOT}/runtime-bin"
  mkdir -p "${runtime_bin}"
  ln -s "$(command -v bash)" "${runtime_bin}/bash"

  if PATH="${runtime_bin}" "${HOME}/.local/bin/identify-app-launcher" 'identify-app://open'; then
    fail "launcher should fail when gnome-terminal is unavailable"
  fi

  [[ ! -e "${IDENTIFY_APP_TEST_TERMINAL_LOG}" ]] || \
    fail "launcher must not invoke a missing terminal"
}

test_install_defaults_to_install_and_is_idempotent() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash "${INSTALLER}"
  local launcher="${HOME}/.local/bin/identify-app-launcher"
  local desktop_entry="${XDG_DATA_HOME}/applications/identify-app.desktop"
  local first_hashes
  first_hashes="$(sha256sum "${launcher}" "${desktop_entry}")"

  bash "${INSTALLER}" install

  assert_equals "$(sha256sum "${launcher}" "${desktop_entry}")" "${first_hashes}"
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" 'identify-app.desktop'
}

test_install_requires_gnome_terminal() {
  create_test_environment
  trap cleanup_test_environment RETURN

  local bash_path
  bash_path="$(command -v bash)"
  rm -- "${TEST_ROOT}/bin/gnome-terminal"

  if PATH="${TEST_ROOT}/bin" "${bash_path}" "${INSTALLER}" install; then
    fail "install should fail when gnome-terminal is unavailable"
  fi

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "missing terminal dependency must not leave a launcher"
}

test_unknown_action_is_rejected() {
  create_test_environment
  trap cleanup_test_environment RETURN

  if bash "${INSTALLER}" upgrade; then
    fail "installer should reject unknown actions"
  fi

  [[ ! -e "${HOME}/.local/bin/identify-app-launcher" ]] || \
    fail "unknown action must not create a launcher"
}

test_installer_runs_from_standard_input() {
  create_test_environment
  trap cleanup_test_environment RETURN

  bash -s -- install <"${INSTALLER}"

  assert_file_exists "${HOME}/.local/bin/identify-app-launcher"
  assert_file_exists "${XDG_DATA_HOME}/applications/identify-app.desktop"
  assert_equals "$(xdg-mime query default x-scheme-handler/identify-app)" 'identify-app.desktop'
}

test_install_registers_launcher
test_install_preserves_foreign_launcher
test_install_preserves_foreign_desktop_entry
test_install_preserves_foreign_protocol_handler
test_reinstall_refreshes_managed_artifacts
test_uninstall_removes_managed_artifacts_and_association
test_uninstall_preserves_another_protocol_handler
test_launcher_accepts_only_the_open_uri
test_install_does_not_leave_partial_files_on_permission_error
test_install_rejects_unsupported_operating_system
test_uninstall_is_safe_when_launcher_is_not_installed
test_uninstall_preserves_foreign_files
test_install_requires_xdg_mime
test_launcher_reports_missing_gnome_terminal
test_install_defaults_to_install_and_is_idempotent
test_install_requires_gnome_terminal
test_unknown_action_is_rejected
test_installer_runs_from_standard_input
printf 'PASS: terminal launcher installer\n'
