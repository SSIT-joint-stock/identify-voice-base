# Luồng dữ liệu

Tài liệu mô tả các luồng nghiệp vụ chính và nơi dữ liệu được lưu.

## 1. Ký hiệu

| Ký hiệu | Ý nghĩa                 |
| ------- | ----------------------- |
| Client  | Giao diện React         |
| API     | NestJS backend          |
| Worker  | Tiến trình xử lý job    |
| DB      | PostgreSQL              |
| Redis   | Queue và trạng thái job |
| Storage | File audio/PDF          |
| AI      | AI Core service         |

## 2. Đăng nhập và refresh token

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as PostgreSQL

    C->>A: POST /api/v1/auth/login
    A->>D: Tìm tài khoản
    D-->>A: Account + password hash
    A->>A: So khớp mật khẩu, kiểm tra status
    A->>D: Lưu refresh token hash
    A-->>C: Access token + refresh cookie

    C->>A: POST /api/v1/auth/refresh
    A->>D: Kiểm tra tài khoản và token hash
    A-->>C: Access token mới
```

Dữ liệu nhạy cảm:

- Password chỉ lưu dạng hash.
- Refresh token lưu dạng hash.
- Refresh token thật nằm trong cookie của client.

## 3. Upload audio

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant S as Storage
    participant D as PostgreSQL

    C->>A: POST /upload/audio + file + purpose
    A->>A: Kiểm tra JWT, permission, MIME
    A->>S: Lưu file
    S-->>A: storage key/path
    A->>D: Tạo audio_files
    D-->>A: audio_id
    A-->>C: Metadata audio
```

Nếu ghi DB thất bại sau khi lưu file, cần kiểm tra file mồ côi trong Storage.

## 4. Enroll giọng nói

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as PostgreSQL
    participant S as Storage
    participant AI as AI Identify

    C->>A: POST /voices/enroll
    A->>D: Lấy audio metadata
    D-->>A: File path và MIME
    A->>S: Đọc/chuẩn hóa audio
    A->>AI: Upload voice
    AI-->>A: voice_id
    A->>D: Tạo users + voice_records
    A-->>C: Hồ sơ đã đăng ký
```

Trường hợp cần xử lý:

- Audio không tồn tại.
- MIME không hợp lệ.
- AI Core không kết nối được.
- AI trả dữ liệu không hợp lệ.
- Trùng hồ sơ hoặc vi phạm unique constraint.

## 5. Identify single

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as PostgreSQL
    participant AI as AI Identify

    C->>A: POST /identify type=SINGLE
    A->>D: Lấy audio file
    A->>AI: Identify single
    AI-->>A: Top matches
    A->>D: Đối chiếu users/voice_records
    A->>D: Tạo identify_sessions
    A-->>C: Kết quả định danh
```

Kết quả AI được xem là đề xuất. Thông tin nghiệp vụ trong `users` là nguồn dữ liệu chính thức.

## 6. Identify multi

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant AI as AI Identify
    participant D as PostgreSQL
    participant S as Storage

    C->>A: POST /identify type=MULTI
    A->>AI: Tách và định danh nhiều speaker
    AI-->>A: Speakers + segments + matches
    A->>D: Đối chiếu hồ sơ
    A->>D: Lưu session và JSON results
    A-->>C: Danh sách speaker
    C->>A: GET audio theo speaker
    A->>S: Đọc/gộp segment theo yêu cầu
    A-->>C: Audio speaker
```

Audio speaker được tạo theo yêu cầu từ segment của session.

## 7. Cập nhật embedding

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as PostgreSQL
    participant R as Redis/BullMQ
    participant W as Worker
    participant AI as AI Identify

    C->>A: POST /voices/:id/update-from-audios
    A->>D: Kiểm tra hồ sơ và audio
    A->>D: Tạo update_voice_jobs=PENDING
    A->>R: Enqueue job
    A-->>C: job_id

    R->>W: Deliver job
    W->>D: status=PROCESSING
    W->>AI: Cập nhật voice bằng audio mới
    AI-->>W: Kết quả
    W->>D: Tạo voice_update_logs
    W->>D: status=DONE hoặc FAILED
```

Job có các trạng thái `PENDING`, `PROCESSING`, `DONE`, `FAILED`.

Nếu worker dừng, job có thể nằm ở trạng thái chờ. Nếu AI lỗi, `error_msg` phải được kiểm tra.

## 8. AI Voice conversion

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant Cache as ai_identities_cache
    participant D as users/voice_records

    C->>A: POST /ai-voices/:id/convert
    A->>Cache: Lấy AI identity
    Cache-->>A: Dữ liệu gợi ý
    A->>A: Kiểm tra đã convert
    A->>D: Tạo hồ sơ chính thức
    A-->>C: Hồ sơ đã chuyển đổi
```

`ai_identities_cache` không được phép tự ghi đè dữ liệu chính thức trong `users`.

## 9. OCR và Speech-to-Text job

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis
    participant AI as AI Service

    C->>A: POST tạo job
    A->>R: Lưu trạng thái job
    A-->>C: job_id
    A->>AI: Xử lý file
    AI-->>A: Kết quả
    A->>R: Lưu DONE/FAILED + result
    C->>A: GET job/:jobId
    A->>R: Đọc trạng thái
    A-->>C: Trạng thái/kết quả
```

Job tạm trong Redis cần TTL phù hợp để client còn đủ thời gian lấy kết quả.

## 10. Dịch và lịch sử dịch

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant AI as AI Translation
    participant D as PostgreSQL

    C->>A: Nội dung/file + ngôn ngữ đích
    A->>AI: Translate hoặc summarize
    AI-->>A: Kết quả
    A->>D: Tạo translation_records
    A-->>C: Bản dịch
    C->>A: PATCH /translate/history/:id
    A->>D: Lưu edited text/editor/time
```

Admin có thể xem toàn hệ thống. Người dùng thường chỉ được thao tác dữ liệu thuộc phạm vi quyền.

## 11. Phân loại dữ liệu

| Dữ liệu              | Nơi lưu     | Thời gian lưu           |
| -------------------- | ----------- | ----------------------- |
| Tài khoản            | PostgreSQL  | Theo vòng đời tài khoản |
| Metadata audio       | PostgreSQL  | Theo chính sách dữ liệu |
| File audio           | Storage     | Theo retention          |
| Phiên identify       | PostgreSQL  | Theo retention          |
| Job update voice     | PostgreSQL  | Phục vụ truy vết        |
| Job OCR/S2T/dịch tạm | Redis       | Theo TTL                |
| Lịch sử dịch         | PostgreSQL  | Theo retention          |
| Log                  | File/volume | Theo log rotation       |

Retention phải được chốt trong tài liệu vận hành trước production.

## 12. Tài liệu liên quan

- [Kiến trúc hệ thống](system-architecture.md)
- [ERD](erd.md)
- [API tổng quan](../technical/api-overview.md)
- [Troubleshooting](../operations/troubleshooting.md)
