# Terminal Launcher Installer

The backend distributes the versioned Native Ubuntu Terminal Launcher installer
through an unversioned, public artifact endpoint.

## Endpoint

```http
GET /api/terminal/install.sh
HEAD /api/terminal/install.sh
```

- Authentication: not required.
- Content type: `text/x-shellscript; charset=utf-8`.
- Content disposition: `inline; filename="install.sh"`.
- The endpoint intentionally does not use the `/api/v1` business API prefix.
- The response is the raw shell script and is not wrapped in the standard JSON
  response envelope.

`HEAD` can be used to verify that the artifact is available without downloading
the response body.

## Host usage

Build the URL from the Web Application origin. For example:

```bash
bash -o pipefail -c 'curl -fsSL "$1" | bash -s -- install' _ 'http://localhost:5173/api/terminal/install.sh'
```

The command must run on the Ubuntu host, not inside the Docker container. Review
the URL and trust the serving application before executing downloaded code.

Supported installer actions are `install`, `reinstall`, and `uninstall`.
