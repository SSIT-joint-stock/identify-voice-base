# Auth API Routes

# Ghi chú về Token

## ACCESS TOKEN

### - Trả về trong response, client lưu ở Authorization Header dưới dạng: `Authorization: Bearer "access_token"`

### - Thời hạn: 15 phút

### - Dùng để gọi các API cần bảo mật hay cần đăng nhập để truy cập

## REFRESH TOKEN

### - Được trả về và lưu trong HTTP-only Cookie (server set qua Set-Cookie).

### - Thời hạn: 7 ngày

### - Không nên lưu trong localStorage/sessionStorage

### - Dùng để lấy lại access token mới khi access token hết hạn

---

## 1. Đăng ký tạo tài khoản (Register)

> [!NOTE]
> Tính năng này hiện đang được triển khai. Dưới đây là đặc tả dự kiến.

### 1.1 Mô tả

| **Thuộc tính** | **Giá trị**                    |
| -------------- | ------------------------------ |
| Request URL    | `/auth/register`               |
| Request Method | POST                           |
| Request Header | Content-Type: application/json |
| Body data      | JSON schema bên dưới           |

**JSON Schema:**

```json
{
  "username": "string",
  "password": "string",
  "role": "ADMIN"
}
```

### 1.2 Dữ liệu đầu vào

| **Tên trường** | **Kiểu** | **Bắt buộc** | **Ghi chú**              |
| -------------- | -------- | ------------ | ------------------------ |
| username       | string   | ✓            | Tên người dùng, duy nhất |
| password       | string   | ✓            | Mật khẩu (>= 6 ký tự)    |
| role           | string   |              | ADMIN (mặc định)         |

### 1.3 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "meta": {
    "timestamp": "2026-04-05T04:32:19.574Z",
    "version": "v1"
  },
  "message": "Account registered successfully."
}
```

---

## 2. Đăng nhập (Login)

### 2.1 Mô tả

| **Thuộc tính** | **Giá trị**                    |
| -------------- | ------------------------------ |
| Request URL    | `/auth/login`                  |
| Request Method | POST                           |
| Request Header | Content-Type: application/json |
| Body data      | JSON schema bên dưới           |

**JSON Schema:**

```json
{
  "email": "string",
  "password": "string"
}
```

### 2.2 Dữ liệu đầu vào

| **Tên trường** | **Kiểu** | **Bắt buộc** | **Ghi chú**             |
| -------------- | -------- | ------------ | ----------------------- |
| email          | string   | ✓            | Email đăng ký tài khoản |
| password       | string   | ✓            | Mật khẩu (>= 6 ký tự)   |

### 2.3 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "meta": {
    "timestamp": "2026-04-05T05:54:42.650Z",
    "version": "v1"
  },
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "7482e592-df67-4bf0-8a90-44486182d540",
      "email": "email@gmail.com",
      "username": "username",
      "role": "ADMIN"
    }
  },
  "message": "Login successful"
}
```

**Cookies:**

- Trả về `refresh_token` qua HTTP-only cookie.

---

## 3. Làm mới Token (Refresh)

### 3.1 Mô tả

| **Thuộc tính** | **Giá trị**               |
| -------------- | ------------------------- |
| Request URL    | `/auth/refresh`           |
| Request Method | POST                      |
| Request Header | Cookie: refresh_token=... |

### 3.2 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  },
  "message": "Làm mới token thành công"
}
```

---

## 4. Đăng xuất (Logout)

### 4.1 Mô tả

| **Thuộc tính** | **Giá trị**                   |
| -------------- | ----------------------------- |
| Request URL    | `/auth/logout`                |
| Request Method | POST                          |
| Request Header | Authorization: Bearer <token> |

### 4.2 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 5. Thay đổi mật khẩu (Reset Password)

> [!IMPORTANT]
> API này yêu cầu người dùng phải đang đăng nhập (có Access Token).

### 5.1 Mô tả

| **Thuộc tính** | **Giá trị**                   |
| -------------- | ----------------------------- |
| Request URL    | `/auth/reset-password`        |
| Request Method | POST                          |
| Request Header | Authorization: Bearer <token> |
| Body data      | JSON schema bên dưới          |

**JSON Schema:**

```json
{
  "old_password": "string",
  "new_password": "string",
  "confirm_new_password": "string"
}
```

### 5.2 Dữ liệu đầu vào

| **Tên trường**       | **Kiểu** | **Bắt buộc** | **Ghi chú**                |
| -------------------- | -------- | ------------ | -------------------------- |
| old_password         | string   | ✓            | Mật khẩu hiện tại          |
| new_password         | string   | ✓            | Mật khẩu mới (>= 6 ký tự)  |
| confirm_new_password | string   | ✓            | Phải khớp với mật khẩu mới |

---

## 6. Các tính năng khác (Planned)

> [!NOTE]
> Các tính năng dưới đây nằm trong kế hoạch phát triển và chưa có trên môi trường Production.

### - Xác thực Email (Verify Email)

### - Quên mật khẩu (Forgot Password)

### - OAuth (Google Login)
