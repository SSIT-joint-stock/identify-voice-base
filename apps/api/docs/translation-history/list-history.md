# API: Danh sách & thống kê lịch sử dịch

API này trả về danh sách bản dịch đã ghi nhận, kèm thống kê tổng quan để phục vụ màn **Thống kê bản dịch** của Admin.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/translate/history`
- **Tác vụ**: Lấy lịch sử dịch và thống kê theo bộ lọc.
- **Quyền truy cập**: `ADMIN`.
- **Auth**: Bearer Token bắt buộc.
- **Sắp xếp**: mới nhất trước, theo `created_at desc`.

```http
GET /api/v1/translate/history?page=1&page_size=10&target_lang=en
Authorization: Bearer <access_token>
```

---

## 2. Query Parameters

| Tham số       | Loại dữ liệu     | Mặc định | Mô tả                                                          |
| :------------ | :--------------- | :------- | :------------------------------------------------------------- |
| `page`        | `Int`            | `1`      | Số trang cần lấy, bắt đầu từ 1.                                |
| `page_size`   | `10 \| 25 \| 50` | `10`     | Số bản ghi trên mỗi trang.                                     |
| `from_date`   | `String`         | `null`   | Lọc từ ngày, định dạng khuyến nghị `YYYY-MM-DD`.               |
| `to_date`     | `String`         | `null`   | Lọc đến ngày, định dạng khuyến nghị `YYYY-MM-DD`.              |
| `source_lang` | `String`         | `null`   | Lọc theo ngôn ngữ nguồn, ví dụ `vi`, `en`; bỏ trống là tất cả. |
| `target_lang` | `String`         | `null`   | Lọc theo ngôn ngữ đích, ví dụ `en`, `vi`; bỏ trống là tất cả.  |

### Lưu ý về lọc ngày

Backend hiện parse trực tiếp `from_date` và `to_date` bằng `new Date(value)`:

- `from_date` được dùng làm `created_at >= from_date`.
- `to_date` được dùng làm `created_at <= to_date`.

Với chuỗi `YYYY-MM-DD`, mốc `to_date` có thể là đầu ngày tùy runtime. Nếu FE muốn bao trọn một ngày kết thúc, nên gửi giá trị datetime cuối ngày hoặc backend cần bổ sung normalize trong use case sau.

---

## 3. Response thành công

Response được bọc bởi response interceptor chung:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2f2f2f2f-1111-4444-8888-aaaaaaaaaaaa",
        "user_id": "9a9a9a9a-2222-4444-8888-bbbbbbbbbbbb",
        "source_text": "Xin chào, tôi cần dịch nội dung này.",
        "translated_text": "Hello, I need to translate this content.",
        "source_lang": "vi",
        "target_lang": "en",
        "mode": "TRANSLATE",
        "created_at": "2026-05-02T05:30:00.000Z",
        "operator": {
          "id": "9a9a9a9a-2222-4444-8888-bbbbbbbbbbbb",
          "email": "admin@example.com",
          "username": "admin",
          "role": "ADMIN"
        }
      }
    ],
    "stats": {
      "total": 1,
      "today_count": 1,
      "by_target_lang": [
        {
          "target_lang": "en",
          "count": 1
        }
      ],
      "by_mode": [
        {
          "mode": "TRANSLATE",
          "count": 1
        }
      ]
    },
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 1,
      "total_pages": 1
    }
  },
  "message": "Lấy lịch sử dịch thành công",
  "meta": {
    "timestamp": "2026-05-02T05:30:01.000Z",
    "version": "v1",
    "requestId": "..."
  }
}
```

---

## 4. Cấu trúc dữ liệu

### 4.1 `items[]`

| Trường            | Loại dữ liệu             | Mô tả                                        |
| :---------------- | :----------------------- | :------------------------------------------- |
| `id`              | `UUID`                   | ID record lịch sử dịch.                      |
| `user_id`         | `UUID`                   | ID tài khoản đã thực hiện dịch.              |
| `source_text`     | `String`                 | Văn bản gốc.                                 |
| `translated_text` | `String`                 | Kết quả dịch hoặc dịch tóm tắt.              |
| `source_lang`     | `String \| null`         | Ngôn ngữ nguồn; có thể null khi auto detect. |
| `target_lang`     | `String`                 | Ngôn ngữ đích.                               |
| `mode`            | `TRANSLATE \| SUMMARIZE` | Chế độ dịch.                                 |
| `created_at`      | `ISO Date String`        | Thời điểm ghi nhận record.                   |
| `operator`        | `Object`                 | Tài khoản thực hiện dịch.                    |

### 4.2 `stats`

| Trường           | Loại dữ liệu | Mô tả                                                           |
| :--------------- | :----------- | :-------------------------------------------------------------- |
| `total`          | `Number`     | Tổng số bản ghi khớp bộ lọc hiện tại.                           |
| `today_count`    | `Number`     | Số bản ghi trong ngày hiện tại, có áp dụng lọc ngôn ngữ nếu có. |
| `by_target_lang` | `Array`      | Số bản ghi theo từng ngôn ngữ đích trong bộ lọc hiện tại.       |
| `by_mode`        | `Array`      | Số bản ghi theo chế độ `TRANSLATE` hoặc `SUMMARIZE`.            |

### 4.3 `pagination`

| Trường        | Loại dữ liệu | Mô tả                        |
| :------------ | :----------- | :--------------------------- |
| `page`        | `Number`     | Trang hiện tại.              |
| `page_size`   | `Number`     | Số bản ghi mỗi trang.        |
| `total`       | `Number`     | Tổng số bản ghi khớp bộ lọc. |
| `total_pages` | `Number`     | Tổng số trang.               |

---

## 5. Gợi ý tích hợp Frontend

Màn Admin nên có các phần sau:

- Bộ lọc ngày bắt đầu, ngày kết thúc, ngôn ngữ nguồn và ngôn ngữ đích.
- Thẻ thống kê tổng số lượt dịch, số lượt hôm nay, phân bố theo ngôn ngữ đích và chế độ dịch.
- Bảng lịch sử gồm thời gian, người dịch, ngôn ngữ, chế độ, preview nội dung và hành động.
- Dialog chi tiết hiển thị hai khung cạnh nhau:
  - **Văn bản gốc** với nút copy nội dung nguồn.
  - **Bản dịch** với nút copy nội dung dịch.
- Empty state rõ ràng khi không có bản dịch phù hợp.

FE hiện dùng API client:

```ts
translateApi.getTranslationHistory({
  page: 1,
  page_size: 10,
  from_date: '2026-05-01',
  to_date: '2026-05-02',
  target_lang: 'en',
});
```

---

## 6. Xử lý lỗi

| HTTP Status | Trường hợp                                           | Hướng xử lý FE                                      |
| :---------- | :--------------------------------------------------- | :-------------------------------------------------- |
| `401`       | Token hết hạn hoặc không hợp lệ.                     | Điều hướng đăng nhập lại hoặc refresh token.        |
| `403`       | User không phải Admin.                               | Ẩn menu Admin và hiển thị thông báo không đủ quyền. |
| `400`       | Query params sai kiểu, ví dụ `page_size` ngoài enum. | Validate filter trước khi gọi API.                  |
| `500`       | Lỗi truy vấn database hoặc lỗi hệ thống.             | Hiển thị error state và cho phép refresh.           |
