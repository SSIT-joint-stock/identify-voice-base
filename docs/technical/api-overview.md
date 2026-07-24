# Tổng quan API

Tài liệu này mô tả contract chung và danh mục endpoint. Chi tiết request/response được xem tại Swagger và `apps/api/docs`.

## 1. Thông tin chung

| Thuộc tính         | Giá trị                                     |
| ------------------ | ------------------------------------------- |
| Framework          | NestJS                                      |
| API prefix         | `/api/v1`                                   |
| Swagger UI         | `/api-docs`                                 |
| Module docs        | `/docs`                                     |
| Xác thực           | Bearer access token và refresh-token cookie |
| Content type chính | `application/json`, `multipart/form-data`   |

URL development mặc định:

```text
http://localhost:3000/api/v1
```

## 2. Nhóm endpoint

### 2.1. Xác thực

| Method | Path                   | Mục đích             |
| ------ | ---------------------- | -------------------- |
| POST   | `/auth/login`          | Đăng nhập            |
| POST   | `/auth/refresh`        | Làm mới access token |
| POST   | `/auth/logout`         | Đăng xuất            |
| POST   | `/auth/reset-password` | Đổi mật khẩu         |

### 2.2. Tài khoản

| Method | Path                          | Mục đích                      |
| ------ | ----------------------------- | ----------------------------- |
| GET    | `/user/me`                    | Lấy hồ sơ hiện tại            |
| PATCH  | `/user/account`               | Cập nhật tài khoản hiện tại   |
| DELETE | `/user/delete-account`        | Xóa tài khoản hiện tại        |
| POST   | `/users/accounts`             | Admin tạo tài khoản           |
| GET    | `/users/accounts`             | Admin lấy danh sách tài khoản |
| GET    | `/users/accounts/:id`         | Admin lấy chi tiết tài khoản  |
| PATCH  | `/users/accounts/:id/account` | Admin cập nhật tài khoản      |

### 2.3. Upload, enroll và identify

| Method | Path             | Mục đích                    |
| ------ | ---------------- | --------------------------- |
| POST   | `/upload/audio`  | Upload audio                |
| POST   | `/voices/enroll` | Đăng ký hồ sơ giọng nói     |
| POST   | `/identify`      | Định danh single hoặc multi |

Upload audio dùng purpose `ENROLL`, `IDENTIFY` hoặc `UPDATE_VOICE`.

Identify dùng type `SINGLE` hoặc `MULTI`.

### 2.4. Hồ sơ giọng nói

| Method | Path                               | Mục đích                           |
| ------ | ---------------------------------- | ---------------------------------- |
| GET    | `/voices`                          | Danh sách hồ sơ                    |
| GET    | `/voices/:id`                      | Chi tiết hồ sơ                     |
| PATCH  | `/voices/:id`                      | Cập nhật thông tin                 |
| PATCH  | `/voices/:id/delete-voice`         | Vô hiệu hóa/xóa voice khỏi AI Core |
| POST   | `/voices/:id/update-from-audios`   | Tạo job cập nhật embedding         |
| POST   | `/voices/:id/denoise-enroll-audio` | Lọc nhiễu audio enroll             |

### 2.5. Phiên định danh

| Method | Path                                  | Mục đích           |
| ------ | ------------------------------------- | ------------------ |
| GET    | `/sessions`                           | Danh sách phiên    |
| GET    | `/sessions/:id`                       | Chi tiết phiên     |
| GET    | `/sessions/:id/speakers/:label/audio` | Audio theo speaker |

### 2.6. AI Core

| Method | Path                                  | Mục đích                      |
| ------ | ------------------------------------- | ----------------------------- |
| POST   | `/ai-core/audio/normalize`            | Chuẩn hóa audio               |
| POST   | `/ai-core/filter-noise`               | Lọc nhiễu                     |
| DELETE | `/ai-core/voices/:voiceId`            | Xóa voice tại AI Core         |
| POST   | `/ai-core/ocr`                        | OCR đồng bộ                   |
| POST   | `/ai-core/ocr/jobs`                   | Tạo OCR job                   |
| GET    | `/ai-core/ocr/jobs/:jobId`            | Trạng thái OCR job            |
| POST   | `/ai-core/speech-to-text`             | Speech-to-Text đồng bộ        |
| POST   | `/ai-core/speech-to-text/jobs`        | Tạo Speech-to-Text job        |
| GET    | `/ai-core/speech-to-text/jobs/:jobId` | Trạng thái Speech-to-Text job |
| POST   | `/ai-core/translate`                  | Dịch đồng bộ                  |
| POST   | `/ai-core/translate/jobs`             | Tạo translate job             |
| GET    | `/ai-core/translate/jobs/:jobId`      | Trạng thái translate job      |
| POST   | `/ai-core/translate/export`           | Xuất kết quả dịch             |
| POST   | `/ai-core/detect-language`            | Nhận diện ngôn ngữ            |
| POST   | `/ai-core/translate-summarize`        | Dịch/tóm tắt đồng bộ          |
| POST   | `/ai-core/translate-summarize/jobs`   | Tạo job dịch/tóm tắt          |

### 2.7. AI Voices và lịch sử dịch

| Method | Path                     | Mục đích                    |
| ------ | ------------------------ | --------------------------- |
| GET    | `/ai-voices`             | Danh sách AI Voice gợi ý    |
| GET    | `/ai-voices/:id`         | Chi tiết AI Voice           |
| POST   | `/ai-voices/:id/convert` | Chuyển AI Voice thành hồ sơ |
| GET    | `/translate/history`     | Danh sách lịch sử dịch      |
| PATCH  | `/translate/history/:id` | Chỉnh sửa bản dịch          |

## 3. Response thành công

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-01-01T00:00:00.000Z",
    "version": "v1",
    "requestId": "optional-request-id"
  }
}
```

Response phân trang có thêm `pagination`.

## 4. Response lỗi

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-01-01T00:00:00.000Z",
    "version": "v1"
  }
}
```

| HTTP | Mã nền tảng                         |
| ---- | ----------------------------------- |
| 400  | `BAD_REQUEST`                       |
| 401  | `UNAUTHORIZED`                      |
| 403  | `FORBIDDEN`                         |
| 404  | `NOT_FOUND`                         |
| 409  | `CONFLICT`                          |
| 413  | `PAYLOAD_TOO_LARGE`                 |
| 422  | `VALIDATION_ERROR`                  |
| 429  | `RATE_LIMIT`, `RATE_LIMIT_EXCEEDED` |
| 500  | `INTERNAL_ERROR`, `UNKNOWN_ERROR`   |

Lỗi Prisma có thể trả `DATABASE_ERROR`, `UNIQUE_CONSTRAINT`, `RECORD_NOT_FOUND` hoặc `FOREIGN_KEY_CONSTRAINT`.

## 5. Xác thực

Các endpoint bảo vệ yêu cầu header:

```http
Authorization: Bearer <access-token>
```

Refresh token được gửi bằng cookie. Client trình duyệt phải bật credential và CORS phải cho phép origin tương ứng.

## 6. Validation và rate limit

API loại bỏ hoặc từ chối field không nằm trong DTO. Dữ liệu query/body được chuyển đổi kiểu khi có thể.

Rate limit được cấu hình bằng:

- `RATE_LIMIT_TTL`.
- `RATE_LIMIT_MAX`.

## 7. File upload

Upload dùng `multipart/form-data`. MIME phải thuộc `STORAGE_ALLOWED_MIMES`.

File được lưu vào Storage, còn metadata được lưu trong `audio_files`.

## 8. Tài liệu chi tiết

- Swagger: `http://localhost:3000/api-docs`.
- Module docs: `http://localhost:3000/docs`.
- Markdown source: `apps/api/docs`.
- Quyền API: `apps/api/docs/permissions/index.md`.
- Troubleshooting: [Troubleshooting](../operations/troubleshooting.md).

Khi bàn giao offline, nên xuất OpenAPI JSON/YAML hoặc Postman Collection từ phiên bản backend đã phát hành.
