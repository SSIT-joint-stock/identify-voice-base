# Identification Sessions Module

Tài liệu chi tiết về module quản lý lịch sử các phiên nhận dạng giọng nói.

## Endpoints

- [List Sessions](./list-sessions.md) — Tra cứu danh sách lịch sử với bộ lọc và phân trang.
- [Get Session Detail](./get-session.md) — Xem chi tiết kết quả nhận dạng kỹ thuật của một phiên.

## Dữ liệu lưu trữ

Lịch sử nhận dạng được lưu trữ trong bảng `identify_sessions` với các thông tin chính:

- **Operator:** Người thực hiện nhận dạng (`user_id`).
- **Audio File:** Bản ghi âm gốc được sử dụng (`audio_file_id`).
- **Results:** Kết quả nhận dạng từ AI đã được BE làm giàu thông tin cá nhân (lưu dưới dạng JSONB).
