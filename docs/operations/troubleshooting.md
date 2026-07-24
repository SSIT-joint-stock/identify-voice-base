# Troubleshooting và danh mục mã lỗi

Tài liệu tổng hợp mã lỗi, tình huống có thể xảy ra, cách kiểm tra và hướng xử lý.

## 1. Quy trình xử lý sự cố

Thực hiện theo thứ tự:

1. Ghi nhận thời điểm, người dùng, API và thao tác.
2. Lấy HTTP status, `error.code`, message và request ID nếu có.
3. Kiểm tra trạng thái container.
4. Kiểm tra log backend và worker.
5. Kiểm tra PostgreSQL, Redis, Storage và AI Core.
6. Xác định thao tác có an toàn để retry hay không.
7. Ghi lại nguyên nhân và cách khắc phục.

Không gửi token, cookie, mật khẩu hoặc dữ liệu giọng nói nhạy cảm vào ticket/log chia sẻ.

## 2. Cấu trúc lỗi API

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

## 3. Mã lỗi API nền tảng

| HTTP | Mã lỗi                | Tình huống                                            | Xử lý                                   |
| ---- | --------------------- | ----------------------------------------------------- | --------------------------------------- |
| 400  | `BAD_REQUEST`         | Body/query sai hoặc vi phạm nghiệp vụ                 | Sửa request theo Swagger/message        |
| 401  | `UNAUTHORIZED`        | Thiếu token, token sai/hết hạn, account khóa          | Login/refresh; kiểm tra account         |
| 403  | `FORBIDDEN`           | Không có role/permission hoặc không sở hữu dữ liệu    | Kiểm tra quyền và phạm vi dữ liệu       |
| 404  | `NOT_FOUND`           | Không tìm thấy account, voice, session, file hoặc job | Kiểm tra ID và trạng thái xóa           |
| 409  | `CONFLICT`            | Trạng thái job/hồ sơ xung đột                         | Chờ job hiện tại hoặc làm mới dữ liệu   |
| 413  | `PAYLOAD_TOO_LARGE`   | Request vượt giới hạn của proxy/API                   | Giảm file hoặc chỉnh limit có kiểm soát |
| 422  | `VALIDATION_ERROR`    | File/field không hợp lệ                               | Sửa định dạng hoặc field                |
| 429  | `RATE_LIMIT`          | Vượt số request cho phép                              | Chờ hết TTL, giảm tần suất              |
| 429  | `RATE_LIMIT_EXCEEDED` | Lỗi rate limit được tạo trực tiếp                     | Xử lý như trên                          |
| 500  | `INTERNAL_ERROR`      | Lỗi nội bộ hoặc upstream chưa được phân loại          | Dùng log để tìm nguyên nhân             |
| 500  | `UNKNOWN_ERROR`       | Exception không xác định                              | Thu thập log và dữ liệu tái hiện        |

Mã hiện tại còn khá tổng quát. Message và `details` cần được dùng cùng code để xác định tình huống.

## 4. Mã lỗi database

| Mã API                   | Prisma  | Nguyên nhân thường gặp                  | Xử lý                          |
| ------------------------ | ------- | --------------------------------------- | ------------------------------ |
| `UNIQUE_CONSTRAINT`      | `P2002` | Trùng email, username hoặc unique field | Kiểm tra dữ liệu tồn tại       |
| `RECORD_NOT_FOUND`       | `P2025` | Update/delete bản ghi không tồn tại     | Làm mới dữ liệu, kiểm tra ID   |
| `FOREIGN_KEY_CONSTRAINT` | `P2003` | FK không tồn tại hoặc bị hạn chế xóa    | Kiểm tra quan hệ               |
| `DATABASE_ERROR`         | Khác    | Lỗi Prisma đã biết nhưng chưa ánh xạ    | Xem `prismaCode` trong details |

Lỗi kết nối database thường xuất hiện dưới `INTERNAL_ERROR` và cần xem log gốc.

## 5. Lỗi xác thực và tài khoản

| Triệu chứng           | Nguyên nhân có thể                  | Kiểm tra                  | Xử lý                      |
| --------------------- | ----------------------------------- | ------------------------- | -------------------------- |
| Login trả 401         | Sai email/username hoặc mật khẩu    | Account tồn tại, password | Nhập lại hoặc reset        |
| Login báo khóa        | `status=INACTIVE`                   | Bản ghi account           | Admin kích hoạt nếu hợp lệ |
| Access token hết hạn  | TTL access token                    | Payload/token time        | Gọi refresh                |
| Refresh token missing | Cookie không được gửi               | DevTools cookie/network   | Kiểm tra credential/cookie |
| Refresh token invalid | Secret đổi, token hết hạn/hash lệch | Backend log, account      | Login lại                  |
| API trả 403           | Thiếu role/permission               | Permission matrix         | Cấp đúng quyền             |
| Trùng email/username  | Unique constraint                   | Account hiện có           | Dùng giá trị khác          |

### Cookie không hoạt động

Kiểm tra:

- `COOKIE_DOMAIN`.
- `COOKIE_SECURE`.
- HTTPS.
- `CORS_ORIGINS`.
- Client có gửi credential.
- SameSite và proxy domain.

Local thường dùng `COOKIE_DOMAIN=localhost` và `COOKIE_SECURE=false`.

Production HTTPS phải dùng `COOKIE_SECURE=true`.

## 6. Lỗi upload và Storage

| Triệu chứng                | Nguyên nhân                   | Kiểm tra                | Xử lý                             |
| -------------------------- | ----------------------------- | ----------------------- | --------------------------------- |
| Không có file              | Form-data sai field           | Swagger/request         | Gửi đúng field                    |
| MIME không hỗ trợ          | Ngoài `STORAGE_ALLOWED_MIMES` | MIME thực tế            | Chuyển file hoặc cập nhật policy  |
| Purpose không hợp lệ       | Không thuộc enum              | Body                    | Dùng ENROLL/IDENTIFY/UPDATE_VOICE |
| File rỗng/hỏng             | Size 0 hoặc không đọc được    | File gốc, ffprobe       | Tạo lại file                      |
| Không ghi được file        | Volume/quyền/dung lượng       | Disk, mount, permission | Sửa quyền hoặc tăng dung lượng    |
| Metadata có nhưng file mất | File bị xóa/mount sai         | `file_path`, Storage    | Khôi phục hoặc đánh dấu deleted   |
| Audio URL 404              | CDN URL/path sai              | `STORAGE_CDN_URL`       | Sửa URL và proxy                  |
| Storage unavailable        | Driver khởi tạo lỗi           | Backend log             | Kiểm tra config và volume         |

Retry upload chỉ an toàn sau khi kiểm tra hệ thống chưa tạo metadata/file trùng.

## 7. Lỗi FFmpeg và audio

| Triệu chứng            | Nguyên nhân                    | Xử lý                                   |
| ---------------------- | ------------------------------ | --------------------------------------- |
| `ffmpeg not found`     | Máy host chưa cài FFmpeg       | Cài FFmpeg hoặc dùng Docker             |
| `ffprobe` fail         | File hỏng/codec không hỗ trợ   | Chuyển định dạng                        |
| Normalize timeout      | File lớn/hỏng hoặc CPU chậm    | Kiểm tra file, tăng timeout có đo lường |
| Output không đúng WAV  | Codec/sample rate/channel sai  | Xem log normalize                       |
| Không gộp được segment | Segment rỗng hoặc file gốc mất | Kiểm tra session result và Storage      |

Timeout normalize được cấu hình bằng `AUDIO_NORMALIZE_TIMEOUT_MS`.

## 8. Lỗi AI Core

### Mã mạng thường gặp

| Mã             | Ý nghĩa                                       | Kiểm tra                      |
| -------------- | --------------------------------------------- | ----------------------------- |
| `ECONNREFUSED` | Host có thể tới nhưng service không lắng nghe | Process/container và port     |
| `ENOTFOUND`    | DNS không phân giải được                      | Hostname/DNS                  |
| `ETIMEDOUT`    | Kết nối quá thời gian                         | Network/firewall/load         |
| `ECONNABORTED` | Client hủy do timeout                         | Timeout và thời gian xử lý AI |
| `EPERM`        | Không đủ quyền thao tác file                  | Permission/owner              |

### Tình huống theo chức năng

| Chức năng      | Tình huống                     | Xử lý                                |
| -------------- | ------------------------------ | ------------------------------------ |
| Enroll         | AI không trả `voice_id`        | Kiểm tra response AI và contract     |
| Identify       | AI trả kết quả rỗng            | Kiểm tra audio, threshold và AI log  |
| Multi identify | Thiếu segment/speaker          | Kiểm tra response schema             |
| Update voice   | Không audio nào upload được    | Kiểm tra từng audio và AI            |
| OCR            | Không đọc được PDF             | Kiểm tra file, Poppler và AI OCR     |
| S2T            | File quá lớn cho nhánh denoise | Dùng file nhỏ hơn hoặc bỏ denoise    |
| Filter noise   | Upstream trả file/text sai     | Kiểm tra content-type và AI response |
| Translate      | Upstream 400                   | Kiểm tra ngôn ngữ/nội dung           |

Không retry tự động enroll, convert hoặc update nếu chưa xác định request cũ có tạo dữ liệu tại AI hay không.

## 9. Lỗi Redis và worker

| Triệu chứng              | Nguyên nhân                   | Kiểm tra                  | Xử lý                        |
| ------------------------ | ----------------------------- | ------------------------- | ---------------------------- |
| Redis connection refused | Sai host/port hoặc Redis dừng | Compose status/log        | Sửa URL, chạy Redis          |
| NOAUTH                   | Sai password                  | `REDIS_PASSWORD`, URL     | Đồng bộ password             |
| Job luôn PENDING         | Worker không chạy             | Worker process/log        | Khởi động worker             |
| Job PROCESSING lâu       | Worker treo hoặc AI timeout   | Worker/AI log             | Xác định job trước retry     |
| Job FAILED               | Audio/AI/database lỗi         | `error_msg` và worker log | Sửa nguyên nhân, tạo job mới |
| Không thấy job tạm       | TTL hết hoặc sai Redis        | Redis key/config          | Tạo lại job                  |

Development trên host thường dùng `localhost:6382`.

Trong Docker Compose, service dùng `redis:6379`.

## 10. Lỗi PostgreSQL và Prisma

| Triệu chứng            | Nguyên nhân                  | Kiểm tra            | Xử lý                             |
| ---------------------- | ---------------------------- | ------------------- | --------------------------------- |
| Connection refused     | DB dừng hoặc sai host/port   | Compose/log/URL     | Chạy DB, sửa URL                  |
| Authentication failed  | Sai user/password            | `.env`, DB role     | Đồng bộ credential                |
| Database không tồn tại | Sai `DB_NAME`                | PostgreSQL          | Tạo đúng DB                       |
| Migration pending      | Chưa deploy migration        | `migrate status`    | Chạy migrate                      |
| Schema lệch            | Dùng `db push`/migration sai | Schema và lịch sử   | Khôi phục quy trình migration     |
| Unique active voice    | User đã có voice active      | Query voice_records | Vô hiệu hóa bản cũ đúng nghiệp vụ |
| Disk full              | Volume PostgreSQL đầy        | Disk usage          | Mở rộng và dọn an toàn            |

Không dùng `migrate reset` trên production.

## 11. Lỗi frontend và proxy

| Triệu chứng        | Nguyên nhân               | Xử lý                                  |
| ------------------ | ------------------------- | -------------------------------------- |
| CORS blocked       | Origin chưa được phép     | Sửa `CORS_ORIGINS`                     |
| 502 từ Nginx       | Backend dừng/sai upstream | Kiểm tra backend và `BACKEND_UPSTREAM` |
| API gọi sai domain | Runtime config sai        | Sửa `CLIENT_API_BASE_URL`              |
| Audio không phát   | CDN URL/CORS/file sai     | Kiểm tra Network tab                   |
| Trang trắng        | Asset/build/runtime lỗi   | Console và Nginx log                   |
| Refresh mất phiên  | Cookie/CORS/HTTPS sai     | Kiểm tra mục xác thực                  |

Development proxy mặc định chuyển `/api` và `/cdn` tới `http://localhost:3000`.

## 12. Lỗi deploy

| Triệu chứng               | Kiểm tra                                 |
| ------------------------- | ---------------------------------------- |
| Image pull fail           | Registry login, image name, tag          |
| Container exit            | `docker compose logs <service>`          |
| Backend restart loop      | Env validation, DB/Redis                 |
| Migration fail            | Database URL, migration status, quyền DB |
| Client không thấy backend | Network Compose và upstream              |
| Volume mất dữ liệu        | Tên volume, compose project, mount       |

Không chạy `docker compose down -v` nếu cần giữ dữ liệu.

## 13. Lệnh chẩn đoán

Development:

```bash
docker compose --env-file .env.development ps
docker compose --env-file .env.development logs -f backend
docker compose --env-file .env.development logs -f worker
docker compose --env-file .env.development logs db
docker compose --env-file .env.development logs redis
```

Production:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  ps
```

Migration:

```bash
pnpm --filter api exec prisma migrate status
```

Kiểm tra port trên Linux:

```bash
ss -lntp
```

## 14. Vị trí log

Backend tạo:

- `logs/http-YYYY-MM-DD.log`.
- `logs/error-YYYY-MM-DD.log`.
- `logs/combined-YYYY-MM-DD.log`.

Production mount log vào volume `voice_logs`.

HTTP 4xx được log mức warning; 5xx được log mức error.

## 15. Thông tin cần có khi báo lỗi

- Môi trường và version/image tag.
- Thời điểm có timezone.
- API path và method.
- HTTP status.
- `error.code`, message, details.
- Request ID nếu có.
- Bước tái hiện.
- Log đã che dữ liệu nhạy cảm.
- Trạng thái container.
- Job ID, session ID hoặc audio ID liên quan.

## 16. Known issues của cơ chế lỗi

- Nhiều lỗi nghiệp vụ đang dùng chung mã tổng quát như `BAD_REQUEST`.
- Một số NestJS status ngoài danh sách ánh xạ có thể bị chuẩn hóa thành `INTERNAL_ERROR`.
- Message hiện có cả tiếng Việt và tiếng Anh.
- Chưa có registry mã lỗi nghiệp vụ ổn định theo module.

Khuyến nghị tiếp theo:

1. Định nghĩa mã lỗi theo domain.
2. Không dùng message làm khóa xử lý ở frontend.
3. Giữ nguyên status của lỗi 502/503.
4. Thêm request ID vào error response.
5. Viết test contract cho từng mã lỗi.

## 17. Tài liệu liên quan

- [API tổng quan](../technical/api-overview.md)
- [Luồng dữ liệu](../architecture/data-flow.md)
- [Triển khai](deployment.md)
- [Yêu cầu hệ thống](../technical/system-requirements.md)
