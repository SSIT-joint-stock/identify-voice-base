# API: Quản lý Tài Khoản Đăng Nhập

Tài liệu này mô tả các API quản lý tài khoản đăng nhập của hệ thống. Hiện tại toàn bộ logic nằm trong module **UserAuth** và được tách thành 2 nhóm:

- **Self account APIs**: tài khoản đang đăng nhập tự xem/cập nhật/xóa account của mình.
- **Admin account APIs**: admin tạo và quản lý account của người khác.

---

## 1. Self Account APIs

### 1.1 Lấy thông tin tài khoản hiện tại

- **Endpoint**: `GET /api/v1/user/me`
- **Quyền yêu cầu**: `profile.read`

### Response mẫu

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "email": "operator@example.com",
    "username": "operator01",
    "role": "OPERATOR",
    "status": "ACTIVE",
    "permissions": ["profile.read", "voices.read", "voices.enroll"]
  }
}
```

### 1.2 Người dùng tự cập nhật account của mình

- **Endpoint**: `PATCH /api/v1/user/account`
- **Quyền yêu cầu**: `profile.update`
- **Cho phép sửa**: `email`, `username`
- **Không cho phép sửa**: `role`, `status`, `permissions`, `password`

### Body mẫu

```json
{
  "email": "operator.updated@example.com",
  "username": "operator01-updated"
}
```

### Xử lý backend

1. Lấy `userId` từ access token.
2. Kiểm tra account tồn tại và đang hợp lệ.
3. Kiểm tra trùng `email` và `username`.
4. Chỉ cập nhật các trường self-service được phép.

### 1.3 Đặt lại mật khẩu

- **Endpoint**: `POST /api/v1/auth/reset-password`
- **Yêu cầu**: phải đăng nhập.

### Body mẫu

```json
{
  "old_password": "old_password123",
  "new_password": "new_password456",
  "confirm_new_password": "new_password456"
}
```

### 1.4 Người dùng tự vô hiệu hóa account của mình

- **Endpoint**: `DELETE /api/v1/user/delete-account`
- **Quyền yêu cầu**: `profile.delete`
- **Hành vi hiện tại**: soft delete bằng cách chuyển `status` sang `INACTIVE` và xóa `refresh_token`.

---

## 2. Admin Account APIs

Các API dưới đây phục vụ admin quản lý tài khoản operator/admin khác. Dù route nằm dưới `/users/accounts`, controller và use case hiện được đặt trong module **UserAuth**.

### 2.1 Admin tạo account mới

- **Endpoint**: `POST /api/v1/users/accounts`
- **Role yêu cầu**: `ADMIN`

### Body mẫu

```json
{
  "email": "operator@example.com",
  "username": "operator01",
  "password": "password123",
  "role": "OPERATOR"
}
```

### Ghi chú quyền mặc định

Nếu tạo account `OPERATOR` mà không truyền `permissions`, hệ thống sẽ gán mặc định:

```json
["profile.read", "voices.read", "voices.enroll"]
```

Tức là operator mặc định:

- xem được thông tin account của chính mình
- xem được hồ sơ giọng nói
- đăng ký giọng nói mới

Nhưng **không mặc định có quyền**:

- sửa hồ sơ account
- xóa account
- cập nhật voice
- xóa voice
- chạy identify
- xem sessions
- quản lý account khác

### 2.2 Admin lấy danh sách account

- **Endpoint**: `GET /api/v1/users/accounts`
- **Role yêu cầu**: `ADMIN`

### Query hỗ trợ

| Query        | Kiểu                                  | Bắt buộc | Mô tả                               |
| :----------- | :------------------------------------ | :------- | :---------------------------------- |
| `page`       | `number`                              | Không    | Trang hiện tại, mặc định `1`        |
| `page_size`  | `number`                              | Không    | Số bản ghi mỗi trang, mặc định `10` |
| `search`     | `string`                              | Không    | Tìm theo `email` hoặc `username`    |
| `role`       | `ADMIN \| OPERATOR`                   | Không    | Lọc theo role                       |
| `status`     | `ACTIVE \| INACTIVE`                  | Không    | Lọc theo trạng thái                 |
| `sort_by`    | `email \| username \| role \| status` | Không    | Trường sắp xếp, mặc định `email`    |
| `sort_order` | `asc \| desc`                         | Không    | Chiều sắp xếp, mặc định `asc`       |

### Ví dụ request

```http
GET /api/v1/users/accounts?page=1&page_size=10&search=operator&role=OPERATOR&status=ACTIVE&sort_by=email&sort_order=asc
```

### Response mẫu

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách tài khoản thành công",
  "data": {
    "items": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "email": "operator@example.com",
        "username": "operator01",
        "role": "OPERATOR",
        "status": "ACTIVE",
        "permissions": ["profile.read", "voices.read", "voices.enroll"]
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

### 2.3 Admin lấy chi tiết một account

- **Endpoint**: `GET /api/v1/users/accounts/:id`
- **Role yêu cầu**: `ADMIN`

### 2.4 Admin cập nhật account của người khác

- **Endpoint**: `PATCH /api/v1/users/accounts/:id/account`
- **Role yêu cầu**: `ADMIN`

### Body mẫu

```json
{
  "email": "operator.updated@example.com",
  "username": "operator-updated",
  "password": "newPassword123",
  "role": "OPERATOR",
  "status": "ACTIVE",
  "permissions": ["profile.read", "voices.read", "voices.enroll"]
}
```

### Admin có thể cập nhật

- `email`
- `username`
- `password`
- `role`
- `status`
- `permissions`

Nếu gửi `permissions: []` cho `OPERATOR`, hệ thống sẽ reset về bộ quyền mặc định của operator.

---

## 3. Phân tách trách nhiệm giữa User và Admin

| Chức năng               | User tự làm | Admin làm cho người khác |
| :---------------------- | :---------- | :----------------------- |
| Xem account             | Có          | Có                       |
| Sửa email/username      | Có          | Có                       |
| Đổi password            | Qua reset   | Có thể set lại trực tiếp |
| Đổi role                | Không       | Có                       |
| Đổi status              | Không       | Có                       |
| Đổi permissions         | Không       | Có                       |
| Xóa/vô hiệu hóa account | Có          | Chưa có API riêng        |

---

## 4. Các lỗi thường gặp

- **400 Bad Request**: Email hoặc username đã tồn tại.
- **401 Unauthorized**: Thiếu token hoặc token hết hạn.
- **403 Forbidden**: Không đủ quyền hoặc không phải admin.
- **404 Not Found**: Account không tồn tại.

---

## 5. Ghi chú cho Frontend

- FE nên tách rõ màn hình **My Account** và **Admin Account Management**.
- Không hiển thị form `role`, `status`, `permissions` ở màn hình self account.
- Với operator mới tạo mà không truyền `permissions`, FE có thể hiển thị mặc định:
  - `profile.read`
  - `voices.read`
  - `voices.enroll`
