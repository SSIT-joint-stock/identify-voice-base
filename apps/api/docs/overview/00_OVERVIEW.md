# 00 — Backend Architecture Overview

> **Last updated:** 2026-04-05
> **Related use cases:** UC00, UC01, UC02, UC03, UC04, UC05, UC06

---

## 1. Giới thiệu hệ thống

**Voice Identify Service** là nền tảng nhận dạng giọng nói sinh trắc học, cho phép đăng ký, quản lý và nhận dạng giọng nói của các cá nhân trong cơ sở dữ liệu.

Backend đóng vai trò **orchestration layer** trung tâm:

- Nhận file audio từ Client, validate, lưu vào Storage (Local / S3)
- Điều phối luồng xử lý giữa PostgreSQL (metadata), AI Service (embedding / Qdrant), và Redis (async jobs)
- Cung cấp REST API cho Client (web / mobile) và WebSocket cho real-time notification

---

## 2. Sơ đồ kiến trúc

```
╔══════════════════════════════════════════════════════════════════════╗
║                          CLIENT (Browser / App)                      ║
╚══════════════════════════════╤═══════════════════════════════════════╝
                               │  HTTP REST / WebSocket (Socket.IO)
                               ▼
╔══════════════════════════════════════════════════════════════════════╗
║                      NestJS Backend (:3000)                          ║
║                                                                      ║
║  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  ║
║  │  AuthModule │  │EnrollModule │  │VoicesModule │  │IdentModule│  ║
║  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ ║
║  │   SessionsModule │  │UpdateVoiceModule │  │  WebSocket Gateway  │ ║
║  └──────────────────┘  └──────────────────┘  └────────────────────┘ ║
╚═══════╤══════════════╤════════════╤═══════════╤════════════════════╝
        │              │            │           │
        ▼              ▼            ▼           ▼
  ┌──────────┐  ┌───────────┐  ┌───────┐  ┌─────────────────────┐
  │PostgreSQL│  │AI Service │  │ Redis │  │   Local Storage      │
  │  :5432   │  │  :1112    │  │ :6379 │  │ /uploads/voices/     │
  │(Prisma)  │  │ (Qdrant)  │  │ Queue │  │ /uploads/identify/   │
  └──────────┘  └───────────┘  └───────┘  │ /uploads/update-voice│
                                           └─────────────────────┘
```

**Mô tả luồng dữ liệu chính:**

| Luồng                       | Mô tả                                                 |
| --------------------------- | ----------------------------------------------------- |
| Client → Backend            | HTTP REST (JSON / multipart/form-data) hoặc WebSocket |
| Backend → PostgreSQL        | Qua Prisma ORM với PrismaPg adapter (connection pool) |
| Backend → AI Service        | HTTP (Axios) tới `http://localhost:1112`              |
| Backend → Redis             | Bull Queue để dispatch async jobs                     |
| Bull Worker → AI Service    | HTTP forward file audio                               |
| Backend → Client (realtime) | Socket.IO emit event khi job hoàn tất                 |

---

## 3. Danh sách NestJS Modules

| Module              | Path                       | Trách nhiệm                                               |
| ------------------- | -------------------------- | --------------------------------------------------------- |
| `AuthModule`        | `src/module/auth/`         | Đăng nhập JWT, refresh token, reset password, logout      |
| `EnrollModule`      | `src/module/enroll/`       | UC01 — Đăng ký giọng nói mới (upload + forward AI)        |
| `VoicesModule`      | `src/module/voices/`       | UC06 — CRUD hồ sơ giọng nói, danh sách, xóa đồng bộ 3 nơi |
| `IdentifyModule`    | `src/module/identify/`     | UC02/UC03 — Nhận dạng single/multi speaker                |
| `SessionsModule`    | `src/module/sessions/`     | UC05 — Lịch sử phiên nhận dạng, filter, chi tiết          |
| `UpdateVoiceModule` | `src/module/update-voice/` | UC04 — Khởi tạo job cập nhật giọng nói bất đồng bộ        |
| `DatabaseModule`    | `src/database/`            | PrismaService, RedisService                               |
| `ConfigModule`      | `src/config/`              | Nạp biến môi trường từ `.env`                             |
| `CommonModule`      | `src/common/`              | Guards, Filters, Interceptors, Decorators dùng chung      |

---

## 4. Bảng tổng hợp toàn bộ API Endpoints

| Method   | Path                           | Module      | Use Case | Auth | Mô tả                           |
| -------- | ------------------------------ | ----------- | -------- | ---- | ------------------------------- |
| `POST`   | `/api/auth/login`              | Auth        | UC00     | ❌   | Đăng nhập, nhận JWT             |
| `POST`   | `/api/auth/refresh`            | Auth        | UC00     | ❌   | Cấp lại access token            |
| `POST`   | `/api/auth/logout`             | Auth        | UC00     | ✅   | Vô hiệu hóa refresh token       |
| `POST`   | `/api/auth/reset-password`     | Auth        | UC00     | ✅   | Đổi mật khẩu                    |
| `POST`   | `/api/voices/enroll`           | Enroll      | UC01     | ✅   | Đăng ký giọng nói mới           |
| `GET`    | `/api/voices`                  | Voices      | UC06     | ✅   | Danh sách hồ sơ giọng nói       |
| `GET`    | `/api/voices/:id`              | Voices      | UC06     | ✅   | Chi tiết hồ sơ + lịch sử        |
| `PUT`    | `/api/voices/:id`              | Voices      | UC06     | ✅   | Cập nhật thông tin cá nhân      |
| `DELETE` | `/api/voices/:id`              | Voices      | UC06     | ✅   | Xóa hồ sơ (DB + Qdrant + file)  |
| `PATCH`  | `/api/voices/:id/update-voice` | UpdateVoice | UC04     | ✅   | Khởi tạo job cập nhật giọng nói |
| `POST`   | `/api/identify/single`         | Identify    | UC02     | ✅   | Nhận dạng 1 người               |
| `POST`   | `/api/identify/multi`          | Identify    | UC03     | ✅   | Nhận dạng hội thoại 2 người     |
| `GET`    | `/api/sessions`                | Sessions    | UC05     | ✅   | Danh sách phiên nhận dạng       |
| `GET`    | `/api/sessions/:id`            | Sessions    | UC05     | ✅   | Chi tiết kết quả AI một phiên   |
| `GET`    | `/api/jobs/:id`                | UpdateVoice | UC04     | ✅   | Theo dõi tiến độ job            |

---

## 5. Quy tắc xử lý chung

### 5.1 Xác thực và phân quyền

- **Tất cả endpoint** (trừ `POST /api/auth/login` và `POST /api/auth/refresh`) **bắt buộc** `Authorization: Bearer <access_token>` trong header.
- Guard: `JwtAuthGuard` áp dụng globally qua `APP_GUARD`.
- Token hết hạn → `401 Unauthorized`, body: `{ statusCode: 401, message: "Unauthorized", error: "Unauthorized" }`.

### 5.2 Validate file audio

Áp dụng cho mọi endpoint nhận file audio (enroll, identify, update-voice):

```typescript
interface AudioValidationRule {
  maxSizeMb: 50; // ≤ 50MB — cấu hình qua STORAGE_MAX_SIZE (Multer memory)
  maxDurationSec: 600; // ≤ 10 phút — kiểm tra qua music-metadata.parseBuffer
  allowedMimeTypes: [
    'audio/wav',
    'audio/mpeg', // mp3
    'audio/flac',
    'audio/ogg',
  ];
}
```

Nếu vi phạm:

- Vượt size → `413 Payload Too Large`
- Sai format/mime → `400 Bad Request`
- Vượt duration → `422 Unprocessable Entity`

### 5.3 Chuẩn response format

**Thành công:**

```typescript
interface SuccessResponse<T> {
  statusCode: number; // ví dụ: 200, 201, 202
  message: string;
  data: T;
}
```

**Lỗi:**

```typescript
interface ErrorResponse {
  statusCode: number; // ví dụ: 400, 401, 404, 500
  message: string;
  error: string; // tên lỗi HTTP (Bad Request, Not Found, ...)
}
```

### 5.4 Phân trang

Các endpoint danh sách hỗ trợ phân trang thống nhất:

```typescript
interface PaginationQuery {
  page?: number; // default: 1
  page_size?: number; // default: 10, cho phép: 10 | 25 | 50
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
```

---

## 6. Luồng xử lý bất đồng bộ — Update Voice (UC04)

```
1. Client gửi PATCH /api/voices/:id/update-voice
   (multipart: audio_files[], voice_id)
        │
        ▼
2. Backend validate + lưu file vào /uploads/update-voice/<job_id>/
        │
        ▼
3. INSERT update_voice_jobs (status=PENDING)
   → Push job vào Bull Queue: queue "update-voice"
        │
        ▼
4. HTTP 202 trả về ngay: { job_id, status: "PENDING" }
        │
        ▼  (trong background — Bull Worker)
5. Worker nhận job → cập nhật status=PROCESSING, progress=0
        │
        ▼
6. Merge audio files → POST :1112/update_voice/ kèm voice_id
        │
        ▼
7. AI Service upsert embedding vào Qdrant (cùng voice_id)
        │
        ▼
8. INSERT voice_records (version+1, is_active=true)
   UPDATE voice_records cũ (is_active=false)
   Xóa file tạm /uploads/update-voice/<job_id>/
        │
        ▼
9. Cập nhật job status=DONE, progress=100
        │
        ▼
10. Emit Socket.IO event "update_voice.completed"
    → Client nhận, cập nhật UI
```

**Fallback polling**: Client gọi `GET /api/jobs/:id` mỗi 3 giây nếu WebSocket mất kết nối (exponential backoff reconnect: 1s → 2s → 4s → 8s).

---

## 7. Tích hợp AI Service

| Thuộc tính | Giá trị                                  |
| ---------- | ---------------------------------------- |
| Base URL   | `http://localhost:1112`                  |
| Protocol   | HTTP/1.1 (Axios)                         |
| Timeout    | 30 giây (có thể tùy chỉnh theo endpoint) |
| Xác thực   | Không (internal network)                 |

**Endpoints AI Service sử dụng:**

| Method   | Path                 | Mục đích                       | Gọi bởi            |
| -------- | -------------------- | ------------------------------ | ------------------ |
| `POST`   | `/upload_voice/`     | Đăng ký embedding mới          | EnrollModule       |
| `POST`   | `/identify_voice/`   | Nhận dạng single               | IdentifyModule     |
| `POST`   | `/identify_2_voice/` | Nhận dạng multi (diarization)  | IdentifyModule     |
| `POST`   | `/update_voice/`     | Cập nhật embedding (overwrite) | UpdateVoice Worker |
| `DELETE` | `/delete_voice/`     | Xóa embedding khỏi Qdrant      | VoicesModule       |

> **Lưu ý:** Tất cả request tới AI Service dùng `multipart/form-data` kèm file audio stream và các param cần thiết. Backend **không expose** AI Service trực tiếp ra ngoài.

---

## 8. Cấu hình Storage

Hệ thống sử dụng **Storage Service (Facade)** để trừu tượng hóa việc lưu trữ.

- **Multer Configuration:** Sử dụng `memoryStorage()` để nhận file vào RAM, sau đó stream trực tiếp tới Storage Driver.
- **Tiền tố ENV:** Sử dụng `STORAGE_*` cho toàn bộ cấu hình (Driver, MaxSize, Mimes).

Xem thêm chi tiết tại:

- [02_UPLOAD.md](./02_UPLOAD.md) — Chi tiết về Module Upload.
- [08_STORAGE.md](./08_STORAGE.md) — Kiến trúc Storage Driver.
