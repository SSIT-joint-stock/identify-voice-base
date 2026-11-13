# Native Ubuntu Terminal Launcher

This directory contains the versioned installer distributed by the application.
The HTTP endpoint is implemented separately.

## Supported host

- Ubuntu 24.04 LTS with GNOME Desktop.
- `bash`, `xdg-mime`, and `gnome-terminal` available on the host.
- User-level installation; root privileges are neither needed nor requested.

## Interface

```bash
bash install.sh install
bash install.sh reinstall
bash install.sh uninstall
```

Omitting the action defaults to `install`. The installer manages only:

- `~/.local/bin/identify-app-launcher`
- `${XDG_DATA_HOME:-~/.local/share}/applications/identify-app.desktop`
- the user-level `x-scheme-handler/identify-app` association when it points to
  `identify-app.desktop`

The generated launcher accepts exactly `identify-app://open` and never forwards
URI content to a shell or to GNOME Terminal.

## Tests

From the repository root:

```bash
pnpm --filter api run test:terminal-launcher
```

Tests use an isolated temporary home directory and mocked desktop commands. They
do not modify the developer's actual MIME associations.
