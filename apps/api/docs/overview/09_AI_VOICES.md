# 09 — AI Voices Module (AI Truth)

> **Last updated:** 2026-04-10
> **Module path:** `src/module/ai-voices/`

> [!IMPORTANT]
> **Dành cho Frontend (FE):** Module này hiện tại **chưa cần triển khai** giao diện trong giai đoạn này. Các API được cung cấp để hoàn thiện kiến trúc Backend và phục vụ việc mở rộng trong tương lai.

---

## Tổng quan

Module **AI Voices** quản lý lớp dữ liệu **AI Truth**. Đây là các danh tính giọng nói mà hệ thống AI đã nhận dạng được và lưu vào bộ nhớ đệm (`ai_identities_cache`), nhưng chưa được người vận hành xác minh hoặc đăng ký chính thức vào hệ thống **Business Truth**.

Kiến trúc này cho phép hệ thống "nhận diện" được những giọng nói quen thuộc mặc dù họ chưa bao giờ thực hiện quy trình Enroll định danh.

---

## 1. Luồng dữ liệu AI Truth

Khi một phiên nhận dạng diễn ra (Identify):

1. AI trả về `voice_id` (UUID).
2. Backend kiểm tra: `voice_id` này đã có trong `voice_records` (Business Truth) chưa?
3. Nếu **CHƯA**: Thông tin tạm thời của giọng nói này sẽ được lưu/cập nhật vào `ai_identities_cache`.
4. Nếu **RỒI**: Hệ thống sẽ sử dụng thông tin từ `users` để hiển thị trong kết quả.

---

## 2. API Endpoints

### GET /api/v1/ai-voices

- **Mô tả**: Liệt kê các giọng nói "vô danh" nhưng đã có trong cache AI.
- **Logic**: Chỉ trả về các `voice_id` **KHÔNG** tồn tại trong bảng `voice_records`.
- **Phân trang**: Hỗ trợ chuẩn `page`, `page_size`.

### GET /api/v1/ai-voices/:id

- **Mô tả**: Xem thông tin chi tiết mà AI đã thu thập được về giọng nói này (tên tạm thời, ghi chú AI, lần đầu xuất hiện).

### POST /api/v1/ai-voices/:id/convert

- **Mô tả**: Quy trình quan trọng nhất — Chuyển đổi một AI Voice thành User chính thức.
- **Quy trình nghiệp vụ (Transaction)**:
  1. Tìm mẫu âm thanh sớm nhất (`identified_at` MIN) của `voice_id` này trong lịch sử session.
  2. Tạo mới một bản ghi `users` với thông tin từ cache.
  3. Tạo một bản ghi `voice_records` liên kết User mới với `voice_id` này, sử dụng mẫu âm thanh tìm được ở bước 1 làm **Enroll Audio**.
  4. Sau khi thành công, giọng nói này chính thức trở thành **Business Truth** và sẽ không hiện diện trong danh sách AI Voices nữa.

---

## 3. Tại sao cần AI Truth?

1. **Lazy Enrollment**: Không bắt buộc người dùng phải đăng ký trước. Hệ thống tự học và tích lũy dữ liệu.
2. **Đối soát ẩn danh**: Theo dõi hành vi của các đối tượng chưa có trong hồ sơ dựa trên đặc trưng sinh trắc học giọng nói.
3. **Tiết kiệm thao tác**: Khi cần đăng ký chính thức, operator chỉ cần "Xác nhận" (Convert) thay vì phải yêu cầu đối tượng thực hiện lại quy trình ghi âm Enroll phức tạp.

---

## Lưu ý kỹ thuật

- Dữ liệu trong bảng `ai_identities_cache` có thể bị dọn dẹp (cleanup) định kỳ nếu không được chuyển đổi thành User chính thức trong một khoảng thời gian nhất định (Dựa trên chính sách Retention).
- Việc convert sử dụng `Prisma.$transaction` để đảm bảo tính nhất quán giữa thông tin User và hồ sơ Voice.
