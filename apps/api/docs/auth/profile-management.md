# API: Quản lý tài khoản cá nhân & Hồ sơ (User Profile)

Tài liệu này hướng dẫn chi tiết cách quản lý thông tin của chính tài khoản đang đăng nhập trong hệ thống. Đây là các API thuộc module **UserAuth**, cho phép người vận hành và quản trị viên tự quản trị tài khoản của mình.

---

## 1. Lấy thông tin cá nhân (Get Me)

- **Endpoint**: `GET /api/v1/user/me`
- **Tác vụ**: Trả về toàn bộ Profile của tài khoản đang sở hữu token hiện hành.
- **Quyền hạn**: Mọi người dùng đã đăng nhập.

### Cấu trúc phản hồi (200 OK):

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "id": "admin-uuid",
    "username": "trh_thanh30",
    "email": "thanh@biometric.io",
    "name": "Trịnh Hoàng Thanh",
    "role": "ADMIN",
    "status": "ACTIVE",
    "last_login": "2026-04-10T23:00:00Z"
  }
}
```

---

## 2. Cập nhật thông tin cá nhân

Người dùng có thể tự thay đổi các thông tin cơ bản như Họ tên hoặc Email (Nếu cấu hình hệ thống cho phép).

- **Endpoint**: `PATCH /api/v1/user/update-info`
- **Phương thức**: `PATCH`.
- **Hạn chế**: Không thể tự thay đổi `Role` của chính mình để tránh leo thang đặc quyền (Privilege Escalation).

### Tham số yêu cầu (Body):

| Tham số | Loại     | Ràng buộc       | Mô tả                           |
| :------ | :------- | :-------------- | :------------------------------ |
| `name`  | `String` | 2-50 ký tự      | Tên hiển thị mới trên hệ thống. |
| `email` | `String` | Định dạng Email | Email mới để nhận thông báo.    |

### Xử lý tại Backend:

1. Backend trích xuất `user_id` từ JWT để đảm bảo người dùng chỉ sửa đúng được tài khoản của mình.
2. Kiểm tra tính duy nhất của Email mới.
3. Cập nhật dữ liệu vào bảng `auth_accounts`.
4. Ghi log hành động chỉnh sửa hồ sơ.

---

## 3. Đặt lại mật khẩu (Reset Password)

Đây là tính năng quan trọng nhất trong việc tự quản trị tài khoản để đảm bảo an toàn thông tin cá nhân.

- **Endpoint**: `POST /api/v1/auth/reset-password`
- **Yêu cầu**: Phải cung cấp mật khẩu cũ để xác thực chủ sở hữu.

### Payload yêu cầu:

```json
{
  "old_password": "Mật khẩu cũ đang dùng",
  "new_password": "Mật khẩu mới (Tối thiểu 8 ký tự)",
  "confirm_password": "Mật khẩu mới (Nhập lại)"
}
```

### Quy tắc bảo mật của hệ thống:

1. **Xác thực cũ**: Backend sử dụng Bcrypt để kiểm tra `old_password`. Nếu sai -> Trả về lỗi 403.
2. **Khớp mật khẩu**: Nếu `new_password` và `confirm_password` không trùng khớp -> Trả về lỗi 400.
3. **Độ mạnh mật khẩu**: Phải bao gồm cả chữ số, chữ cái hoa và thường.
4. **Hậu xử lý**: Sau khi đổi mật khẩu thành công, hệ thống nên tự động đăng xuất người dùng khỏi **TẤT CẢ** các thiết bị khác bằng cách xóa toàn bộ Refresh Tokens liên quan trong DB.

---

## 4. Xóa tài khoản (Self Deletion)

Hệ thống cho phép người dùng tự đóng tài khoản của mình nếu không còn nhu cầu sử dụng.

- **Endpoint**: `DELETE /api/v1/user/delete-account`
- **Tác động**: Đây là hành động **Vĩnh viễn**. Mọi thông tin về tài khoản quản trị sẽ bị xóa khỏi hệ thống.

---

## 5. Hướng dẫn dành cho Frontend (User Settings UI)

Để mang lại trải nghiệm tốt nhất, trang "Cài đặt tài khoản" của FE nên được thiết kế như sau:

### 5.1 Phân tách các Tab

- **Tab Hồ sơ**: Hiển thị Name, Email, Username.
- **Tab Bảo mật**: Nơi đặt form Đổi mật khẩu.
- **Tab Quyền hạn**: Hiển thị Role hiện tại dưới dạng nhãn (Chip) và danh sách các module được phép truy cập.

### 5.2 Xử lý Loading Status

Khi người dùng nhấn "Lưu thay đổi", FE nên vô hiệu hóa (Disable) các ô input để tránh double-submit.

### 5.3 Phản hồi trực quan

Nếu người dùng đổi mật khẩu thành công, hãy hiển thị thông báo "Đổi mật khẩu thành công. Hệ thống sẽ đăng xuất sau 3 giây" rồi thực hiện chuyển hướng về trang `/login`.

---

## 6. Các trường hợp lỗi

- **403 Forbidden**: "Mật khẩu cũ không chính xác" - Khi thực hiện Reset Password.
- **400 Bad Request**: "Email này đã được sử dụng bởi một tài khoản khác" - Khi cập nhật thông tin.
- **401 Unauthorized**: Session đã hết hạn, không thể thực hiện các thao tác quản trị.

---

## 7. Integrity & Metadata Snapshot

Lưu ý rằng thông tin trong module **Auth** (Hồ sơ người vận hành) hoàn toàn tách biệt với thông tin trong module **Voices** (Hồ sơ người được định danh).

- Một quản trị viên (Admin) có thể có hoặc không có mẫu giọng nói trong hệ thống.
- Việc cập nhật tên tại đây sẽ thay đổi tên hiển thị của người quản trị trong các báo cáo "Audit Logs" (Người đã thực hiện Enroll, Người đã Identify...).

---

> [!WARNING]
> Việc tự ý xóa tài khoản (`delete-account`) có thể dẫn đến việc mất quyền truy cập vào các dữ liệu quan trọng mà bạn đang quản lý. Hãy thực hiện chuyển giao quyền Admin cho người khác trước khi xóa.

---

> **Tài liệu tham khảo tiếp theo:**
>
> - [Module Cập nhật Biometric](../voices/update-embedding.md)
> - [Quản lý phiên làm việc](../sessions/index.md)
