# Module Quản lý phiên (Sessions)

Chào mừng bạn đến với tài liệu kỹ thuật của module **Sessions**. Đây là nơi lưu trữ, quản lý và phân tích kết quả của tất cả các phiên nhận dạng giọng nói diễn ra trong hệ thống.

---

## 1. Triết lý thiết kế (Core Architecture)

Module Sessions đóng vai trò là lớp "Làm giàu dữ liệu" (Data Enrichment) và "Bảo toàn lịch sử" (Auditing Layer).

### 1.1 Cơ chế Làm giàu dữ liệu (Identity Enrichment)

Khi một phiên nhận dạng kết thúc, Backend chỉ lưu trữ các mã định danh (`voice_id`) và độ tin cậy (`score`). Để hiển thị thông tin con người thực tế (Tên, CCCD...), module Sessions thực hiện một quy trình đối soát động (Dynamic Matching):

1. Ưu tiên lấy dữ liệu từ **Business Truth** (Người dùng đã đăng ký).
2. Nếu không có, lấy dữ liệu từ **AI Truth** (Bộ nhớ tạm của AI).
3. Luôn giữ lại thông tin tại thời điểm nhận dạng để tránh xung đột dữ liệu khi Profile thay đổi trong tương lai.

### 1.2 Quản lý tài nguyên âm thanh (Media Management)

Hệ thống không lưu trữ các file audio đã cắt nhỏ để tiết kiệm dung lượng Storage. Thay vào đó, module Sessions lưu trữ metadata về các phân đoạn (Segments). Khi người dùng có nhu cầu nghe lại một Speaker cụ thể, hệ thống sẽ thực hiện **On-demand Processing** để trích xuất âm thanh từ file gốc một cách tức thì.

---

## 2. Danh mục tài liệu chi tiết

Module Sessions được chia thành 3 phần chuyên sâu để phục vụ việc tích hợp đa nền tảng:

| Tài liệu                                                 | Nội dung chính                                                                    | Đối tượng       |
| :------------------------------------------------------- | :-------------------------------------------------------------------------------- | :-------------- |
| **[Danh sách phiên làm việc](./list-sessions.md)**       | Quản lý API `GET /sessions`, lọc theo thời gian, thiết bị và kết quả nhận diện.   | FE / Mobile     |
| **[Chi tiết phiên & Đối soát](./get-session-detail.md)** | Giải thích cấu trúc Enrichment phức tạp kết hợp dữ liệu Biometric và Metadata.    | FE / BA         |
| **[Trích xuất audio Speaker](./speaker-audio.md)**       | **[Trọng yếu]** Kỹ thuật trích xuất âm thanh theo Segment sử dụng FFmpeg filters. | FE / Media Team |

---

## 3. Quy trình nghiệp vụ tiêu chuẩn (Standard Workflow)

1. **Ghi vết (Logging)**: Sau khi module Identify hoàn tất, một bản ghi Session được tạo ra với trạng thái `COMPLETED`.
2. **Truy vấn (Querying)**: Operator truy cập danh sách để tìm kiếm các phiên nghi vấn hoặc cần kiểm tra lại thông tin.
3. **Phân tích (Analysis)**: Operator xem chi tiết một phiên. Tại đây, hệ thống thực hiện "đổ dữ liệu" Business Truth vào các kết quả AI thuần túy.
4. **Hậu kiểm (Audit)**: Operator nghe lại audio của từng speaker để xác nhận xem AI nhận dạng đúng hay sai.
5. **Nâng cấp (Upgrade)**: Nếu AI nhận dạng đúng nhưng điểm số thấp, Operator có thể sử dụng audio từ Session này để cập nhật lại Profile cho người dùng (Xem module Voices).

---

## 4. Các thực thể dữ liệu (Data Entities)

- **Identify Sessions**: Lưu trữ thông tin chung (file audio, thời gian, thiết bị, loại session).
- **Identify Results (JSONB)**: Lưu trữ mảng kết quả trích xuất từ AI (ID, Score, v.v.).
- **Segments (JSONB)**: Lưu trữ các mốc thời gian (start, end) của từng người nói trong file.

---

## 5. Lưu ý dành cho Frontend

- **Pagination**: Mặc định hệ thống sử dụng Cursor-based pagination hoặc Page-based tùy cấu hình. Hãy kiểm tra metadata `pagination` trong response.
- **Real-time Enrichment**: Vì dữ liệu danh tính có thể cập nhật, FE nên gọi API lấy chi tiết mỗi khi người dùng mở một Session, thay vì hiển thị dữ liệu cũ đã lưu cache.
- **Audio Control**: Luôn sử dụng `audio_url` bảo mật từ Server. Không nên tự ý truy cập file system hoặc storage trực tiếp.

---

> [!IMPORTANT]
> Module Sessions là cầu nối quan trọng nhất giữa **Kết quả AI** và **Dữ liệu Nghiệp vụ**. Mọi báo cáo về độ chính xác và hiệu quả của hệ thống đều dựa trên dữ liệu tại đây.

---

> **Tài liệu tham khảo tiếp theo:** [Danh sách phiên làm việc](./list-sessions.md)
