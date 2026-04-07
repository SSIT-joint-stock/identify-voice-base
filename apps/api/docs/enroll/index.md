# Enroll Module

Quy trình đăng ký định danh giọng nói mới vào hệ thống, bao gồm việc thu thập thông tin cá nhân và trích xuất đặc trưng giọng nói (embedding) thông qua AI Service.

## 1. Quy trình thực hiện (Workflow)

1.  **Nhận yêu cầu**: Operator gửi file âm thanh cùng thông tin cá nhân của người dùng.
2.  **Xử lý file**: Hệ thống kiểm tra định dạng, kích thước và độ dài file âm thanh.
3.  **Trích xuất đặc trưng**: File audio được gửi sang **AI Service** (FastAPI) để tạo vector đặc trưng và nhận diện ID duy nhất (`voice_id`).
4.  **Lưu trữ**:
    - Lưu file audio vào Storage (Local/S3).
    - Lưu thông tin người dùng vào bảng `users`.
    - Lưu bản ghi giọng nói vào bảng `voice_records` (Phiên bản 1, Trạng thái: Active).
5.  **Phục vụ**: Tạo `audio_url` để có thể phát lại voice bằng trình duyệt.

---

## 2. API Endpoints

### Đăng ký giọng nói mới (Enroll)

Thực hiện đăng ký một người dùng mới cùng với mẫu giọng nói của họ.

- **URL**: `POST /api/v1/voices/enroll`
- **Authentication**: Yêu cầu Bearer Token (JWT)
- **Content-Type**: `multipart/form-data`

#### Tham số Request (Body):

| Tham số                  | Loại        | Bắt buộc | Mô tả                                                                           |
| :----------------------- | :---------- | :------- | :------------------------------------------------------------------------------ |
| `audio`                  | File        | Có       | File âm thanh (WAV, MP3, FLAC, OGG). Tối đa 50MB, tối thiểu 3s, tối đa 10 phút. |
| `name`                   | String      | Có       | Họ và tên đầy đủ. Tối đa 100 ký tự.                                             |
| `citizen_identification` | String      | Không    | Số CCCD/CMND (9-12 chữ số).                                                     |
| `phone_number`           | String      | Không    | Số điện thoại (10-11 chữ số).                                                   |
| `hometown`               | String      | Không    | Quê quán.                                                                       |
| `job`                    | String      | Không    | Nghề nghiệp hiện tại.                                                           |
| `passport`               | String      | Không    | Số hộ chiếu (nếu có).                                                           |
| `criminal_record`        | JSON String | Không    | Danh sách tiền án tiền sự. Ví dụ: `[{"case":"Trộm cắp","year":2021}]`           |

#### Kết quả trả về (Success 201):

```json
{
  "success": true,
  "data": {
    "voice_id": "8d4be585-a892-4600-ba0c-32aff3e3b0be",
    "user_id": "8d4be585-a892-4600-ba0c-32aff3e3b0be",
    "audio_url": "http://localhost:3000/cdn/voices/f6285cde-71ca-4ee2-9a29-065f3a1cd00d.mp4",
    "name": "Nguyễn Văn A",
    "enrolled_at": "2026-04-07T06:59:05.463Z"
  }
}
```

---

## 3. Ràng buộc & Lưu ý

- **Độ dài Audio**: Phải từ 3 giây trở lên để đảm bảo AI Service có đủ dữ liệu trích xuất đặc trưng chính xác.
- **Định dạng**: Hệ thống ưu tiên định dạng `.wav` hoặc `.mp4` (AAC). File `.mp4` sẽ được hệ thống tự động chuẩn hóa sang `.m4a` khi lưu trữ.
- **Duy nhất**: Mỗi người dùng (`user_id`) sẽ được định danh bằng `voice_id` trả về từ AI Service. Trong phiên bản hiện tại, `user_id` và `voice_id` được đồng bộ là một.
- **Bảo mật**: Chỉ các Operator có quyền (Token hợp lệ) mới có thể thực hiện đăng ký giọng nói.
