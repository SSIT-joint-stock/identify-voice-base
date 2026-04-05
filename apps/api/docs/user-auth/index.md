# User Management API Routes (User-Auth)

Các API này dùng để quản lý thông tin tài khoản cá nhân. Tất cả yêu cầu người dùng phải đăng nhập.

## 1. Lấy thông tin cá nhân (Get Me)

### 1.1 Mô tả

| **Thuộc tính** | **Giá trị**                   |
| -------------- | ----------------------------- |
| Request URL    | `/user/me`                    |
| Request Method | GET                           |
| Request Header | Authorization: Bearer <token> |

### 1.2 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "ADMIN",
    "status": "ACTIVE"
  },
  "message": "Lấy thông tin thành công"
}
```

---

## 2. Cập nhật thông tin cá nhân (Update Info)

### 2.1 Mô tả

| **Thuộc tính** | **Giá trị**                   |
| -------------- | ----------------------------- |
| Request URL    | `/user/update-info`           |
| Request Method | PATCH                         |
| Request Header | Authorization: Bearer <token> |
| Body data      | JSON schema bên dưới          |

**JSON Schema:**

```json
{
  "email": "string",
  "username": "string"
}
```

### 2.2 Dữ liệu đầu vào

| **Tên trường** | **Kiểu** | **Bắt buộc** | **Ghi chú**       |
| -------------- | -------- | ------------ | ----------------- |
| email          | string   |              | Email mới         |
| username       | string   |              | Tên đăng nhập mới |

---

## 3. Xóa tài khoản (Delete Account)

> [!CAUTION]
> API này thực hiện "Soft-delete". Tài khoản sẽ bị chuyển sang trạng thái `INACTIVE` và không thể đăng nhập được nữa.

### 3.1 Mô tả

| **Thuộc tính** | **Giá trị**                   |
| -------------- | ----------------------------- |
| Request URL    | `/user/delete-account`        |
| Request Method | DELETE                        |
| Request Header | Authorization: Bearer <token> |

### 3.2 Dữ liệu đầu ra

**Success Response (200):**

```json
{
  "success": true,
  "message": "Xóa tài khoản thành công"
}
```
