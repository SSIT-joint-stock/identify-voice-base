# Backend API của hệ thống định danh giọng nói

Backend là ứng dụng NestJS chịu trách nhiệm xác thực, quản lý tài khoản, lưu trữ audio, đăng ký giọng nói, định danh, xử lý AI và quản lý lịch sử nghiệp vụ.

API đóng vai trò điều phối giữa frontend, PostgreSQL, Redis, hệ thống lưu trữ và các dịch vụ AI Core.

## 1. Kiến trúc

Backend được tổ chức theo module nghiệp vụ và mô hình Use Case.

Controller tiếp nhận HTTP request, kiểm tra dữ liệu đầu vào và gọi service hoặc use case. Tầng repository chịu trách nhiệm truy cập PostgreSQL thông qua Prisma.

Luồng request tổng quát:

```text
Client
  → Middleware
  → Throttler/JWT/Permission Guard
  → DTO Validation
  → Controller
  → Service/Use Case
  → Repository/AI/Storage/Queue
  → Response Interceptor
  → Client
```

Các lỗi được chuẩn hóa bởi `AllExceptionsFilter`. Request ID, thời gian xử lý và trạng thái response được ghi bởi `HttpLogInterceptor`.

Tài liệu chi tiết:

- [Kiến trúc hệ thống](../../docs/architecture/system-architecture.md)
- [Luồng dữ liệu](../../docs/architecture/data-flow.md)
- [ERD](../../docs/architecture/erd.md)

## 2. Cấu trúc thư mục

```text
apps/api
├── prisma
│   ├── migrations             # Lịch sử migration
│   ├── schema.prisma          # Mô hình dữ liệu PostgreSQL
│   └── seed.ts                # Dữ liệu khởi tạo
├── src
│   ├── common                 # Guard, filter, interceptor và logger dùng chung
│   ├── config                 # Đọc và kiểm tra biến môi trường
│   ├── database
│   │   ├── prisma             # Prisma service/module
│   │   └── redis              # Redis service/module
│   ├── module                 # Các module nghiệp vụ
│   ├── shared                 # Interface và thành phần tái sử dụng
│   ├── workers                # Tiến trình xử lý BullMQ
│   ├── app.module.ts          # Module gốc
│   └── main.ts                # Điểm khởi chạy HTTP API
├── Dockerfile                 # Build Docker nhiều giai đoạn
└── package.json               # Script và dependency của API
```

Xem mô tả đầy đủ tại [Cấu trúc dự án](../../docs/technical/project-structure.md).

## 3. Các module nghiệp vụ

| Module                | Trách nhiệm chính                                      |
| --------------------- | ------------------------------------------------------ |
| `auth`                | Đăng nhập, refresh token, logout và đổi mật khẩu       |
| `user-auth`           | Quản lý tài khoản cá nhân và tài khoản bởi Admin       |
| `upload`              | Kiểm tra và lưu file audio                             |
| `storage`             | Trừu tượng hóa thao tác lưu, đọc và xóa file           |
| `enroll`              | Đăng ký hồ sơ và mẫu giọng nói                         |
| `identify`            | Định danh một hoặc nhiều người nói                     |
| `sessions`            | Danh sách, chi tiết và audio theo speaker              |
| `voices`              | Quản lý hồ sơ, phiên bản và cập nhật embedding         |
| `ai-voices`           | Quản lý AI identity chưa chuyển thành hồ sơ chính thức |
| `ai-core`             | OCR, S2T, dịch, tóm tắt và xử lý audio                 |
| `translation-history` | Tra cứu và chỉnh sửa lịch sử dịch                      |
| `docs`                | Phục vụ tài liệu Markdown trong ứng dụng               |

## 4. Xử lý nền và tiến trình Worker

Worker hiện phục vụ queue `update-voice` để cập nhật embedding giọng nói từ các audio đã được chọn.

```text
API
  → tạo update_voice_jobs trong PostgreSQL
  → thêm update-voice-job vào Redis/BullMQ
  → Update Voice Worker nhận job
  → gọi AI Core
  → tạo phiên bản voice mới
  → cập nhật trạng thái job trong PostgreSQL
```

Khởi chạy worker:

```bash
pnpm dev:worker
```

Worker dùng `NestFactory.createApplicationContext(WorkerModule)` nên không mở HTTP server.

Các job OCR, Speech-to-Text và Translation không dùng worker này. Chúng chạy nền trong process API và lưu trạng thái tạm tại Redis với TTL 30 phút.

Nếu API restart khi các job trên đang chạy, tác vụ có thể không được tiếp tục. Xem thêm [Luồng dữ liệu](../../docs/architecture/data-flow.md).

## 5. Cơ sở dữ liệu

Dự án sử dụng PostgreSQL và Prisma 7. Kết nối PostgreSQL được quản lý bằng `PrismaPg` và pool của thư viện `pg`.

Các bảng nghiệp vụ chính:

- `auth_accounts`: tài khoản đăng nhập và quyền.
- `users`: thông tin hồ sơ nghiệp vụ.
- `audio_files`: metadata của file audio.
- `voice_records`: lịch sử phiên bản giọng nói.
- `identify_sessions`: phiên và kết quả định danh.
- `ai_identities_cache`: metadata identity từ AI Core.
- `update_voice_jobs`: trạng thái job cập nhật voice.
- `translation_records`: lịch sử dịch và tóm tắt.

Tên bảng và cột trong PostgreSQL dùng `snake_case`. Code TypeScript có thể dùng tên được ánh xạ qua Prisma.

Các lệnh Prisma thường dùng từ thư mục gốc:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:studio
```

Không chạy lệnh reset database trên môi trường dùng chung hoặc môi trường vận hành.

## 6. Cấu hình môi trường

`ConfigModule` đọc cấu hình theo thứ tự ưu tiên:

1. `.env.<NODE_ENV>.local`
2. `.env.<NODE_ENV>`
3. `.env.local`
4. `.env`
5. Các file môi trường ở thư mục gốc monorepo

Hàm `validateEnv` kiểm tra các biến bắt buộc khi ứng dụng khởi động. API sẽ dừng sớm và báo lỗi nếu cấu hình không hợp lệ.

Các nhóm cấu hình chính:

| Nhóm        | Nội dung                                         |
| ----------- | ------------------------------------------------ |
| `app`       | Tên ứng dụng, môi trường và port                 |
| `database`  | Kết nối PostgreSQL                               |
| `jwt`       | Secret và thời hạn access/refresh token          |
| `redis`     | Kết nối Redis                                    |
| `storage`   | Driver, thư mục lưu trữ và CDN URL               |
| `ai`        | URL của Identify, S2T, Filter Noise, Translation |
| `throttler` | Giới hạn số request theo thời gian               |
| `cookie`    | Domain, secure, HTTP-only và thời hạn cookie     |
| `client`    | Origin của frontend                              |

Dùng `.env.development` cho môi trường cục bộ và tạo `.env.production` từ file mẫu khi triển khai:

```bash
cp .env.production.example .env.production
```

Không commit secret hoặc dùng lại secret của môi trường phát triển trên môi trường vận hành.

## 7. Cài đặt và chạy cục bộ

Thực hiện từ thư mục gốc của repository:

```bash
pnpm install
pnpm infra:up
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev:api
```

Chạy worker ở terminal khác khi sử dụng chức năng Update Voice:

```bash
pnpm dev:worker
```

Địa chỉ mặc định:

| Thành phần      | Địa chỉ                               |
| --------------- | ------------------------------------- |
| Backend         | `http://localhost:3000`               |
| API prefix      | `http://localhost:3000/api/v1`        |
| Swagger UI      | `http://localhost:3000/api-docs`      |
| OpenAPI JSON    | `http://localhost:3000/api-docs-json` |
| Tài liệu module | `http://localhost:3000/docs`          |

Port thực tế có thể thay đổi theo biến môi trường.

Xem hướng dẫn chi tiết:

- [Cài đặt môi trường](../../docs/setup/environment-setup.md)
- [Build và chạy dự án](../../docs/setup/build-and-run.md)

## 8. Tài liệu API bằng Swagger

Backend tự động sinh tài liệu API từ decorator của controller và DTO.

- **Swagger UI**: `http://localhost:3000/api-docs`.
- **OpenAPI JSON**: `http://localhost:3000/api-docs-json`.
- **Tags**: API được phân nhóm theo chức năng.
- **DTO**: Mô tả request, response, ví dụ và validation.
- **Bearer Auth**: Cho phép nhập JWT access token để thử API được bảo vệ.

Quy tắc cập nhật Swagger:

1. Thuộc tính công khai phải dùng `@ApiProperty()` hoặc `@ApiPropertyOptional()`.
2. Controller phải có `@ApiTags()`.
3. Endpoint phải mô tả mục đích bằng `@ApiOperation()`.
4. Response và lỗi quan trọng phải dùng `@ApiResponse()` hoặc decorator tương ứng.
5. Không đưa password, token hoặc dữ liệu nhạy cảm vào ví dụ response.

Danh mục endpoint dạng Markdown nằm tại [Tổng quan API](../../docs/technical/api-overview.md).

## 9. Xác thực và phân quyền

Hệ thống sử dụng JWT access token trong Bearer header. Refresh token được gửi bằng HTTP-only cookie.

Các endpoint bảo vệ có thể đi qua:

- `JwtAuthGuard`: xác thực access token.
- Role guard: giới hạn theo vai trò.
- Permission guard: kiểm tra quyền nghiệp vụ.
- `ThrottlerGuard`: hạn chế request.
- `ValidationPipe`: loại field thừa và kiểm tra DTO.

Password được hash trước khi lưu.

Hiện phần triển khai lưu trực tiếp refresh token vào database dù comment/schema mô tả là hash. Cần xử lý sai lệch này trước khi đưa hệ thống lên môi trường vận hành.

## 10. Chuẩn dữ liệu trả về và xử lý lỗi

`ResponseInterceptor` chuẩn hóa response thành cấu trúc chung.

Ví dụ response thành công:

```json
{
  "success": true,
  "data": {},
  "message": "Thao tác thành công",
  "meta": {
    "timestamp": "2026-04-04T15:26:00Z"
  }
}
```

`AllExceptionsFilter` chuyển exception thành mã HTTP và payload lỗi thống nhất.

Không trả stack trace, câu lệnh SQL, secret hoặc thông tin nội bộ cho client trên môi trường vận hành.

Danh sách lỗi và cách xử lý nằm tại [Troubleshooting](../../docs/operations/troubleshooting.md).

## 11. Mô hình Use Case

Mỗi hành động nghiệp vụ chính được đóng gói trong một use case riêng.

Ví dụ một use case thường thực hiện:

1. Kiểm tra DTO và quyền truy cập.
2. Đọc dữ liệu cần thiết từ repository.
3. Áp dụng quy tắc nghiệp vụ.
4. Gọi AI Core, Storage hoặc Queue khi cần.
5. Ghi dữ liệu qua repository.
6. Trả về dữ liệu đã loại bỏ thông tin nhạy cảm.

Lợi ích:

- Dễ kiểm thử từng nghiệp vụ độc lập.
- Controller ngắn và tập trung vào HTTP.
- Tách quy tắc nghiệp vụ khỏi Prisma và framework.
- Giảm ảnh hưởng khi thay đổi một module.

## 12. Kiểm thử và kiểm tra chất lượng

Các lệnh thường dùng:

```bash
pnpm test:api
pnpm lint:api
pnpm build:api
```

Có thể chạy test riêng trong package API:

```bash
pnpm --filter api run test
pnpm --filter api run test:watch
pnpm --filter api run test:cov
```

Trước khi bàn giao, cần bảo đảm build thành công, migration hợp lệ và các test liên quan đều đạt.

## 13. Triển khai môi trường vận hành

Backend trên môi trường vận hành gồm hai tiến trình chạy lâu dài:

- `backend`: NestJS HTTP API.
- `worker`: BullMQ consumer cho job `update-voice`.

Cả hai phải sử dụng cùng PostgreSQL, Redis, Storage và cấu hình AI Core.

### 13.1. Biên dịch

```bash
pnpm install --frozen-lockfile
pnpm --filter api run prisma:generate
pnpm --filter api run build
```

Tạo Docker image từ thư mục gốc vì Dockerfile phụ thuộc các file trong workspace:

```bash
docker build -f apps/api/Dockerfile -t voice-identify-api:latest .
```

### 13.2. Cập nhật cấu trúc cơ sở dữ liệu

Chạy migration trước khi khởi động phiên bản ứng dụng mới:

```bash
pnpm --filter api exec prisma migrate deploy
```

Chỉ chạy seed khi môi trường thực sự cần dữ liệu khởi tạo.

### 13.3. Khởi động

Chạy trực tiếp:

```bash
pnpm --filter api run start:prod
pnpm --filter api run start:worker:prod
```

Chạy bằng Docker Compose:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend worker
```

Tên service Compose là `backend`, không phải `api`.

### 13.4. Danh sách kiểm tra sau triển khai

1. `backend` khởi động không có lỗi validation môi trường.
2. `worker` kết nối được Redis và nhận queue `update-voice`.
3. Prisma migration đã chạy thành công.
4. API và worker kết nối được PostgreSQL.
5. Worker gọi được AI Core.
6. Storage có quyền đọc và ghi đúng thư mục.
7. Job thực tế chuyển qua `PENDING → PROCESSING → DONE` hoặc `FAILED`.
8. Swagger chỉ được mở theo chính sách của môi trường.

Xem runbook đầy đủ tại [Triển khai](../../docs/operations/deployment.md).

## 14. Ghi log và giám sát

Ứng dụng sử dụng Winston để ghi log có cấu trúc.

Các nhóm log chính:

- HTTP request/response từ `HttpLogInterceptor`.
- Sự kiện vòng đời của API và worker.
- Lỗi ứng dụng và lỗi tích hợp.
- Trạng thái xử lý BullMQ.

Môi trường vận hành ghi log JSON để hệ thống thu thập log như ELK hoặc Grafana Loki có thể xử lý.

Giám sát là hạng mục tùy chọn của lần bàn giao hiện tại. Tối thiểu cần giữ log lỗi, request ID và trạng thái job để phục vụ xử lý sự cố.

Không ghi password, JWT, cookie, secret hoặc nội dung nhạy cảm vào log.

## 15. Tài liệu liên quan

- [README tổng quan](../../README.md)
- [Yêu cầu hệ thống](../../docs/technical/system-requirements.md)
- [Cấu trúc dự án](../../docs/technical/project-structure.md)
- [Tổng quan API](../../docs/technical/api-overview.md)
- [Kiến trúc hệ thống](../../docs/architecture/system-architecture.md)
- [Luồng dữ liệu](../../docs/architecture/data-flow.md)
- [ERD](../../docs/architecture/erd.md)
- [Troubleshooting](../../docs/operations/troubleshooting.md)
