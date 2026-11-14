#!/usr/bin/env bash

set -Eeuo pipefail

readonly APP_ID="identify-app"
readonly APP_VERSION="1.0.0"
readonly DESKTOP_FILE_NAME="identify-app.desktop"
readonly MIME_TYPE="x-scheme-handler/identify-app"
readonly SUPPORTED_OS_ID="ubuntu"
readonly SUPPORTED_OS_VERSION="24.04"
readonly LAUNCHER_MANAGED_MARKER="# Managed-By: identify-app"
readonly DESKTOP_MANAGED_MARKER="X-Identify-App-Managed=true"

readonly OS_RELEASE_FILE="${IDENTIFY_APP_OS_RELEASE_FILE:-/etc/os-release}"
readonly USER_BIN_DIR="${HOME}/.local/bin"
readonly USER_APPLICATIONS_DIR="${XDG_DATA_HOME:-${HOME}/.local/share}/applications"
readonly LAUNCHER_PATH="${USER_BIN_DIR}/identify-app-launcher"
readonly DESKTOP_ENTRY_PATH="${USER_APPLICATIONS_DIR}/${DESKTOP_FILE_NAME}"

log() {
  printf '[%s] %s\n' "${APP_ID}" "$*"
}

fail() {
  printf '[%s] ERROR: %s\n' "${APP_ID}" "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

ensure_launcher_is_owned_or_absent() {
  [[ ! -e "${LAUNCHER_PATH}" ]] && return 0

  grep -Fqx -- "${LAUNCHER_MANAGED_MARKER}" "${LAUNCHER_PATH}" || \
    fail "Refusing to modify launcher not managed by ${APP_ID}: ${LAUNCHER_PATH}"
}

ensure_desktop_entry_is_owned_or_absent() {
  [[ ! -e "${DESKTOP_ENTRY_PATH}" ]] && return 0

  grep -Fqx -- "${DESKTOP_MANAGED_MARKER}" "${DESKTOP_ENTRY_PATH}" || \
    fail "Refusing to modify desktop entry not managed by ${APP_ID}: ${DESKTOP_ENTRY_PATH}"
}

ensure_protocol_is_available_or_owned() {
  local current_handler
  current_handler="$(xdg-mime query default "${MIME_TYPE}" || true)"

  if [[ -n "${current_handler}" && "${current_handler}" != "${DESKTOP_FILE_NAME}" ]]; then
    fail "Refusing to replace protocol handler owned by another application: ${current_handler}"
  fi
}

read_os_release_value() {
  local requested_key="$1"
  local key value

  [[ -r "${OS_RELEASE_FILE}" ]] || fail "Cannot read OS release file: ${OS_RELEASE_FILE}"

  while IFS='=' read -r key value; do
    if [[ "${key}" == "${requested_key}" ]]; then
      value="${value%\"}"
      value="${value#\"}"
      printf '%s' "${value}"
      return 0
    fi
  done <"${OS_RELEASE_FILE}"

  return 1
}

check_supported_os() {
  local os_id os_version
  os_id="$(read_os_release_value ID)" || fail "OS release file does not define ID"
  os_version="$(read_os_release_value VERSION_ID)" || fail "OS release file does not define VERSION_ID"

  if [[ "${os_id}" != "${SUPPORTED_OS_ID}" || "${os_version}" != "${SUPPORTED_OS_VERSION}" ]]; then
    fail "Unsupported operating system: ${os_id} ${os_version}. Ubuntu ${SUPPORTED_OS_VERSION} LTS is required."
  fi
}

write_launcher() {
  cat >"${LAUNCHER_PATH}" <<'LAUNCHER'
#!/usr/bin/env bash
# Managed-By: identify-app
# Version: 1.0.0

set -euo pipefail

readonly EXPECTED_URI="identify-app://open"

if [[ "$#" -ne 1 || "$1" != "${EXPECTED_URI}" ]]; then
  printf '[identify-app] ERROR: Unsupported URI.\n' >&2
  exit 64
fi

if ! command -v gnome-terminal >/dev/null 2>&1; then
  printf '[identify-app] ERROR: gnome-terminal is not installed.\n' >&2
  exit 69
fi

exec gnome-terminal
LAUNCHER

  chmod 0755 -- "${LAUNCHER_PATH}"
}

write_desktop_entry() {
  local escaped_launcher_path="${LAUNCHER_PATH//\\/\\\\}"
  escaped_launcher_path="${escaped_launcher_path//\"/\\\"}"
  escaped_launcher_path="${escaped_launcher_path//\$/\\\$}"
  escaped_launcher_path="${escaped_launcher_path//\`/\\\`}"

  cat >"${DESKTOP_ENTRY_PATH}" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Identify App Terminal Launcher
Comment=Open GNOME Terminal from Identify App
Exec="${escaped_launcher_path}" %u
NoDisplay=true
Terminal=false
MimeType=${MIME_TYPE};
X-Identify-App-Managed=true
X-Identify-App-Version=${APP_VERSION}
DESKTOP

  chmod 0644 -- "${DESKTOP_ENTRY_PATH}"
}

prepare_install_directories() {
  mkdir -p -- "${USER_BIN_DIR}" "${USER_APPLICATIONS_DIR}"
  [[ -w "${USER_BIN_DIR}" ]] || fail "Directory is not writable: ${USER_BIN_DIR}"
  [[ -w "${USER_APPLICATIONS_DIR}" ]] || fail "Directory is not writable: ${USER_APPLICATIONS_DIR}"
}

install_launcher() {
  local action_label="${1:-Installed}"
  check_supported_os
  require_command xdg-mime
  require_command gnome-terminal
  ensure_launcher_is_owned_or_absent
  ensure_desktop_entry_is_owned_or_absent
  ensure_protocol_is_available_or_owned
  prepare_install_directories

  write_launcher
  write_desktop_entry
  xdg-mime default "${DESKTOP_FILE_NAME}" "${MIME_TYPE}"

  local registered_handler
  registered_handler="$(xdg-mime query default "${MIME_TYPE}")"
  [[ "${registered_handler}" == "${DESKTOP_FILE_NAME}" ]] || fail "Protocol registration verification failed"

  log "${action_label} launcher version ${APP_VERSION}."
}

remove_desktop_id_from_mimeapps() {
  local mimeapps_file="$1"
  local temporary_file

  [[ -f "${mimeapps_file}" ]] || return 0
  temporary_file="$(mktemp "${mimeapps_file}.identify-app.XXXXXX")"

  awk -F= -v mime="${MIME_TYPE}" -v desktop="${DESKTOP_FILE_NAME}" '
    $1 == mime {
      remaining = ""
      count = split($2, handlers, ";")
      for (i = 1; i <= count; i++) {
        if (handlers[i] != "" && handlers[i] != desktop) {
          remaining = remaining handlers[i] ";"
        }
      }
      if (remaining == "") {
        next
      }
      print $1 "=" remaining
      next
    }
    { print }
  ' "${mimeapps_file}" >"${temporary_file}"

  chmod --reference="${mimeapps_file}" -- "${temporary_file}"
  mv -- "${temporary_file}" "${mimeapps_file}"
}

remove_owned_protocol_association() {
  local current_handler
  local config_home="${XDG_CONFIG_HOME:-${HOME}/.config}"
  local data_home="${XDG_DATA_HOME:-${HOME}/.local/share}"
  local mimeapps_file
  local -A visited_files=()
  local mimeapps_files=(
    "${config_home}/mimeapps.list"
    "${data_home}/applications/mimeapps.list"
    "${HOME}/.config/mimeapps.list"
    "${HOME}/.local/share/applications/mimeapps.list"
  )

  current_handler="$(xdg-mime query default "${MIME_TYPE}" || true)"
  [[ "${current_handler}" == "${DESKTOP_FILE_NAME}" ]] || return 0

  require_command awk
  require_command mktemp

  for mimeapps_file in "${mimeapps_files[@]}"; do
    [[ -z "${visited_files[${mimeapps_file}]+set}" ]] || continue
    visited_files["${mimeapps_file}"]=1
    remove_desktop_id_from_mimeapps "${mimeapps_file}"
  done

  current_handler="$(xdg-mime query default "${MIME_TYPE}" || true)"
  [[ "${current_handler}" != "${DESKTOP_FILE_NAME}" ]] || \
    fail "Could not remove the owned protocol association"
}

uninstall_launcher() {
  local current_handler
  require_command xdg-mime

  current_handler="$(xdg-mime query default "${MIME_TYPE}" || true)"
  if [[ ! -e "${LAUNCHER_PATH}" && ! -e "${DESKTOP_ENTRY_PATH}" && "${current_handler}" != "${DESKTOP_FILE_NAME}" ]]; then
    log "Launcher is not installed; nothing to uninstall."
    return 0
  fi

  ensure_launcher_is_owned_or_absent
  ensure_desktop_entry_is_owned_or_absent
  remove_owned_protocol_association

  rm -f -- "${LAUNCHER_PATH}" "${DESKTOP_ENTRY_PATH}"
  log "Uninstalled launcher version ${APP_VERSION}."
}

main() {
  local action="${1:-install}"

  case "${action}" in
    install)
      install_launcher "Installed"
      ;;
    reinstall)
      install_launcher "Reinstalled"
      ;;
    uninstall)
      uninstall_launcher
      ;;
    *)
      fail "Unsupported action: ${action}"
      ;;
  esac
}

main "$@"
