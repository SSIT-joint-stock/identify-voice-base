# Yêu cầu hệ thống

Tài liệu này mô tả điều kiện cần để cài đặt, phát triển, kiểm thử và vận hành Hệ thống Định danh Giọng nói.

## 1. Phạm vi

Yêu cầu trong tài liệu áp dụng cho các thành phần thuộc repository:

- React Client.
- NestJS API.
- NestJS Worker.
- PostgreSQL.
- Redis/BullMQ.
- Local Storage.

Các AI Core service được triển khai độc lập. CPU, RAM và GPU của AI Core không nằm trong cấu hình máy ứng dụng dưới đây.

## 2. Phần mềm bắt buộc

### 2.1. Môi trường phát triển

| Thành phần        | Phiên bản                    | Mục đích                                    |
| ----------------- | ---------------------------- | ------------------------------------------- |
| Node.js           | 20 trở lên                   | Chạy API, worker, frontend và công cụ build |
| pnpm              | 9.15.4 hoặc tương thích      | Quản lý dependency của monorepo             |
| Docker Engine     | Bản còn được hỗ trợ          | Chạy PostgreSQL, Redis hoặc toàn bộ stack   |
| Docker Compose    | V2                           | Điều phối các container                     |
| Git               | Bản còn được hỗ trợ          | Quản lý mã nguồn                            |
| FFmpeg/ffprobe    | Bản tương thích hệ điều hành | Chuẩn hóa và kiểm tra audio                 |
| Poppler Utilities | Bản tương thích hệ điều hành | Xử lý PDF cho luồng OCR                     |

Docker image backend đã cài `ffmpeg` và `poppler-utils`. Nếu chạy API trực tiếp trên máy host, phải cài hai dependency này trên máy.

### 2.2. Runtime trong Docker

| Thành phần        | Image hiện tại       |
| ----------------- | -------------------- |
| Backend và worker | `node:20-alpine`     |
| Frontend runtime  | `nginx:1.27-alpine`  |
| PostgreSQL        | `postgres:15-alpine` |
| Redis             | `redis:alpine`       |

Khi bàn giao production, nên khóa Redis bằng version cụ thể thay vì dùng tag `alpine` để tránh thay đổi ngoài dự kiến.

### 2.3. Trình duyệt

Khuyến nghị dùng phiên bản ổn định mới của Chrome, Edge hoặc Firefox.

Trình duyệt phải hỗ trợ:

- ES Modules.
- MediaRecorder và Web Audio API nếu ghi âm trực tiếp.
- Cookie bảo mật.
- Fetch/XHR và tải file.

## 3. Hệ điều hành

Development hỗ trợ Linux, macOS hoặc Windows có WSL2.

Production khuyến nghị Linux 64-bit có Docker. Phải đồng bộ timezone với `TZ`, mặc định là `Asia/Ho_Chi_Minh`.

## 4. Cấu hình phần cứng

Các mức dưới đây là cấu hình khởi điểm cho Client, API, Worker, PostgreSQL và Redis. Đây chưa phải kết quả benchmark.

### 4.1. Máy phát triển

| Tài nguyên  | Tối thiểu | Khuyến nghị       |
| ----------- | --------- | ----------------- |
| CPU         | 4 core    | 8 core            |
| RAM         | 8 GB      | 16 GB trở lên     |
| Ổ đĩa trống | 20 GB     | 50 GB SSD trở lên |

Nếu chạy AI Core trên cùng máy, phải cộng thêm tài nguyên theo yêu cầu của từng model.

### 4.2. Môi trường bàn giao hoặc UAT

| Tài nguyên     | Mức khởi điểm đề xuất                         |
| -------------- | --------------------------------------------- |
| CPU            | 4 vCPU                                        |
| RAM            | 8 GB                                          |
| Ổ đĩa hệ thống | 30 GB SSD                                     |
| Ổ đĩa dữ liệu  | 100 GB SSD hoặc theo dung lượng audio dự kiến |

### 4.3. Production

| Tài nguyên     | Mức khởi điểm đề xuất                               |
| -------------- | --------------------------------------------------- |
| CPU            | 8 vCPU                                              |
| RAM            | 16 GB                                               |
| Ổ đĩa hệ thống | 50 GB SSD                                           |
| Ổ đĩa dữ liệu  | Tính theo audio, database, log và thời gian lưu giữ |

Phải thực hiện load test với kích thước audio và số người dùng thực tế trước khi chốt cấu hình production.

## 5. Dung lượng lưu trữ

Production hiện dùng các Docker volume:

| Volume               | Dữ liệu               |
| -------------------- | --------------------- |
| `postgres_prod_data` | Database PostgreSQL   |
| `voice_storage`      | Audio và file xử lý   |
| `voice_logs`         | Log backend và worker |

Dung lượng cần dự toán:

```text
Tổng dung lượng =
audio gốc
+ audio trung gian
+ database
+ log trong thời gian lưu giữ
+ dung lượng backup
+ tối thiểu 20% dự phòng
```

Phải có chính sách xóa file tạm, retention audio, rotation log và backup database trước khi production.

## 6. Mạng và cổng dịch vụ

### 6.1. Development mặc định

| Dịch vụ       | Host        | Port   |
| ------------- | ----------- | ------ |
| Frontend Vite | `localhost` | `5173` |
| Backend API   | `localhost` | `3000` |
| PostgreSQL    | `localhost` | `5442` |
| Redis         | `localhost` | `6382` |

### 6.2. Production mặc định

| Dịch vụ       | Port container | Công khai                      |
| ------------- | -------------- | ------------------------------ |
| Client/Nginx  | `80`           | Có, qua `CLIENT_PORT`          |
| Backend       | `3000`         | Không cần nếu đi qua Nginx     |
| PostgreSQL    | `5432`         | Chỉ mở trong mạng tin cậy      |
| Redis         | `6379`         | Không mở ra Internet           |
| Prisma Studio | `5555`         | Chỉ bật tạm trong mạng tin cậy |

Firewall phải cho backend và worker kết nối tới PostgreSQL, Redis, SMTP, Google OAuth và các AI Core endpoint.

## 7. Dịch vụ phụ thuộc

| Dịch vụ           | Bắt buộc khi dùng chức năng            |
| ----------------- | -------------------------------------- |
| PostgreSQL        | Mọi chức năng nghiệp vụ                |
| Redis/BullMQ      | Job bất đồng bộ và worker              |
| AI Identify       | Enroll, identify và cập nhật giọng nói |
| AI OCR            | OCR tài liệu                           |
| AI Speech-to-Text | Chuyển audio thành văn bản             |
| AI Filter Noise   | Lọc nhiễu                              |
| AI Translation    | Dịch và tóm tắt                        |
| SMTP              | Các luồng gửi email                    |
| Google OAuth      | Đăng nhập Google nếu được bật          |

Mỗi endpoint ngoài phải có DNS hoặc IP hợp lệ, route mạng, chứng thư TLS hợp lệ nếu dùng HTTPS và timeout phù hợp.

## 8. Biến môi trường bắt buộc

Các nhóm cấu hình cần có:

| Nhóm     | Biến chính                                                 |
| -------- | ---------------------------------------------------------- |
| Ứng dụng | `NODE_ENV`, `APP_NAME`, `PORT`, `TZ`                       |
| Database | `DATABASE_URL` hoặc `DB_*`                                 |
| Redis    | `REDIS_URL` hoặc `REDIS_*`                                 |
| JWT      | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, thời hạn token  |
| Cookie   | `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_HTTP_ONLY`       |
| Storage  | `STORAGE_DRIVER`, `STORAGE_ROOT_DIR`, `STORAGE_CDN_URL`    |
| AI Core  | `AI_CORE_IDENTIFY_URL`, `AI_CORE_OCR_URL`, các URL AI khác |
| Email    | `SMTP_*`, `EMAIL_FROM`                                     |
| Network  | `CORS_ORIGINS`, `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`         |

Tham khảo `.env.example`, `.env.production.example` và `apps/api/src/config/env.validation.ts`.

## 9. Định dạng file

Storage hiện hỗ trợ các MIME audio được cấu hình qua `STORAGE_ALLOWED_MIMES`.

Danh sách mặc định gồm WAV, MP3, M4A/MP4, FLAC, OGG và WebM tùy file cấu hình.

Speech-to-Text chỉ thực hiện nhánh khử nhiễu tự động với file không vượt quá 50 MB. Đây không phải giới hạn upload chung của toàn API.

## 10. Bảo mật tối thiểu

- Dùng HTTPS trong production.
- Không dùng secret mẫu.
- Không công khai PostgreSQL, Redis hoặc Prisma Studio.
- Giới hạn CORS theo đúng frontend.
- Bật cookie secure khi dùng HTTPS.
- Mã hóa ổ đĩa hoặc volume chứa dữ liệu nhạy cảm khi hạ tầng hỗ trợ.
- Không dùng dữ liệu giọng nói thật cho môi trường development nếu chưa được phép.

## 11. Checklist xác nhận

- [ ] Node.js và pnpm đúng phiên bản.
- [ ] Docker và Docker Compose hoạt động.
- [ ] FFmpeg và Poppler có trong môi trường chạy backend.
- [ ] PostgreSQL và Redis đạt trạng thái healthy.
- [ ] API kết nối được toàn bộ AI Core endpoint cần dùng.
- [ ] Domain, CORS và cookie đúng môi trường.
- [ ] Dung lượng volume và backup đã được cấu hình.
- [ ] Secret đã thay khỏi giá trị mẫu.
- [ ] Đã chạy migration và kiểm tra schema.
- [ ] Đã smoke test login, upload, enroll và identify.

## 12. Tài liệu liên quan

- [Cài đặt môi trường](../setup/environment-setup.md)
- [Build và chạy dự án](../setup/build-and-run.md)
- [Kiến trúc hệ thống](../architecture/system-architecture.md)
- [Triển khai](../operations/deployment.md)
- [Troubleshooting](../operations/troubleshooting.md)
