# Tiêu chuẩn file âm thanh đăng ký

## Định dạng được backend chấp nhận

- WAV: `audio/wav`, `audio/x-wav`.
- MP3: `audio/mpeg`.
- M4A/MP4: `audio/mp4`, `audio/x-m4a`, `video/mp4`.
- FLAC: `audio/flac`, `audio/x-flac`.
- OGG: `audio/ogg`.
- WebM: `audio/webm`.

Client phải gửi file bằng `multipart/form-data`, field `audio`.

## Khuyến nghị thu âm

- Chỉ có một người nói trong mẫu enroll.
- Thu trong môi trường ít tiếng vọng và tiếng ồn nền.
- Không cắt mất đầu hoặc cuối câu nói.
- Không sử dụng file rỗng, hỏng hoặc đổi phần mở rộng để giả định dạng.
- Ưu tiên nguồn âm thanh rõ và có thời lượng đủ để AI Core trích xuất đặc trưng ổn
  định.

Các ngưỡng chất lượng sinh trắc học cụ thể thuộc contract của AI Core, không được
hard-code trong tài liệu backend nếu AI Core chưa công bố ngưỡng ổn định.

## Xử lý của backend

1. Kiểm tra file và MIME type.
2. Lưu file gốc vào Storage.
3. Chuẩn hóa bản gửi sang AI Core về định dạng phù hợp.
4. Gọi AI Core để enroll.
5. Lưu metadata, `voice_id` và quan hệ dữ liệu.
6. Dọn file tạm sau khi hoàn tất hoặc gặp lỗi.

Giới hạn dung lượng và timeout được cấu hình bằng biến môi trường. Khi thay đổi policy
phải cập nhật đồng thời backend, reverse proxy và tài liệu vận hành.

Xem tiếp: [Quy trình đăng ký mới](./create-enroll.md).
