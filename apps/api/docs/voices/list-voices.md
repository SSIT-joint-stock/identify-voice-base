# API: Danh sách hồ sơ giọng nói (Business Truth)

Tài liệu này hướng dẫn chi tiết cách sử dụng API để truy vấn danh sách người dùng đã được định danh chính thức trong hệ thống. Hệ thống chỉ trả về các bản ghi có trạng thái **Active**.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/voices`
- **Tác vụ**: Truy vấn danh sách người dùng (Users) kết kèm theo thông tin Voice Record hiện hành.
- **Quyền truy cập**: `Operator`, `Admin` (Cần Bearer Token).
- **Phạm vi dữ liệu**: Chế độ Business Truth — Chỉ trả về các bản ghi có `is_active: true`.

---

## 2. Request Parameters (Query String)

API được thiết kế để hỗ trợ tra cứu linh hoạt cho các giao diện bảng dữ liệu (Data Table) phức tạp trên Frontend.

| Tham số      | Loại dữ liệu | Mặc định | Mô tả                                                                                    |
| :----------- | :----------- | :------- | :--------------------------------------------------------------------------------------- |
| `page`       | `Int`        | `1`      | Số trang cần lấy (bắt đầu từ 1).                                                         |
| `page_size`  | `Int`        | `10`     | Số lượng bản ghi trên mỗi trang. Giới hạn tối thiểu: 1, tối đa: 100.                     |
| `search`     | `String`     | `null`   | Chuỗi tìm kiếm tự do. Hệ thống sẽ thực hiện tìm kiếm mờ (Partial Match) theo logic `OR`. |
| `sort_by`    | `Enum`       | `name`   | Trường dùng để sắp xếp kết quả: `name` hoặc `enrolled_at`.                               |
| `sort_order` | `Enum`       | `asc`    | Thứ tự sắp xếp: `asc` (Tăng dần) hoặc `desc` (Giảm dần).                                 |

### Chi tiết logic `search`:

Khi tham số `search` được cung cấp, Backend sẽ thực hiện lọc đồng thời trên các trường thông tin:

- **Họ tên**: `users.name`
- **Số điện thoại**: `users.phone_number`
- **Số định danh (CCCD)**: `users.citizen_identification`
- **Nghề nghiệp**: `users.job`
- **Quê quán**: `users.hometown`
- **Số hộ chiếu**: `users.passport`
- **Tiền án tiền sự**: `users.criminal_record[n].case` bằng Prisma JSON filter `string_contains`; `users.criminal_record[n].year` khi `search` là số nguyên.
- **Tuổi**: `users.age` khi `search` là số nguyên.
- **Giới tính**: `users.gender` với giá trị enum `MALE`, `FEMALE`, `OTHER`.

_Lưu ý: Các trường text tìm kiếm không phân biệt hoa thường (Case-insensitive). Riêng `criminal_record` là JSONB nên backend search qua Prisma JSON `path`, phụ thuộc cách PostgreSQL/Prisma xử lý JSON và không hỗ trợ bỏ dấu tiếng Việt._

---

## 3. Workflow Frontend (Tích hợp UI)

Để mang lại trải nghiệm tốt nhất cho người vận hành, quy trình tích hợp được khuyến nghị như sau:

### 3.1 Khởi tạo Dashboard

Khi người dùng truy cập trang danh sách hồ sơ, FE gọi API với `page=1&page_size=10`.

### 3.2 Debounced Search

Khi người dùng nhập vào ô tìm kiếm, không nên gọi API ngay lập tức. Hãy thực hiện **Debounce** ít nhất 500ms để giảm tải cho Database và AI Service.

### 3.3 Trạng thái trống (Empty State)

Nếu kết quả `total` trả về bằng 0, FE nên hiển thị giao diện "Không tìm thấy hồ sơ nào phù hợp" kèm theo nút "Xóa bộ lọc" thay vì bảng trống.

---

## 4. Cấu trúc dữ liệu phản hồi (Response Structure)

Hệ thống tuân thủ chuẩn `SuccessResponse` với đầy đủ metadata về phân trang.

### Ví dụ kết quả thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách giọng nói thành công!",
  "data": [
    {
      "id": "e4f8a123-...",
      "name": "Nguyễn Văn A",
      "phone_number": "0912345678",
      "citizen_identification": "012345678901",
      "passport": "B1234567",
      "hometown": "Hà Nội",
      "age": 30,
      "gender": "MALE",
      "job": "Kỹ sư phần mềm",
      "criminal_record": [],
      "audio_url": "http://localhost:3000/api/v1/sessions/.../audio",
      "enrolled_at": "2026-04-05T10:00:00.000Z"
    },
    {
      "id": "f5g9b456-...",
      "name": "Trần Thị B",
      "phone_number": "0987654321",
      "citizen_identification": "023456789012",
      "passport": null,
      "hometown": "Đà Nẵng",
      "age": 28,
      "gender": "FEMALE",
      "job": "Kế toán",
      "criminal_record": [],
      "audio_url": "http://localhost:3000/api/v1/sessions/.../audio",
      "enrolled_at": "2026-04-06T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 2,
    "total_pages": 1
  }
}
```

---

## 5. Các trường thông tin quan trọng

- **`id`**: Đây là UUID của User, đồng thời cũng là `voice_id` được dùng để định danh trong Vector Database.
- **`age`**: Tuổi người được định danh. Trường này có thể được dùng để tìm kiếm chính xác nếu `search` là số.
- **`gender`**: Giới tính người được định danh. Giá trị enum gồm `MALE`, `FEMALE`, `OTHER`.
- **`audio_url`**: Đây không phải là đường dẫn file tĩnh. Đây là URL đến endpoint streaming của hệ thống Sessions. FE nên sử dụng thẻ `<audio>` để phát trực tiếp.
- **`enrolled_at`**: Thời điểm người dùng thực hiện đăng ký giọng nói đầu tiên.

---

## 6. Xử lý lỗi (Error Handling)

Hệ thống có thể trả về các lỗi sau:

- **401 Unauthorized**: Token xác thực không hợp lệ hoặc đã hết hạn. Yêu cầu đăng nhập lại.
- **400 Bad Request**: Các tham số `page` hoặc `page_size` không đúng định dạng số hoặc nằm ngoài phạm vi cho phép.
- **500 Internal Server Error**: Lỗi kết nối giữa Backend và PostgreSQL.

---

## 7. Lưu ý nghiệp vụ nâng cao

### 7.1 Lọc Active hồ sơ

API này **mặc định** đã ẩn các hồ sơ bị `deactivated`. Không có tham số query nào cho phép xem hồ sơ đã bị vô hiệu hóa tại đây. Nếu cần xem hồ sơ lưu trữ, Operator phải sử dụng chức năng "Search Archive" chuyên biệt dành cho Admin.

### 7.2 Hiệu năng

Đối với các hệ thống có hàng triệu hồ sơ, việc tìm kiếm theo chuỗi (`search`) có thể chậm lại. Backend đã thực hiện Index các trường `name`, `phone_number` và `citizen_identification`; các trường mở rộng như `job`, `hometown`, `passport`, `age`, `gender` và `criminal_record` phục vụ tra cứu linh hoạt và cần được theo dõi hiệu năng khi dữ liệu lớn. Riêng `criminal_record` là JSONB nên backend tìm bằng Prisma JSON `path` trên các phần tử trong mảng.

### 7.3 Bảo mật dữ liệu

API danh sách hiện trả về metadata hồ sơ mở rộng gồm `passport`, `hometown`, `age`, `gender`, `job` và `criminal_record` để phục vụ màn hình danh bạ giọng nói. FE cần áp dụng phân quyền hiển thị phù hợp với dữ liệu nhạy cảm.

---
