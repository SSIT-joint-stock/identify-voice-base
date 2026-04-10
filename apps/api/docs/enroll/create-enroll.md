# API: Đăng ký giọng nói mới (Create Enrollment)

Tài liệu này hướng dẫn chi tiết về API trung tâm của module Enroll, được sử dụng để đăng ký danh tính mới cho người dùng bằng cách kết hợp thông tin cá nhân và dữ liệu sinh trắc học giọng nói.

---

## 1. Thông tin chung

- **Endpoint**: `POST /api/v1/voices/enroll`
- **Phương thức**: `POST`.
- **Content-Type**: `multipart/form-data`.
- **Cơ chế**: Transactional Write (PostgreSQL + AI Service).
- **Quyền hạn**: `Operator`, `Admin`.

---

## 2. Các tham số yêu cầu (Request Payload)

Vì đây là dữ liệu `multipart/form-data`, FE cần chuẩn bị đối tượng `FormData` chứa các trường sau:

### 2.1 Media File

| Tham số | Loại   | Bắt buộc | Mô tả                                            |
| :------ | :----- | :------- | :----------------------------------------------- |
| `audio` | `File` | **Có**   | Tệp âm thanh mẫu (WAV, MP3, OGG). Giới hạn 50MB. |

### 2.2 Metadata cá nhân

| Tham số                  | Loại          | Ràng buộc   | Mô tả                                    |
| :----------------------- | :------------ | :---------- | :--------------------------------------- |
| `name`                   | `String`      | 2-100 ký tự | Họ tên đầy đủ của người dùng.            |
| `citizen_identification` | `String`      | Duy nhất    | Số CCCD/CMND dùng để đối soát.           |
| `phone_number`           | `String`      | Duy nhất    | Số điện thoại liên hệ.                   |
| `hometown`               | `String`      | Optional    | Quê quán của người dùng.                 |
| `job`                    | `String`      | Optional    | Nghề nghiệp hiện tại.                    |
| `passport`               | `String`      | Duy nhất    | Số hộ chiếu (Dành cho người nước ngoài). |
| `criminal_record`        | `JSON String` | Optional    | Mảng các đối tượng tiền án tiền sự.      |

---

## 3. Quy trình thực hiện Backend (Logic Workflow)

Khi Backend nhận được yêu cầu, một quy trình kiểm soát nghiêm ngặt được kích hoạt:

1. **Giai đoạn Validation**:
   - Kiểm tra định dạng audio (Phải là File âm thanh hợp lệ).
   - Kiểm tra tính duy nhất của `citizen_identification`. Nếu đã có User đăng ký với số này -> Trả về `400 Bad Request`.
2. **Giai đoạn Storage**:
   - Lưu tệp âm thanh vào hệ thống lưu trữ (Local Storage).
   - Nhận về đường dẫn vật lý để lưu vào DB sau này.
3. **Giai đoạn AI Ingestion**:
   - Gửi Audio tới AI Service (FastAPI).
   - AI Service thực hiện trích xuất Embedding và lưu Vector vào **Qdrant** với một ID ngẫu nhiên (`voice_id`).
   - AI Service trả về `voice_id` thành công cho Backend.
4. **Giai đoạn Persistence (Atomic Transaction)**:
   - Tạo bản ghi mới trong bảng `users`.
   - Tạo bản ghi trong bảng `voice_records` liên kết `user_id` với `voice_id` của AI.
   - Lưu thông tin file vào bảng `audio_files`.
5. **Giai đoạn phản hồi**: Trả về thông tin User vừa được tạo thành công.

---

## 4. Cấu trúc dữ liệu phản hồi (Response)

### Ví dụ kết quả thành công (201 Created):

```json
{
  "statusCode": 201,
  "message": "Đăng ký hồ sơ giọng nói thành công!",
  "data": {
    "id": "e4f8a123-...",
    "name": "Nguyễn Văn A",
    "citizen_identification": "012345678901",
    "phone_number": "0912345678",
    "voice_id": "8d4be585-...",
    "created_at": "2026-04-10T16:00:00Z"
  }
}
```

---

## 5. Hướng dẫn dành cho Frontend (Implementation)

Việc tích hợp API Enroll cần chú trọng vào sự chính xác và phản hồi trực quan:

### 5.1 Xử lý mảng Tiền án (Criminal Record)

Trường `criminal_record` trong DB là kiểu JSON, nhưng do gửi qua `FormData`, FE cần `JSON.stringify` mảng này trước khi chuyển vào FormData:

```javascript
const formData = new FormData();
formData.append('criminal_record', JSON.stringify([{ case: 'A', year: 2021 }]));
```

### 5.2 Xử lý lỗi trùng lặp (Conflict Handling)

FE nên lắng nghe mã lỗi 400. Nếu message chứa các từ khóa như "CCCD" hoặc "Phone", hãy highlight đúng ô input nhập liệu để người dùng sửa lại thay vì báo lỗi chung chung.

### 5.3 ProgressBar cho File Upload

Với các mẫu audio chất lượng cao (dung lượng lớn), FE nên sử dụng tính năng `onUploadProgress` của thư viện `axios` để hiển thị phần trăm tải lên cho người dùng.

---

## 6. Các trường hợp lỗi thường gặp

- **400 Bad Request**:
  - "Số căn cước công dân đã tồn tại trong hệ thống".
  - "Dữ liệu âm thanh không đủ chất lượng để trích xuất đặc trưng".
- **413 Payload Too Large**: File âm thanh vượt quá giới hạn 50MB của server.
- **500 Internal Server Error**: Lỗi xảy ra tại AI Service hoặc Vector Database (Qdrant).

---

## 7. Ràng buộc bảo mật & Dữ liệu

- **SQL Sanitization**: Backend tự động xử lý các ký tự đặc biệt trong metadata để chống SQL Injection.
- **Biometric Protection**: Voice ID trả về chỉ là một mã mờ (Opaque ID), không thể dùng để suy đoán ngược lại đặc trưng giọng nói của người dùng nếu không có quyền truy cập vào AI Service.

---

> [!CAUTION]
> Tuyệt đối không xóa file âm thanh gốc sau khi đã Enroll thành công. File này là căn cứ pháp lý duy nhất để đối soát nếu xảy ra tranh chấp về danh tính sinh trắc học sau này.

---

> **Tài liệu tham khảo tiếp theo:**
>
> - [Tiêu chuẩn chất lượng âm thanh](./standards.md)
> - [Module Voices (Quản trị sau đăng ký)](../voices/index.md)
