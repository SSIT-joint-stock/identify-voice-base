# Hướng dẫn cài đặt môi trường

Tài liệu hướng dẫn chuẩn bị môi trường development cho Client, API, Worker, PostgreSQL và Redis.

## 1. Điều kiện trước khi cài

Kiểm tra các công cụ:

```bash
node --version
pnpm --version
docker --version
docker compose version
git --version
```

Yêu cầu chi tiết xem tại [Yêu cầu hệ thống](../technical/system-requirements.md).

## 2. Lấy mã nguồn

```bash
git clone <repository-url>
cd indentify-voice-base
```

Tên thư mục thực tế có thể khác. Mọi lệnh trong tài liệu được chạy tại thư mục gốc repository.

## 3. Cài dependency

```bash
pnpm install --frozen-lockfile
```

Trong development, có thể dùng `pnpm install` khi chủ động cập nhật lockfile.

Không commit `node_modules`.

## 4. Tạo file môi trường

```bash
cp .env.example .env.development
```

Backend tìm file môi trường theo `NODE_ENV`. Với development, file chuẩn là `.env.development`.

Không commit file môi trường chứa secret.

## 5. Cấu hình database

Giá trị development mặc định:

```env
DB_HOST=localhost
DB_PORT=5442
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=voice_db
DB_SCHEMA=public
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}
```

Nếu API chạy trong Docker Compose, host database là `db` và port nội bộ là `5432`.

## 6. Cấu hình Redis

Giá trị development mặc định:

```env
REDIS_HOST=localhost
REDIS_PORT=6382
REDIS_PASSWORD=password_1233
REDIS_DB_PORT=6382
REDIS_URL=redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}
```

Nếu API hoặc worker chạy trong Docker Compose, host Redis là `redis` và port nội bộ là `6379`.

## 7. Cấu hình JWT và cookie

Thay toàn bộ secret mẫu:

```env
JWT_ACCESS_SECRET=<random-secret>
JWT_REFRESH_SECRET=<different-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Cấu hình development:

```env
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_PATH=/
```

Không dùng secret development cho production.

## 8. Cấu hình Storage

Ví dụ:

```env
STORAGE_DRIVER=local
STORAGE_ROOT_DIR=./storage
STORAGE_PUBLIC_DIR=public
STORAGE_PRIVATE_DIR=private
STORAGE_TEMP_DIR=temp
STORAGE_CDN_URL=http://localhost:3000/cdn
```

`STORAGE_CDN_URL` phải là URL mà frontend truy cập được.

MIME audio hợp lệ được cấu hình bằng `STORAGE_ALLOWED_MIMES`.

## 9. Cấu hình AI Core

Điền endpoint phù hợp với môi trường:

```env
AI_CORE_IDENTIFY_URL=http://localhost:1122
AI_CORE_OCR_URL=http://localhost:8003
AI_CORE_SPEECH_TO_TEXT_URL=http://localhost:8996
AI_CORE_FILTER_NOISE_URL=http://localhost:1113/filter_noise/filter_noise_segment
AI_CORE_TRANSLATION_URL=http://localhost:8505
AUDIO_NORMALIZE_TIMEOUT_MS=15000
```

Repository còn hỗ trợ tên cũ `AI_CORE_OCR_URl` để tương thích. Cấu hình mới phải dùng `AI_CORE_OCR_URL`.

## 10. Cấu hình SMTP và OAuth

SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
EMAIL_FROM=<sender>
```

Google OAuth nếu được sử dụng:

```env
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

## 11. Cấu hình CORS

Ví dụ:

```env
CORS_ORIGINS=http://localhost:5173
```

Nhiều origin được phân tách bằng dấu phẩy.

Origin phải gồm protocol, host và port. Không thêm path `/api/v1`.

## 12. Khởi động hạ tầng

```bash
pnpm infra:up
```

Kiểm tra trạng thái:

```bash
docker compose --env-file .env.development ps
```

PostgreSQL và Redis phải ở trạng thái healthy.

## 13. Khởi tạo database

Sinh Prisma Client:

```bash
pnpm prisma:generate
```

Chạy migration development:

```bash
pnpm prisma:migrate
```

Kiểm tra migration:

```bash
pnpm --filter api exec prisma migrate status
```

## 14. Tạo tài khoản quản trị

Khai báo:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<strong-password>
```

Chạy seed:

```bash
pnpm db:seed:dev
```

Không giữ mật khẩu seed mặc định ở môi trường bàn giao hoặc production.

## 15. Chạy ứng dụng

Terminal 1:

```bash
pnpm dev:api
```

Terminal 2:

```bash
pnpm dev:client
```

Terminal 3, khi dùng job:

```bash
pnpm dev:worker
```

Có thể dùng `pnpm dev` để chạy API và frontend qua Turborepo.

## 16. Kiểm tra sau cài đặt

| Thành phần  | Cách kiểm tra                       |
| ----------- | ----------------------------------- |
| Frontend    | Mở `http://localhost:5173`          |
| Backend     | Gọi endpoint dưới `/api/v1`         |
| Swagger     | Mở `http://localhost:3000/api-docs` |
| Module docs | Mở `http://localhost:3000/docs`     |
| PostgreSQL  | `docker compose ... logs db`        |
| Redis       | `docker compose ... logs redis`     |

Smoke test tối thiểu:

1. Đăng nhập.
2. Refresh token.
3. Upload audio mẫu.
4. Enroll một hồ sơ test.
5. Identify audio test.
6. Kiểm tra phiên trong lịch sử.

## 17. Lỗi thường gặp

### API thoát ngay khi khởi động

Kiểm tra thông báo `Invalid environment variables`. Bổ sung biến còn thiếu trong `.env.development`.

### Database hoặc Redis không kết nối được

Kiểm tra host/port theo nơi chạy API: máy host và Docker dùng địa chỉ khác nhau.

### Frontend bị CORS

Thêm đúng origin frontend vào `CORS_ORIGINS`, sau đó khởi động lại backend.

### FFmpeg không tồn tại

Cài FFmpeg trên máy host hoặc chạy backend bằng Docker image của dự án.

Chi tiết xem [Troubleshooting](../operations/troubleshooting.md).

## 18. Tài liệu liên quan

- [Build và chạy dự án](build-and-run.md)
- [Yêu cầu hệ thống](../technical/system-requirements.md)
- [Triển khai production](../operations/deployment.md)
