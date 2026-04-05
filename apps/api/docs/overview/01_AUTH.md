# 01 — Auth Module (UC00)

> **Last updated:** 2026-04-05
> **Related use cases:** UC00
> **Module path:** `src/module/auth/`

---

## Tổng quan

Module xác thực quản lý danh tính operator (người vận hành hệ thống). Sử dụng chiến lược **JWT với access token ngắn hạn + refresh token dài hạn**.

- **Access token:** hết hạn sau 15 phút — gửi trong `Authorization` header mỗi request
- **Refresh token:** hết hạn sau 7 ngày — lưu trong DB (`auth_accounts.refresh_token`) hoặc Redis, dùng để cấp lại access token mà không cần đăng nhập lại

**NestJS implementation:**

```typescript
// Guard áp dụng globally
JwtAuthGuard extends AuthGuard('jwt')  // passport-jwt strategy

// Strategy
JwtStrategy extends PassportStrategy(Strategy)
  // validate payload: { sub: accountId, username, role }
  // inject vào request.user
```

---

## POST /api/auth/login

### Mô tả

Xác thực tài khoản operator bằng username/password. Trả về access token và refresh token.

### Request

```
POST /api/auth/login
Content-Type: application/json
```

**Body schema:**

```typescript
interface LoginDto {
  email: string; // required — email đăng nhập
  password: string; // required — mật khẩu plain text (≥ 6 ký tự)
}
```

**Example body:**

```json
{
  "username": "admin",
  "password": "securepassword123"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepassword123"}'
```

### Response thành công — 200 OK

```typescript
interface LoginResponse {
  statusCode: 200;
  message: string;
  data: {
    access_token: string; // JWT — hết hạn sau 15 phút
    refresh_token: string; // JWT — hết hạn sau 7 ngày
    expires_in: number; // giây: 900
    account: {
      id: string; // UUID — từ DB
      username: string;
      role: 'ADMIN';
    };
  };
}
```

**Example response:**

```json
{
  "statusCode": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "account": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

### Response lỗi

| Status                      | Code                  | Điều kiện                             |
| --------------------------- | --------------------- | ------------------------------------- |
| `400 Bad Request`           | `VALIDATION_ERROR`    | Body thiếu `email` hoặc `password`    |
| `401 Unauthorized`          | `INVALID_CREDENTIALS` | Email không tồn tại hoặc password sai |
| `500 Internal Server Error` | `INTERNAL_ERROR`      | Lỗi DB hoặc JWT signing               |

**Example 401:**

```json
{
  "statusCode": 401,
  "message": "Sai username hoặc mật khẩu",
  "error": "Unauthorized"
}
```

### Business Logic

```
1. Nhận LoginDto từ controller
2. query: SELECT * FROM auth_accounts WHERE email = $1
3. Nếu không tìm thấy → 401
4. bcrypt.compare(dto.password, account.password)
5. Nếu không khớp → 401
6. Ký access_token: jwt.sign({ sub: id, username, role }, SECRET, { expiresIn: '15m' })
7. Ký refresh_token: jwt.sign({ sub: id }, REFRESH_SECRET, { expiresIn: '7d' })
8. UPDATE auth_accounts SET refresh_token = hash(refresh_token) WHERE id = $1
   (lưu hash để không expose plain token trong DB)
9. Trả 200 kèm cả hai token
```

---

## POST /api/auth/refresh

### Mô tả

Dùng refresh token trong **HTTP-only Cookie** để cấp lại access token mới. Không cần đăng nhập lại.

### Request

```
POST /api/auth/refresh
Content-Type: application/json
```

**Request uses cookies:**

- Cookie: `refresh_token=<token>`

No body required.

**cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b "refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```typescript
interface RefreshResponse {
  statusCode: 200;
  message: string;
  data: {
    access_token: string; // JWT mới — hết hạn sau 15 phút
    expires_in: number; // 900
  };
}
```

**Example response:**

```json
{
  "statusCode": 200,
  "message": "Token được làm mới thành công",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

### Response lỗi

| Status             | Code                | Điều kiện                                           |
| ------------------ | ------------------- | --------------------------------------------------- |
| `400 Bad Request`  | `VALIDATION_ERROR`  | Body thiếu `refresh_token`                          |
| `401 Unauthorized` | `INVALID_TOKEN`     | Token hết hạn, sai chữ ký, hoặc đã bị invalidate    |
| `404 Not Found`    | `ACCOUNT_NOT_FOUND` | `sub` trong token không matching bất kỳ account nào |

### Business Logic

```
1. Lấy refresh_token từ `req.cookies`
2. jwt.verify(refresh_token, REFRESH_SECRET) → giải mã payload { sub }
2. Nếu verify thất bại (hết hạn/sai chữ ký) → 401
3. SELECT * FROM auth_accounts WHERE id = sub
4. So sánh bcrypt.compare(refresh_token, stored_refresh_token_hash)
5. Nếu không khớp (đã logout hoặc bị invalidate) → 401
6. Ký access_token mới → trả 200
```

---

## POST /api/auth/logout

### Mô tả

Vô hiệu hóa refresh token của tài khoản hiện tại. Client phải xóa cả hai token khỏi bộ nhớ cục bộ.

### Request

```
POST /api/auth/logout
Authorization: Bearer <access_token>
```

> Không có request body. Thông tin account lấy từ JWT payload qua `JwtAuthGuard`.

**cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```json
{
  "statusCode": 200,
  "message": "Đăng xuất thành công",
  "data": null
}
```

### Response lỗi

| Status             | Điều kiện                       |
| ------------------ | ------------------------------- |
| `401 Unauthorized` | Access token thiếu hoặc hết hạn |

### Business Logic

```
1. JwtAuthGuard xác thực access token → inject request.user.id
2. Xóa cookie `refresh_token`
3. UPDATE auth_accounts SET refresh_token = NULL WHERE id = $1
3. Trả 200 — kể từ lúc này refresh_token cũ không dùng được nữa
```

---

## POST /api/auth/reset-password

### Mô tả

Đổi mật khẩu cho tài khoản đang đăng nhập. Yêu cầu xác minh mật khẩu cũ.

### Request

```
POST /api/auth/reset-password
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body schema:**

```typescript
interface ResetPasswordDto {
  old_password: string; // required — mật khẩu hiện tại
  new_password: string; // required — mật khẩu mới (≥ 6 ký tự)
  confirm_new_password: string; // required — khớp với new_password
}
```

**Example body:**

```json
{
  "old_password": "securepassword123",
  "new_password": "newpassword456",
  "confirm_new_password": "newpassword456"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"old_password":"securepassword123","new_password":"newpassword456","confirm_new_password":"newpassword456"}'
```

### Response thành công — 200 OK

```json
{
  "statusCode": 200,
  "message": "Mật khẩu đã được thay đổi thành công",
  "data": null
}
```

### Response lỗi

| Status             | Điều kiện                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| `400 Bad Request`  | Thiếu field, `new_password` < 6 ký tự, hoặc `new_password` trùng `old_password` |
| `401 Unauthorized` | Access token thiếu/hết hạn                                                      |
| `403 Forbidden`    | `old_password` không đúng                                                       |

**Example 403:**

```json
{
  "statusCode": 403,
  "message": "Mật khẩu cũ không chính xác",
  "error": "Forbidden"
}
```

### Business Logic

```
1. JwtAuthGuard → request.user.id
2. SELECT password FROM auth_accounts WHERE id = $1
3. bcrypt.compare(dto.old_password, stored_hash)
4. Nếu không khớp → 403
5. Nếu dto.new_password === dto.old_password → 400
6. newHash = await bcrypt.hash(dto.new_password, 10)
7. UPDATE auth_accounts SET password = newHash, refresh_token = NULL
   (logout tất cả session bằng cách invalidate refresh token)
8. Trả 200
```

---

## DTOs và Implementation

```typescript
// login-user.dto.ts
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

// reset-password.dto.ts
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  new_password: string;

  @IsString()
  @IsNotEmpty()
  @Match('new_password')
  confirm_new_password: string;
}

// JWT Payload
interface JwtPayload {
  sub: string; // account UUID — từ DB, do Backend sinh khi tạo tài khoản
  username: string;
  role: Role;
  iat: number; // issued at — sinh tự động bởi jsonwebtoken
  exp: number; // expires at — sinh tự động bởi jsonwebtoken
}
```

**Nguồn gốc dữ liệu:**

- `id` (account UUID): **Backend** sinh khi tạo tài khoản (`@default(uuid())` trong Prisma)
- `access_token`, `refresh_token`: **Backend** ký bằng JWT secret
- `expires_in`: **Backend** tính toán và trả về (giá trị cố định 900)
