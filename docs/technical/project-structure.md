# Cấu trúc dự án

Tài liệu mô tả tổ chức monorepo và trách nhiệm của các thư mục chính.

## 1. Cấu trúc tổng quan

```text
.
├── apps
│   ├── api
│   └── client
├── docs
├── .github/workflows
├── .husky
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 2. Backend

```text
apps/api
├── docs
├── prisma
│   ├── migrations
│   ├── schema.prisma
│   └── seed.ts
├── src
│   ├── assets
│   ├── common
│   ├── config
│   ├── database
│   ├── module
│   ├── shared
│   ├── workers
│   ├── app.module.ts
│   └── main.ts
└── test
```

### `src/common`

Chứa thành phần dùng chung của HTTP layer:

- Decorator.
- Exception filter.
- Guard xác thực, vai trò và permission.
- Request/response interceptor.
- Logger.
- Kiểu dữ liệu và response chuẩn.

### `src/config`

Đọc, chuẩn hóa và kiểm tra biến môi trường.

Mọi biến mới phải được cập nhật đồng thời tại:

- File config tương ứng.
- `env.validation.ts`.
- `.env.example`.
- `.env.production.example` nếu dùng ở production.
- Tài liệu setup.

### `src/database`

Chứa adapter kết nối PostgreSQL qua Prisma và Redis.

### `src/module`

Các module nghiệp vụ:

| Module                | Trách nhiệm                            |
| --------------------- | -------------------------------------- |
| `auth`                | Login, refresh, logout, đổi mật khẩu   |
| `user-auth`           | Hồ sơ tài khoản và quản trị tài khoản  |
| `upload`              | Nhận, kiểm tra và lưu audio            |
| `storage`             | Trừu tượng hóa storage và local driver |
| `enroll`              | Đăng ký giọng nói                      |
| `identify`            | Định danh single/multi                 |
| `voices`              | Quản lý và cập nhật hồ sơ giọng nói    |
| `sessions`            | Lịch sử phiên định danh                |
| `ai-core`             | Tích hợp các AI service                |
| `ai-voices`           | Danh tính do AI gợi ý                  |
| `translation-history` | Lịch sử dịch                           |
| `docs`                | Phục vụ tài liệu Markdown qua HTTP     |

Module nghiệp vụ thường gồm controller, DTO, service/use-case, repository và test.

### `src/workers`

Chứa entry point worker và processor của job bất đồng bộ.

Worker dùng chung image với backend nhưng chạy command khác.

### `prisma`

| File/thư mục    | Trách nhiệm               |
| --------------- | ------------------------- |
| `schema.prisma` | Mô hình dữ liệu chuẩn     |
| `migrations`    | Lịch sử thay đổi database |
| `seed.ts`       | Tạo tài khoản khởi tạo    |

Không sửa migration đã được deploy. Phải tạo migration mới cho mọi thay đổi schema.

## 3. Frontend

```text
apps/client
├── docker
├── public
├── src
│   ├── api
│   ├── assets
│   ├── components
│   ├── configs
│   ├── feature
│   ├── hooks
│   ├── layouts
│   ├── pages
│   ├── store
│   ├── types
│   └── utils
├── Dockerfile
└── vite.config.ts
```

### `src/feature`

Tổ chức code theo chức năng. Mỗi feature có thể chứa API client, component, hook, schema, store, type và utility riêng.

### `src/api`

Chứa Axios instance và API dùng chung như xác thực.

### `public`

Chứa tài nguyên tĩnh và runtime config. Production có thể đổi API base URL mà không cần build lại frontend.

### `docker`

Chứa cấu hình Nginx và entrypoint tạo runtime config.

## 4. Tài liệu

```text
docs
├── architecture
├── operations
├── setup
└── technical
```

| Thư mục        | Nội dung                        |
| -------------- | ------------------------------- |
| `architecture` | Kiến trúc, data flow và ERD     |
| `setup`        | Cài đặt môi trường và lệnh chạy |
| `technical`    | Yêu cầu, cấu trúc và API        |
| `operations`   | Deploy và troubleshooting       |

Markdown là nguồn chuẩn của tài liệu bàn giao.

## 5. File hạ tầng

| File                       | Mục đích                          |
| -------------------------- | --------------------------------- |
| `docker-compose.yml`       | Development stack                 |
| `docker-compose.prod.yml`  | Production stack                  |
| `Makefile`                 | Lệnh build và vận hành production |
| `turbo.json`               | Pipeline task của monorepo        |
| `pnpm-workspace.yaml`      | Khai báo workspace                |
| `.github/workflows/ci.yml` | CI/CD                             |
| `.husky/*`                 | Git hooks                         |

## 6. Quy tắc đặt tài liệu

- Tài liệu tổng quan đặt tại `README.md`.
- Tài liệu chi tiết đặt đúng nhóm trong `docs`.
- Tài liệu riêng của API module tiếp tục đặt trong `apps/api/docs`.
- Dùng đường dẫn tương đối khi tạo liên kết.
- Không dùng link `file://` hoặc đường dẫn tuyệt đối của máy cá nhân.
- Khi thay đổi code, cập nhật tài liệu liên quan trong cùng pull request.

## 7. Tài liệu liên quan

- [Tổng quan dự án](../../README.md)
- [API tổng quan](api-overview.md)
- [Kiến trúc hệ thống](../architecture/system-architecture.md)
- [ERD](../architecture/erd.md)
