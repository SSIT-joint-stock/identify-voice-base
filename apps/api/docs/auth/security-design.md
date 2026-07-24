# Cấu trúc bảo mật hệ thống

## Xác thực

- Access token được gửi bằng header `Authorization: Bearer <token>`.
- Refresh token được lưu trong HttpOnly cookie và hash tương ứng được lưu trong
  database.
- Mật khẩu được băm bằng bcrypt; số vòng băm lấy từ `BCRYPT_ROUNDS`.
- Secret và thời hạn token được cấu hình bằng biến môi trường, không ghi trực tiếp
  trong source production.

## Phân quyền

Request nghiệp vụ đi qua `JwtAuthGuard`. Các endpoint cần quyền chi tiết sử dụng thêm
`PermissionsGuard` và decorator `@Permissions`.

Hệ thống kết hợp:

- Role: `ADMIN`, `OPERATOR`.
- Permission: tập quyền lưu trong `auth_accounts.permissions`.
- Kiểm tra owner đối với dữ liệu chỉ thuộc một tài khoản.

Danh sách permission và route áp dụng được mô tả tại
[Permission Matrix](../permissions/index.md).

## Cookie và trình duyệt

Production phải sử dụng HTTPS và cấu hình phù hợp:

- `COOKIE_SECURE=true`.
- `COOKIE_HTTP_ONLY=true`.
- `COOKIE_DOMAIN` đúng domain triển khai.
- `CORS_ORIGINS` chỉ chứa origin được phép.
- Client gửi credential cho luồng refresh/logout.

## Bảo vệ dữ liệu nhạy cảm

- Không log token, cookie, mật khẩu hoặc secret.
- Exception không xác định chỉ trả thông báo tổng quát cho client; stack trace chỉ lưu
  trong log server.
- Không commit `.env.development` hoặc `.env.production`.
- Thay toàn bộ secret mẫu trước khi chạy production.

Xem thêm: [Đăng nhập và token](./login-tokens.md).
