# API: Cập nhật thông tin hồ sơ (Metadata Update)

Tài liệu này hướng dẫn cách sử dụng API để thay đổi các thông tin định danh cá nhân mà không làm ảnh hưởng đến đặc trưng sinh trắc học giọng nói (Embedding) của người dùng.

---

## 1. Thông tin chung

- **Endpoint**: `PATCH /api/v1/voices/:id`
- **Phương thức**: `PATCH` (Cập nhật từng phần).
- **Quyền truy cập**: `Operator`, `Admin`.
- **Phạm vi tác động**: Bảng `users`. **KHÔNG** làm thay đổi dữ liệu trong `voice_records` hay Qdrant.

---

## 2. Ý nghĩa nghiệp vụ (Business Context)

Kiến trúc sinh trắc học của chúng tôi tách biệt hoàn toàn giữa:

- **Biometric Truth**: Đặc trưng sóng âm (Voice Embedding).
- **Business Truth**: Metadata đi kèm (Tên, CCCD, SĐT...).

API này phục vụ trường hợp người dùng thay đổi số điện thoại, đổi căn cước công dân hoặc chuyển đổi nghề nghiệp. Việc tách biệt này đảm bảo hệ thống không cần phải định danh lại (Re-enroll) mỗi khi thông tin hành chính thay đổi.

---

## 3. Request Parameters

### 3.1 URL Parameters

- `:id`: **UUID** của người dùng cần cập nhật.

### 3.2 Request Body (JSON)

Toàn bộ các trường trong Body đều là **Tùy chọn** (Optional). Hệ thống sẽ chỉ cập nhật những trường được gửi lên.

| Trường                   | Loại dữ liệu | Ràng buộc   | Mô tả                                    |
| :----------------------- | :----------- | :---------- | :--------------------------------------- |
| `name`                   | `String`     | 2-100 ký tự | Họ và tên mới.                           |
| `citizen_identification` | `String`     | Duy nhất    | Số CCCD/CMND mới.                        |
| `phone_number`           | `String`     | Duy nhất    | Số điện thoại liên lạc.                  |
| `job`                    | `String`     | < 100 ký tự | Nghề nghiệp hiện tại.                    |
| `hometown`               | `String`     | < 200 ký tự | Quê quán.                                |
| `passport`               | `String`     | Duy nhất    | Số hộ chiếu.                             |
| `criminal_record`        | `Array`      | JSON Array  | Danh sách tiền án tiền sự được cập nhật. |

---

## 4. Quy trình xử lý tại Backend

1. **Kiểm tra sự tồn tại**: Kiểm tra `user_id` có tồn tại trong hệ thống. Nếu không -> 404.
2. **Xác thực dữ liệu (Validation)**:
   - Nếu gửi `phone_number` hoặc `citizen_identification`, hệ thống kiểm tra bị trùng lặp (Unique constraint) với các User khác.
   - Nếu bị trùng -> Trả về `400 Bad Request` kèm thông báo chi tiết.
3. **Thực thi cập nhật**: Sử dụng Prisma để update bản ghi trong bảng `users`.
4. **Log & Audit**: Ghi lại lịch sử thay đổi (Ai đã sửa, sửa lúc nào, giá trị cũ và mới).
5. **Gửi kết quả**: Trả về object User sau khi đã cập nhật thành công.

---

## 5. Ví dụ Request & Response

### Ví dụ Request Body:

```json
{
  "name": "Trần Văn Cường",
  "job": "Giám đốc kỹ thuật",
  "phone_number": "0909123456"
}
```

### Ví dụ Response Thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Cập nhật thông tin cá nhân thành công!",
  "data": {
    "id": "uuid-xxx",
    "name": "Trần Văn Cường",
    "phone_number": "0909123456",
    "job": "Giám đốc kỹ thuật",
    "updated_at": "2026-04-10T16:00:00Z"
  }
}
```

---

## 6. Xử lý lỗi (Error Handling)

Hệ thống xử lý các trường hợp ngoại lệ theo chuẩn HTTP:

### 400 Bad Request

Xảy ra khi vi phạm các ràng buộc dữ liệu:

- **Trùng số điện thoại**: `{ "message": "Số điện thoại này đã được đăng ký bởi người khác" }`
- **Trùng CCCD**: `{ "message": "Số căn cước công dân đã tồn tại trong hệ thống" }`
- **Sai định dạng**: Gửi sai kiểu dữ liệu (vd: mảng JSON không đúng cấu trúc).

### 401 Unauthorized

Xảy ra khi Token thiếu hoặc không có quyền `UPDATE_VOICE`.

### 404 Not Found

Xảy ra khi `id` truyền lên không khớp với bất kỳ User nào trong hệ thống.

---

## 7. Hướng dẫn dành cho Frontend (UX Patterns)

### 7.1 Giao diện Chỉnh sửa (Inline Editing)

Chúng tôi khuyến nghị sử dụng mô hình **Inline Editing** trên trang chi tiết hồ sơ để người dùng có thể sửa nhanh các trường thông tin nhỏ (`job`, `name`) mà không cần chuyển trang.

### 7.2 Xác nhận thay đổi nhạy cảm

Đối với các trường quan trọng như `citizen_identification`, FE nên hiển thị Dialog xác nhận trước khi gửi request PATCH để tránh sai sót nhập liệu.

### 7.3 Thông báo trạng thái (Toasts)

Sau khi nhận được phản hồi 200 OK, FE cần hiển thị thông báo "Cập nhật thành công" và làm mới (Refresh) lại dữ liệu đang hiển thị trên giao diện.

---

## 8. Integrity & Security

- **Atomic Update**: Hệ thống đảm bảo việc cập nhật là nguyên tử (Atomic). Nếu có lỗi xảy ra trong quá trình ghi DB, dữ liệu cũ sẽ được giữ nguyên.
- **SQL Injection**: Nhờ sử dụng Prisma ORM, toàn bộ dữ liệu đầu vào đều được sanitize tự động để ngăn chặn các cuộc tấn công SQL Injection.
- **Audit Trace**: Mọi hành động chỉnh sửa thông tin người dùng đều được ghi log vào bảng `system_logs` cho mục đích truy vết hành chính.

---

> [!CAUTION]
> API này **không dùng** để thay đổi file audio Enroll. Để cập nhật giọng nói, vui lòng tham khảo tài liệu [Cập nhật Biometric](./update-embedding.md).
