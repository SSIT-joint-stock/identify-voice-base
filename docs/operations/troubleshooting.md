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
| 502  | `BAD_GATEWAY`         | Upstream trả phản hồi không hợp lệ                    | Kiểm tra upstream và contract           |
| 503  | `SERVICE_UNAVAILABLE` | Dịch vụ hoặc Storage tạm thời không sẵn sàng          | Kiểm tra trạng thái dịch vụ             |
| 504  | `GATEWAY_TIMEOUT`     | Upstream xử lý quá thời gian                          | Kiểm tra tải, network và timeout        |

Mã hiện tại còn khá tổng quát. Message và `details` cần được dùng cùng code để xác định tình huống.

### Lưu ý về ánh xạ HTTP hiện tại

- Các `HttpException` có status chưa được ánh xạ riêng có thể giữ HTTP status nhưng mang
  `error.code=INTERNAL_ERROR`.
- Các status `413`, `502`, `503` và `504` đã có mã lỗi riêng và được kiểm tra bằng
  contract test.
- Exception không xác định chỉ trả thông báo tổng quát; stack trace được giữ trong log
  server và không trả cho client.
- Không dùng riêng `error.message` làm điều kiện xử lý ở frontend vì message chưa phải
  contract ổn định.

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

## 9. Lỗi quản lý giọng nói

### Đăng ký và chuyển đổi giọng nói

| Tình huống                                 | Nguyên nhân có thể                                               | Kiểm tra                                   | Hướng xử lý                                                                |
| ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| Người dùng đã có giọng nói active          | Ràng buộc mỗi người dùng chỉ có một voice active                 | `voice_records` theo account và trạng thái | Dùng luồng cập nhật hoặc vô hiệu hóa bản cũ theo nghiệp vụ                 |
| Không tìm thấy session mẫu phù hợp         | Session sai purpose, chưa hoàn thành hoặc không thuộc người dùng | Session ID, owner, purpose và status       | Chọn/tạo lại session đúng                                                  |
| AI enroll thành công nhưng lưu DB thất bại | Database lỗi sau khi AI đã tạo `voice_id`                        | AI log, response và transaction DB         | Không enroll lại ngay; xác minh và xóa/đồng bộ bản ghi mồ côi              |
| DB có voice nhưng AI không còn voice       | Dữ liệu AI bị xóa hoặc môi trường AI thay đổi                    | `external_voice_id` và API AI              | Khôi phục/enroll lại có kiểm soát rồi cập nhật DB                          |
| Convert không trả audio                    | AI lỗi, voice không tồn tại hoặc response sai contract           | AI status, content-type và response body   | Kiểm tra voice, input và AI log; chỉ retry khi request cũ không tạo output |
| Denoise thất bại                           | File/codec không hợp lệ, AI timeout hoặc response sai            | File nguồn, FFprobe và AI log              | Dùng file hợp lệ hoặc thử lại sau khi xác nhận không có output             |

### Cập nhật và xóa giọng nói

| Tình huống                                   | Nguyên nhân có thể                            | Kiểm tra                        | Hướng xử lý                                                               |
| -------------------------------------------- | --------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| Đã có update job đang chạy                   | Job cũ ở `PENDING`/`PROCESSING`               | Job gần nhất của voice          | Chờ job cũ hoặc xác nhận job đã treo trước khi tạo mới                    |
| Job quá 15 phút                              | Worker/process bị dừng hoặc AI treo           | `updated_at`, worker và AI log  | Đánh giá kết quả ở AI trước khi retry; job cũ có thể được đánh dấu failed |
| Audio không thuộc session phù hợp            | Sai owner, purpose hoặc quan hệ session/audio | Audio ID và session             | Chọn lại audio đúng quyền và đúng luồng                                   |
| Chỉ một phần audio upload thành công         | Một số file mất/hỏng hoặc AI từ chối          | Kết quả từng audio và log retry | Không coi toàn bộ job thành công; xử lý từng audio lỗi                    |
| Retry ba lần vẫn thất bại                    | Lỗi ổn định ở file, AI hoặc network           | Lần thử và lỗi cuối             | Sửa nguyên nhân rồi tạo job mới; không lặp retry vô hạn                   |
| Xóa AI thành công nhưng cập nhật DB thất bại | Lỗi DB sau lời gọi AI                         | AI log và trạng thái DB         | Đánh dấu sự cố cần đối soát; cập nhật DB theo trạng thái AI thực tế       |
| DB đánh dấu xóa nhưng AI xóa thất bại        | Thứ tự thao tác hoặc lỗi upstream             | DB record và AI voice           | Khôi phục trạng thái DB hoặc hoàn tất xóa AI theo quy trình bù            |

Các thao tác với AI và database không nằm trong cùng một transaction. Khi xảy ra lỗi
một phần, luôn đối soát cả hai hệ thống trước khi retry.

## 10. Lỗi nhận diện giọng nói và session

| Tình huống                             | Nguyên nhân có thể                                      | Kiểm tra                           | Hướng xử lý                                              |
| -------------------------------------- | ------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Single identify phát hiện nhiều người  | File có nhiều speaker hoặc AI phân đoạn khác dự kiến    | Kết quả speaker/segment            | Dùng audio một người hoặc chuyển sang multi identify     |
| Multi identify chỉ phát hiện một người | Audio thực tế chỉ có một speaker hoặc threshold cao     | Segment, confidence và cấu hình AI | Kiểm tra audio; dùng single identify nếu đúng nghiệp vụ  |
| Không nhận diện được ai                | Mẫu ngắn, nhiễu, voice chưa enroll hoặc confidence thấp | Audio, voice active và AI result   | Thu âm lại, denoise hoặc enroll lại mẫu tốt hơn          |
| Kết quả AI thiếu segment               | Response không đúng schema hoặc AI xử lý lỗi            | Raw AI response                    | Lưu bằng chứng, không tạo speaker audio từ dữ liệu thiếu |
| Speaker label không hợp lệ/trùng       | Dữ liệu phân đoạn không nhất quán                       | Label và danh sách speaker         | Chuẩn hóa kết quả hoặc chạy nhận diện lại                |
| Không tạo được audio theo speaker      | File nguồn/segment mất hoặc FFmpeg lỗi                  | File gốc, timestamp và FFmpeg log  | Khôi phục file hoặc chạy lại từ session hợp lệ           |
| Session không thuộc người dùng         | Sai ID hoặc truy cập chéo account                       | Owner/session ID                   | Trả đúng 403/404; dùng session của account hiện tại      |
| Session đã xóa/hết hiệu lực            | Metadata hoặc file không còn                            | Session status và Storage          | Tạo session mới                                          |

HTTP `422` có thể được dùng cho trường hợp số lượng speaker không phù hợp với chế độ
nhận diện. Cần đọc message/details để phân biệt cho đến khi có mã domain riêng.

## 11. Lỗi job OCR, S2T và Translate

Các job OCR, S2T và Translate tạm thời sử dụng Redis và được khởi chạy trong tiến
trình API; chúng không hoàn toàn giống job cập nhật giọng nói do worker xử lý.

| Tình huống                        | Nguyên nhân có thể                             | Kiểm tra                              | Hướng xử lý                                                    |
| --------------------------------- | ---------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| Không tìm thấy job                | Key Redis hết TTL, sai Redis hoặc ID sai       | Job ID, Redis URL và TTL              | Tạo lại job; không thể khôi phục chỉ từ job ID đã hết hạn      |
| Job luôn `PENDING`                | Tiến trình nền chưa được bắt đầu hoặc API lỗi  | API log ngay sau lúc tạo job          | Khởi động ổn định API rồi tạo lại                              |
| Job ở `PROCESSING` quá lâu        | AI timeout, process treo hoặc API restart      | API/AI log và thời điểm cập nhật      | Xác minh upstream trước khi retry                              |
| API restart khi job đang chạy     | Công việc chạy cùng process API bị gián đoạn   | Thời điểm restart và trạng thái Redis | Coi job cũ là không chắc chắn; kiểm tra output rồi mới tạo lại |
| Job biến mất sau khoảng 30 phút   | TTL dữ liệu job đã hết                         | TTL key Redis                         | Lưu/tải kết quả trước khi TTL hết hoặc chạy lại                |
| Job `FAILED` nhưng thiếu chi tiết | Exception đã bị chuẩn hóa                      | API log theo thời điểm/job ID         | Dùng log gốc để xác định file, AI hay Storage                  |
| OCR không đọc được PDF            | PDF hỏng/mã hóa, thiếu Poppler hoặc AI OCR lỗi | `pdfinfo`, Poppler và AI log          | Dùng PDF hợp lệ, cài dependency hoặc sửa AI endpoint           |
| S2T thất bại sau denoise          | File trung gian mất/quá lớn hoặc AI timeout    | File tạm, size và AI log              | Chạy không denoise hoặc dùng file nhỏ hơn                      |
| Translate thất bại                | Ngôn ngữ/nội dung sai hoặc upstream lỗi        | Source/target language và AI response | Sửa input; không retry hàng loạt khi upstream chưa ổn định     |

Không dùng trạng thái Redis của các job tạm làm dữ liệu lịch sử lâu dài.

## 12. Lỗi dịch thuật, lịch sử và xuất tài liệu

| Tình huống                         | Nguyên nhân có thể                                  | Kiểm tra                          | Hướng xử lý                                 |
| ---------------------------------- | --------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| Không thấy lịch sử                 | Sai account, bộ lọc, phân trang hoặc bản ghi đã xóa | Owner và query                    | Sửa bộ lọc hoặc dùng đúng account           |
| Không sửa/xóa được bản dịch        | Không sở hữu bản ghi hoặc trạng thái không cho phép | Owner và record status            | Dùng đúng quyền; không sửa trực tiếp DB     |
| Nội dung dịch rỗng/sai ngôn ngữ    | Input rỗng, mã ngôn ngữ sai hoặc AI trả lỗi         | Request và raw AI response        | Sửa input/ngôn ngữ rồi chạy lại             |
| Xuất DOCX thất bại                 | Nội dung không hợp lệ hoặc lỗi tạo file             | Backend log và dữ liệu bản dịch   | Làm sạch nội dung, kiểm tra thư viện export |
| Xuất PDF lỗi font/ký tự tiếng Việt | Font không được cài/nhúng                           | Font trên image/container         | Cài hoặc nhúng font Unicode phù hợp         |
| Link tải file 404                  | File tạm hết hạn, Storage path/CDN sai              | Metadata, file path và URL        | Xuất lại hoặc sửa Storage/CDN               |
| File tải về hỏng                   | Stream bị ngắt hoặc content-type/header sai         | Size, checksum và response header | Tạo lại file và sửa response                |

## 13. Sự cố không đồng bộ giữa Database, Storage và AI

| Trạng thái                                  | Rủi ro                                    | Cách xử lý                                                          |
| ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| DB có metadata, Storage thiếu file          | API trả 404 hoặc FFmpeg/AI không đọc được | Khôi phục file; nếu không thể, đánh dấu/xóa metadata theo nghiệp vụ |
| Storage có file, DB không có metadata       | File mồ côi chiếm dung lượng              | Đối chiếu thời gian và log trước khi dọn                            |
| DB có `external_voice_id`, AI không có      | Enroll/convert/update tiếp tục thất bại   | Xác minh đúng môi trường AI rồi đồng bộ hoặc enroll lại             |
| AI có voice, DB không có                    | Voice mồ côi và retry có thể tạo trùng    | Dùng log/request cũ để xác định và xóa hoặc gắn lại có kiểm soát    |
| Job báo failed nhưng AI đã xử lý            | Retry có thể lặp thao tác                 | Kiểm tra AI trước khi tạo job/request mới                           |
| DB commit nhưng response về client thất bại | Người dùng có thể bấm lại                 | Tra cứu theo owner/thời điểm trước khi retry                        |

Quy trình xử lý:

1. Tạm dừng retry tự động hoặc thao tác lặp của người dùng.
2. Ghi lại account, session/job/audio/voice ID và thời điểm.
3. Đối chiếu log API/worker, DB, Storage và AI.
4. Chọn hệ thống làm nguồn sự thật theo từng loại dữ liệu.
5. Thực hiện thao tác bù có kiểm soát và ghi lại người thực hiện.
6. Chạy lại chức năng đọc trước khi cho phép tạo request mới.

Không xóa file mồ côi hoặc voice phía AI chỉ dựa vào một phía dữ liệu.

## 14. Lỗi Redis và worker

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

## 15. Lỗi PostgreSQL và Prisma

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

## 16. Lỗi frontend và proxy

| Triệu chứng        | Nguyên nhân               | Xử lý                                  |
| ------------------ | ------------------------- | -------------------------------------- |
| CORS blocked       | Origin chưa được phép     | Sửa `CORS_ORIGINS`                     |
| 502 từ Nginx       | Backend dừng/sai upstream | Kiểm tra backend và `BACKEND_UPSTREAM` |
| API gọi sai domain | Runtime config sai        | Sửa `CLIENT_API_BASE_URL`              |
| Audio không phát   | CDN URL/CORS/file sai     | Kiểm tra Network tab                   |
| Trang trắng        | Asset/build/runtime lỗi   | Console và Nginx log                   |
| Refresh mất phiên  | Cookie/CORS/HTTPS sai     | Kiểm tra mục xác thực                  |

Development proxy mặc định chuyển `/api` và `/cdn` tới `http://localhost:3000`.

## 17. Lỗi deploy

| Triệu chứng               | Kiểm tra                                 |
| ------------------------- | ---------------------------------------- |
| Image pull fail           | Registry login, image name, tag          |
| Container exit            | `docker compose logs <service>`          |
| Backend restart loop      | Env validation, DB/Redis                 |
| Migration fail            | Database URL, migration status, quyền DB |
| Client không thấy backend | Network Compose và upstream              |
| Volume mất dữ liệu        | Tên volume, compose project, mount       |

Không chạy `docker compose down -v` nếu cần giữ dữ liệu.

## 18. Lệnh chẩn đoán

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

## 19. Vị trí log

Backend tạo:

- `logs/http-YYYY-MM-DD.log`.
- `logs/error-YYYY-MM-DD.log`.
- `logs/combined-YYYY-MM-DD.log`.

Production mount log vào volume `voice_logs`.

HTTP 4xx được log mức warning; 5xx được log mức error.

## 20. Thông tin cần có khi báo lỗi

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

## 21. Các hạn chế đã biết của cơ chế lỗi

- Nhiều lỗi nghiệp vụ đang dùng chung mã tổng quát như `BAD_REQUEST`.
- Một số NestJS status ngoài danh sách ánh xạ có thể bị chuẩn hóa thành `INTERNAL_ERROR`.
- Message hiện có cả tiếng Việt và tiếng Anh.
- Chưa có registry mã lỗi nghiệp vụ ổn định theo module.
- Một số lỗi chưa phân biệt được lỗi có thể retry và lỗi không được retry.
- Job Redis tạm không phải lịch sử bền vững và có thể mất sau TTL hoặc khi API restart.

Khuyến nghị tiếp theo:

1. Định nghĩa mã lỗi theo domain.
2. Không dùng message làm khóa xử lý ở frontend.
3. Thêm request ID vào error response.
4. Mở rộng contract test khi bổ sung mã lỗi mới.
5. Bổ sung idempotency/compensation cho thao tác đồng thời qua AI, DB và Storage.
6. Chuyển job dài hạn sang queue/worker bền vững nếu cần bảo đảm tiếp tục sau restart.

## 22. Tài liệu liên quan

- [API tổng quan](../technical/api-overview.md)
- [Luồng dữ liệu](../architecture/data-flow.md)
- [Triển khai](deployment.md)
- [Yêu cầu hệ thống](../technical/system-requirements.md)
