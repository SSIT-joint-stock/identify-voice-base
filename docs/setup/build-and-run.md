# Build và chạy dự án

Tài liệu tổng hợp lệnh chạy, build, kiểm thử và quản lý database.

## 1. Quy ước

Chạy lệnh tại thư mục gốc repository.

Project dùng pnpm workspace và Turborepo. Không dùng đồng thời npm hoặc yarn để cập nhật dependency.

## 2. Development

### 2.1. Khởi động hạ tầng

```bash
pnpm infra:up
```

Lệnh này chạy PostgreSQL và Redis bằng Docker Compose.

### 2.2. Chạy API và frontend

```bash
pnpm dev
```

Worker không được bảo đảm chạy cùng lệnh trên. Khi cần xử lý job, chạy worker riêng.

### 2.3. Chạy từng thành phần

```bash
pnpm dev:api
pnpm dev:client
pnpm dev:worker
```

### 2.4. Chạy toàn bộ Docker development

```bash
pnpm infra:all:up
```

Lệnh này build/chạy `db`, `redis`, `backend` và `worker` từ `docker-compose.yml`.

Frontend development vẫn có thể chạy bằng `pnpm dev:client`.

## 3. Build

Build toàn bộ workspace:

```bash
pnpm build
```

Build riêng:

```bash
pnpm build:api
pnpm build:client
```

Turborepo chạy `prisma:generate` trước task build khi cần.

## 4. Chạy bản build

Backend:

```bash
pnpm --dir apps/api exec node dist/src/main.js
```

Worker:

```bash
pnpm --dir apps/api exec node dist/src/workers/worker.main.js
```

Các script `start:prod` và `start:worker:prod` trong `apps/api/package.json` hiện chưa khớp đường dẫn output `dist/src`. Không dùng các script này cho đến khi được sửa và kiểm thử.

Frontend package hiện cung cấp `preview`, không có script `start`. Để xem bản build frontend:

```bash
pnpm --filter voice-identify-fe run preview
```

Production nên chạy frontend bằng Docker/Nginx.

## 5. Kiểm tra chất lượng

```bash
pnpm lint
pnpm check-types
pnpm test:api
pnpm build
```

Backend end-to-end:

```bash
pnpm --filter api run test:e2e
```

Backend coverage:

```bash
pnpm --filter api run test:cov
```

## 6. Định dạng mã nguồn

```bash
pnpm format
```

Định dạng cả JSON và YAML:

```bash
pnpm format:all
```

Pre-commit chạy lint-staged và lint. Commit message được kiểm tra bằng Commitlint.

## 7. Prisma và database

### Sinh Prisma Client

```bash
pnpm prisma:generate
```

### Tạo migration development

```bash
pnpm prisma:migrate
```

### Mở Prisma Studio

```bash
pnpm prisma:studio
```

### Seed development

```bash
pnpm db:seed:dev
```

### Cảnh báo lệnh phá hủy dữ liệu

Các lệnh sau reset database:

```text
pnpm prisma:migrate:reset:dev
pnpm prisma:migrate:reset:force
```

Chỉ dùng sau khi xác nhận đúng database development/test và dữ liệu có thể xóa.

Không dùng `prisma db push` thay migration cho production.

## 8. Docker development

| Mục đích                 | Lệnh                   |
| ------------------------ | ---------------------- |
| Chạy DB và Redis         | `pnpm infra:up`        |
| Chạy DB, Redis và worker | `pnpm infra:worker:up` |
| Chạy toàn bộ compose     | `pnpm infra:all:up`    |
| Xem log                  | `pnpm infra:logs`      |
| Dừng compose             | `pnpm infra:down`      |

Xem log một service:

```bash
docker compose --env-file .env.development logs -f backend
docker compose --env-file .env.development logs -f worker
```

## 9. Docker production

| Mục đích       | Lệnh pnpm                 |
| -------------- | ------------------------- |
| Pull image     | `pnpm infra:prod:pull`    |
| Chạy migration | `pnpm infra:prod:migrate` |
| Khởi động      | `pnpm infra:prod:up`      |
| Xem log        | `pnpm infra:prod:logs`    |
| Dừng           | `pnpm infra:prod:down`    |

Hoặc dùng Makefile:

```bash
make pull
make migrate
make up
make ps
make logs
```

Chi tiết xem [Triển khai](../operations/deployment.md).

## 10. Build Docker image

Backend:

```bash
docker build -f apps/api/Dockerfile -t <backend-image>:<tag> .
```

Frontend:

```bash
docker build \
  -f apps/client/Dockerfile \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t <client-image>:<tag> .
```

Nên dùng tag version hoặc commit SHA. Không dùng riêng `latest` cho bản bàn giao.

## 11. Thứ tự chạy production

1. Pull đúng image tag.
2. Kiểm tra `.env.production`.
3. Khởi động PostgreSQL và Redis.
4. Chạy `prisma migrate deploy`.
5. Khởi động backend, worker và client.
6. Kiểm tra trạng thái và log.
7. Chạy smoke test.

## 12. Tài liệu liên quan

- [Cài đặt môi trường](environment-setup.md)
- [Triển khai](../operations/deployment.md)
- [Troubleshooting](../operations/troubleshooting.md)
