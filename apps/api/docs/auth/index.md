# Module Quản lý Định danh & Bảo mật (Auth & Identity)

Chào mừng bạn đến với tài liệu kỹ thuật của module **Authentication**. Đây là "cửa ngõ" bảo mật của toàn bộ hệ thống, đảm bảo chỉ những người dùng có thẩm quyền mới có thể truy cập vào dữ liệu sinh trắc học và quản lý hồ sơ giọng nói.

---

## 1. Triết lý bảo mật (Security Philosophy)

Hệ thống của chúng tôi áp dụng các tiêu chuẩn bảo mật hiện đại nhất dành cho ứng dụng Enterprise, tập trung vào tính toàn vẹn và khả năng kiểm soát truy cập.

### 1.1 Xác thực đa lớp (Hybrid Authentication)

Chúng tôi sử dụng mô hình kết hợp giữa **JWT (JSON Web Token)** và **Secure Cookies**:

- **Access Token**: Được lưu trong bộ nhớ (Memory/State) của Frontend để truy cập API nhanh.
- **Refresh Token**: Được lưu trong **HttpOnly Cookie** để đảm bảo an toàn tối đa trước các cuộc tấn công XSS (Cross-Site Scripting).

### 1.2 Phân quyền dựa trên vai trò (Role-Based Access Control - RBAC)

Mọi tài khoản trong hệ thống đều được gán một `Role` cụ thể, quyết định phạm vi dữ liệu có thể xem hoặc chỉnh sửa:

- **OPERATOR**: Người vận hành trực tiếp luồng Enroll và Identify.
- **ADMIN**: Quản lý hệ thống, có quyền vô hiệu hóa hồ sơ và xem báo cáo tổng quát.
- **SECURITY_AUDITOR**: Chỉ có quyền xem (Read-only) để phục vụ mục đích thanh tra dữ liệu.

---

## 2. Danh mục tài liệu chi tiết

Module Auth được chia thành 3 phần chính để phục vụ các mục đích phát triển khác nhau:

| Tài liệu                                                 | Nội dung chính                                                                   | Đối tượng      |
| :------------------------------------------------------- | :------------------------------------------------------------------------------- | :------------- |
| **[Đăng nhập & Quản lý Token](./login-tokens.md)**       | Hướng dẫn luồng đăng nhập, cơ chế Refresh Token và chính sách Cookie.            | FE / Mobile    |
| **[Quản lý tài khoản cá nhân](./profile-management.md)** | Hướng dẫn sử dụng API `/user/me`, cập nhật thông tin và đổi mật khẩu.            | FE             |
| **[Cấu trúc bảo mật hệ thống](./security-design.md)**    | Giải thích về mã hóa mật khẩu (Bcrypt), JWT Payload và các tầng bảo vệ (Guards). | BE / DevSecOps |

---

## 3. Workflow bảo mật chuẩn (Standard Workflow)

1. **Khởi tạo**: Người dùng đăng nhập bằng Username/Password qua kênh HTTPS.
2. **Cấp phát**: Backend kiểm tra thông tin, nếu đúng sẽ sinh ra cặp Access/Refresh Token.
3. **Thực thi**: Frontend sử dụng Header `Authorization: Bearer <token>` để gửi yêu cầu tới các module nghiệp vụ (Voices, Sessions...).
4. **Duy trì**: Khi Access Token hết hạn (thường sau 15p), FE tự động sử dụng Refresh Token (trong cookie) để lấy Token mới mà không bắt người dùng đăng nhập lại.
5. **Kết thúc**: Khi người dùng nhấn Logout, hệ thống thực hiện vô hiệu hóa Refresh Token trong Database và xóa Cookie tại Client.

---

## 4. Các thực thể dữ liệu liên quan

- **Auth Accounts**: Lưu trữ thông tin đăng nhập (Email/Username, Hashed Password, Salt).
- **Refresh Tokens**: Lưu trữ danh sách các token đang hoạt động để hỗ trợ cơ chế Single Sign-On (SSO) hoặc thu hồi quyền truy cập từ xa.

---

## 5. Lưu ý dành cho Frontend

- **Cookie Management**: Vì Refresh Token nằm trong HttpOnly Cookie, FE không cần (và không thể) can thiệp vào cookie này bằng JS. Các API `/refresh` hoặc `/logout` sẽ tự động nhận và xử lý cookie này.
- **Token Storage**: Tuyệt đối không lưu Access Token vào `localStorage` vì dễ bị tấn công XSS. Hãy lưu vào một biến Global State (Redux, Vuex, hoặc biến cục bộ).
- **Interceptors**: Nên cài đặt một `Axios Interceptor` để tự động đính kèm Token vào Header và xử lý mã lỗi `401 Unauthorized` để thực hiện luồng Refresh Token một cách trong suốt (Transparently).

---

> [!CAUTION]
> Luôn sử dụng giao thức HTTPS trong môi trường Production. Việc gửi mật khẩu hoặc Token qua HTTP thường sẽ bị hệ thống chặn đứng hoặc cảnh báo nghiêm trọng.

---

> **Tài liệu tham khảo tiếp theo:** [Đăng nhập & Quản lý Token](./login-tokens.md)
