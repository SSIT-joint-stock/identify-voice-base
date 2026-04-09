# Voice Management Module

Tài liệu chi tiết về module quản lý hồ sơ giọng nói. Module này cho phép quản trị viên tra cứu, cập nhật thông tin và quản lý vòng đời của các hồ sơ giọng nói đã đăng ký.

## Endpoints

- [List Voices](./list-voices.md) — Tra cứu danh sách hồ sơ với bộ lọc và phân trang.
- [Get Voice Detail](./get-voice.md) — Xem chi tiết hồ sơ, lịch sử phiên bản giọng nói và lịch sử nhận dạng.
- [Update Voice Info](./update-voice-info.md) — Cập nhật thông tin cá nhân (metadata) của người dùng.
- [Delete Voice](./delete-voice.md) — Xóa hoàn toàn hồ sơ giọng nói (Biometric Destruction).

## Mô hình dữ liệu

Hệ thống quản lý giọng nói dựa trên hai thực thể chính:

1.  **User (PostgreSQL):** Lưu trữ thông tin định danh (Tên, CCCD, SĐT, ...).
2.  **Voice Record (PostgreSQL & Qdrant):** Liên kết User với vector đặc trưng giọng nói (embedding) thông qua `voice_id`. Một User có thể có nhiều Voice Record (phiên bản), nhưng chỉ có một bản hoạt động duy nhất (`is_active: true`).

## Liên kết nghiệp vụ

- Việc đăng ký mới được thực hiện tại module [Enroll](../enroll/index.md).
- Việc cập nhật đặc trưng giọng nói (re-enroll) được thực hiện tại module [Update Voice](../overview/06_UPDATE_VOICE.md).
