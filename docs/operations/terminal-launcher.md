# Terminal Launcher operations runbook

Runbook này dùng để build, xác minh, phát hành và rollback Native Ubuntu
Terminal Launcher.

## 1. Luồng phát hành

```text
source install.sh
  → Nest build artifact
  → backend Docker image
  → GET /api/terminal/install.sh qua client/Nginx
  → Ubuntu 24.04 host cài protocol
  → identify-app://open mở GNOME Terminal
```

Installer là public artifact endpoint và không dùng prefix /api/v1:

```http
GET /api/terminal/install.sh
HEAD /api/terminal/install.sh
```

## 2. CI acceptance gates

Pull request thay đổi backend chỉ đạt khi tất cả gate sau pass:

| Gate                          | Mục đích                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| test:terminal-launcher        | Kiểm tra install, reinstall, uninstall và guardrail trong môi trường tạm |
| Backend unit test             | Kiểm tra public endpoint, header và failure response                     |
| Backend build                 | Copy artifact từ src/assets sang dist/assets                             |
| verify:terminal-launcher:dist | So sánh byte-for-byte source và artifact sau build                       |
| Docker verification           | So sánh SHA-256 artifact trong final image với source                    |
| Frontend test/build           | Kiểm tra setup page, command, retry và sidebar entry point               |

Không push backend image nếu Docker verification không pass.

## 3. Kiểm tra trước khi build image

```bash
pnpm --filter api run test:terminal-launcher
pnpm --filter api run build
pnpm --filter api run verify:terminal-launcher:dist
pnpm test:client
```

Kết quả mong đợi:

```text
PASS: terminal launcher installer
PASS: terminal launcher dist artifact
```

Các dòng ERROR trong shell test là negative test có chủ đích. Gate chỉ thất bại
khi command trả exit code khác 0 hoặc thiếu dòng PASS cuối cùng.

## 4. Docker image verification

```bash
make build-backend
make verify-terminal-launcher-image
```

Gate xác nhận:

- File /app/apps/api/dist/assets/terminal/install.sh tồn tại và đọc được.
- File có ownership marker và URI cố định.
- SHA-256 trong image giống source đang version control.

Kiểm tra một image/tag cụ thể:

```bash
make verify-terminal-launcher-image \
  BACKEND_IMAGE=docker.io/example/identify-voice-backend \
  BACKEND_IMAGE_TAG=sha-abc1234
```

Kiểm tra nhanh container đang chạy:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  exec backend \
  test -r /app/apps/api/dist/assets/terminal/install.sh
```

## 5. Smoke test endpoint sau deploy

Luôn gọi qua origin public của frontend để đồng thời kiểm tra Nginx proxy:

```bash
APP_ORIGIN=http://localhost:8080
curl -fsSI "$APP_ORIGIN/api/terminal/install.sh"
```

Acceptance:

- HTTP 200.
- Content-Type là text/x-shellscript; charset=utf-8.
- Content-Disposition là inline; filename="install.sh".
- Response là raw shell script, không phải JSON envelope hoặc SPA HTML.

Tải artifact để kiểm tra mà chưa thực thi:

```bash
curl -fsSL \
  "$APP_ORIGIN/api/terminal/install.sh" \
  -o /tmp/identify-app-install.sh

bash -n /tmp/identify-app-install.sh
grep -F 'identify-app://open' /tmp/identify-app-install.sh
sha256sum /tmp/identify-app-install.sh
```

Không pipe artifact vào Bash trong bước kiểm tra hạ tầng thông thường.

## 6. Ubuntu 24.04 desktop acceptance

Phần này phải chạy trong desktop session của Ubuntu 24.04 host, không chạy
trong container hoặc SSH session không có GUI.

```bash
grep -E '^(ID|VERSION_ID)=' /etc/os-release
command -v gnome-terminal
command -v xdg-mime
```

Kết quả OS phải là ID=ubuntu và VERSION_ID="24.04".

### 6.1. Install

```bash
APP_ORIGIN=http://localhost:8080
bash -o pipefail -c \
  'curl -fsSL "$1" | bash -s -- "$2"' \
  _ "$APP_ORIGIN/api/terminal/install.sh" install
```

Xác minh:

```bash
test -x "$HOME/.local/bin/identify-app-launcher"
test -r "$HOME/.local/share/applications/identify-app.desktop"
xdg-mime query default x-scheme-handler/identify-app
```

Handler mong đợi là identify-app.desktop. Sau đó nhấn Mở Terminal trên sidebar
hoặc chạy:

```bash
xdg-open 'identify-app://open'
```

### 6.2. Reinstall

```bash
bash -o pipefail -c \
  'curl -fsSL "$1" | bash -s -- "$2"' \
  _ "$APP_ORIGIN/api/terminal/install.sh" reinstall
```

Reinstall phải thành công, không tạo file trùng và handler vẫn là
identify-app.desktop.

### 6.3. Uninstall

```bash
bash -o pipefail -c \
  'curl -fsSL "$1" | bash -s -- "$2"' \
  _ "$APP_ORIGIN/api/terminal/install.sh" uninstall
```

Xác minh:

```bash
test ! -e "$HOME/.local/bin/identify-app-launcher"
test ! -e "$HOME/.local/share/applications/identify-app.desktop"
test "$(xdg-mime query default x-scheme-handler/identify-app || true)" != \
  "identify-app.desktop"
```

## 7. Failure triage

| Triệu chứng                        | Kiểm tra                                     | Xử lý                                                        |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| Endpoint trả 404                   | Gọi trực tiếp backend và qua frontend origin | Kiểm tra image/tag, Nginx /api/ proxy và route không version |
| Endpoint trả 500                   | Kiểm tra artifact trong backend container    | Build lại image; không copy file thủ công vào container      |
| Sai Content-Type                   | Header qua Nginx và trực tiếp backend        | Không để request rơi vào SPA fallback                        |
| curl lỗi                           | DNS, port, TLS và container client/backend   | Sửa hạ tầng trước khi chạy installer                         |
| VERSION_ID bị thiếu                | /etc/os-release của môi trường chạy command  | Chạy trên Ubuntu 24.04 host                                  |
| Thiếu gnome-terminal hoặc xdg-mime | command -v                                   | Chuẩn bị dependency trên Ubuntu host                         |
| Protocol thuộc app khác            | xdg-mime query default                       | Không ghi đè; điều tra owner hiện tại                        |
| Browser không mở Terminal          | Thử xdg-open và kiểm tra browser permission  | Reinstall hoặc sửa external-protocol policy                  |

## 8. Rollback

Rollback backend/client image theo
[deployment runbook](deployment.md#13-rollback). Rollback web application không
bắt buộc gỡ launcher vì URI contract vẫn cố định.

Nếu release phải được thu hồi hoàn toàn:

1. Giữ một bản installer đã xác minh hoặc để endpoint release cũ còn hoạt động.
2. Chạy action uninstall trên từng Ubuntu user đã cài.
3. Xác minh handler không còn trỏ tới identify-app.desktop.
4. Rollback backend và client về image tag trước.
5. Chạy lại endpoint smoke test.

Không xóa trực tiếp file người dùng nếu chưa xác minh ownership marker.

## 9. Quan sát và giới hạn

- Backend chỉ quan sát được lượt tải installer qua HTTP access log.
- Web không nhận callback xác nhận GNOME Terminal đã mở.
- Không ghi shell command, token hoặc dữ liệu nhạy cảm vào URI/log.
- Installation success và open success cần QA evidence hoặc telemetry riêng;
  không suy luận từ HTTP 200.
- Installer chỉ hỗ trợ Ubuntu 24.04 LTS với GNOME Terminal.

## 10. Tài liệu liên quan

- [Installer endpoint](../../apps/api/docs/terminal-launcher/index.md)
- [Deployment](deployment.md)
- [Troubleshooting](troubleshooting.md)
- [Build và chạy](../setup/build-and-run.md)
