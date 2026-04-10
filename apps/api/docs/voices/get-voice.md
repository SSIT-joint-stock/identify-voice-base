# API: Chi tiết hồ sơ giọng nói (Full Profile & History)

Tài liệu này cung cấp hướng dẫn đầy đủ về cách sử dụng API để truy xuất toàn bộ dữ liệu của một hồ sơ người dùng cụ thể, bao gồm thông tin cá nhân mở rộng và lịch sử nhận dạng sinh trắc học.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/voices/:id`
- **Tác vụ**: Lấy thông tin Snapshot hiện hành của một User.
- **Quyền truy cập**: `Operator`, `Admin`.
- **Logic làm giàu (Enrichment)**: API này thực hiện `JOIN` dữ liệu giữa Users, Voice Records và thực hiện truy vấn `identify_sessions` để tổng hợp lịch sử.

---

## 2. Đường dẫn truy cập (Endpoint Path)

Tham số `:id` trong URL bắt buộc là **UUID** của người dùng (User ID). Lưu ý rằng trong hệ thống hiện tại, `user_id` và `voice_id` được đồng nhất là một để tối ưu hóa việc quản lý mã định danh Point trong Qdrant.

---

## 3. Quy trình Backend (Internal Workflow)

Khi nhận được request, máy chủ NestJS thực hiện các bước sau:

1. **Tìm kiếm User**: Truy vấn DB lấy thông tin cá nhân. Nếu không tồn tại -> Trả về `404 Not Found`.
2. **Lấy Voice Record**: Tìm bản ghi trong bảng `voice_records` liên kết với User này có trạng thái `is_active: true`.
3. **Kiểm tra File Media**: Xác thực `audio_file_id` hiện tại để tạo `audio_url` streaming. Nếu file gốc bị mất/hỏng, trường `audio_available` sẽ trả về `false`.
4. **Truy vấn Lịch sử**:
   - Sử dụng `Prisma.raw` hoặc JSONB operators để tìm trong bảng `identify_sessions`.
   - Lọc các phiên nhận dạng mà trường `results` (JSON array) có chứa `voice_id` của User này.
   - Chỉ lấy **5 phiên gần nhất** (Sắp xếp theo `created_at DESC`).
5. **Gửi Response**: Tổng hợp tất cả dữ liệu thành một object duy nhất và trả về cho Client.

---

## 4. Cấu trúc dữ liệu phản hồi (Detailed Schema)

Dưới đây là mô tả chi tiết các trường thông tin mà Frontend sẽ nhận được:

### 4.1 Thông tin cá nhân (Metadata)

- `name`: Họ và tên hiển thị.
- `citizen_identification`: Số căn cước công dân.
- `phone_number`: Số điện thoại liên lạc.
- `job`: Nghề nghiệp hiện tại.
- `hometown`: Quê quán.
- `passport`: Số hộ chiếu.
- `criminal_record`: Mảng JSON chứa danh sách tiền án tiền sự (Bao gồm tội danh và năm vi phạm).

### 4.2 Thông tin Biometric hiện hành

- `audio_url`: Link phát lại mẫu giọng nói dùng để định danh.
- `audio_available`: Trạng thái khả dụng của file audio gốc.
- `is_active`: Luôn là `true` (vì chỉ get được active profile).
- `enrolled_at`: Ngày đăng ký định danh.

### 4.3 Lịch sử nhận dạng (Identify History)

Mảng tối đa 5 phần tử, mỗi phần tử bao gồm:

- `session_id`: ID của phiên làm việc.
- `audio_file_id`: ID của file âm thanh đầu vào trong phiên đó (**Cực kỳ quan trọng cho việc Update Embedding**).
- `score`: Độ tin cậy (0.00 -> 1.00).
- `identified_at`: Thời gian thực hiện phiên.

---

## 5. Ví dụ kết quả phản hồi (200 OK)

```json
{
  "statusCode": 200,
  "message": "Lấy chi tiết giọng nói thành công!",
  "data": {
    "id": "8d4be585-a892-4600-ba0c-32aff3e3b0be",
    "name": "Nguyên Văn A",
    "citizen_identification": "012345678901",
    "phone_number": "0912345678",
    "hometown": "Hà Nội",
    "job": "Kế toán",
    "passport": "B1234567",
    "criminal_record": [
      {
        "case": "Trộm cắp",
        "year": 2021
      }
    ],
    "audio_url": "http://localhost:3000/api/v1/sessions/.../audio",
    "audio_available": true,
    "is_active": true,
    "enrolled_at": "2026-04-05T10:00:00.000Z",
    "identify_history": [
      {
        "session_id": "9e5cf696-...",
        "audio_file_id": "af123-...",
        "score": 0.9823,
        "identified_at": "2026-04-10T15:30:00Z"
      },
      {
        "session_id": "1a2b3c4d-...",
        "audio_file_id": "bf456-...",
        "score": 0.9412,
        "identified_at": "2026-04-09T09:00:00Z"
      }
    ]
  }
}
```

---

## 6. Hướng dẫn dành cho Frontend (UI Implementation)

### 6.1 Hiển thị Timeline Lịch sử

Sử dụng mảng `identify_history` để vẽ biểu đồ đường (Line Chart) thể hiện sự biến động của `score` theo thời gian. Nếu xu hướng `score` giảm dần, FE nên gợi ý Operator thực hiện cập nhật Embedding.

### 6.2 Nghe lại mẫu Enroll

Nút "Nghe mẫu đăng ký" nên gọi trực tiếp `audio_url`. Lưu ý URL này có thời gian hết hạn (Token-based) nên tránh lưu cache URL vào LocalStorage quá lâu.

### 6.3 Phân tách Audio Speaker

Trong bảng lịch sử, nếu phiên nhận dạng là `MULTI` (Diarization), FE có thể sử dụng `audio_file_id` kết hợp với `session_id` để gọi API streaming từng speaker đơn lẻ (Xem tài liệu Sessions).

---

## 7. Các trường hợp lỗi thường gặp

- **404 Not Found**: Xảy ra khi:
  - User ID không tồn tại.
  - User tồn tại nhưng tất cả Voice Records đã bị `deactivated`.
- **401 Unauthorized**: JWT không có quyền truy cập module Voices.

---

## 8. Hiệu năng & Bảo mật

- **Caching**: Kết quả chi tiết hồ sơ **KHÔNG** nên được cache ở phía Server vì dữ liệu `identify_history` thay đổi liên tục sau mỗi phiên phát hiện. FE có thể cache trong bộ nhớ (Redis/Memory) tối đa 1 phút.
- **Masking**: Trong các môi trường bảo mật thấp, hệ thống sẽ thực hiện Masking (ẩn bớt) số CCCD hoặc số điện thoại theo định dạng `091xxxx678`.

---

> **Tài liệu tham khảo thêm:**
>
> - [Module Sessions](../sessions/index.md)
> - [Cập nhật thông tin cá nhân](./update-info.md)
> - [Quy trình Biometric Update](./update-embedding.md)

---
