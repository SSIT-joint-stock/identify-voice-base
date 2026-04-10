# API: Danh sách phiên nhận dạng (History List)

Tài liệu này hướng dẫn chi tiết cách sử dụng API để truy vấn và quản lý lịch sử các phiên nhận dạng giọng nói trong hệ thống. Hệ thống hỗ trợ khả năng lọc mạnh mẽ theo thời gian, loại phiên và thông tin người dùng.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/sessions`
- **Tác vụ**: Truy vấn danh sách các phiên làm việc đã hoàn thành.
- **Quyền truy cập**: `Operator`, `Admin`, `Auditor`.
- **Phạm vi dữ liệu**: Trả về thông tin tóm tắt của các phiên (Metadata) và kết quả định danh dạng rút gọn.

---

## 2. Các tham số yêu cầu (Query Parameters)

Để tối ưu hóa việc tra cứu cho các Dashboard giám sát, API hỗ trợ các bộ lọc sau:

| Tham số     | Loại       | Mặc định | Mô tả                                                                    |
| :---------- | :--------- | :------- | :----------------------------------------------------------------------- |
| `page`      | `Int`      | `1`      | Trang hiện tại.                                                          |
| `page_size` | `Int`      | `20`     | Số lượng bản ghi mỗi trang (Tối đa 100).                                 |
| `from_date` | `ISO Date` | null     | Lọc từ ngày (Ví dụ: `2026-04-01`).                                       |
| `to_date`   | `ISO Date` | null     | Lọc đến ngày (Ví dụ: `2026-04-10`).                                      |
| `type`      | `Enum`     | null     | `SINGLE` hoặc `MULTI` (Nhận dạng đơn/đa người).                          |
| `search`    | `String`   | null     | Tìm kiếm nhanh theo ID phiên hoặc Tên người dùng trong kết quả.          |
| `min_score` | `Float`    | 0.0      | Chỉ lấy các phiên có ít nhất một người đạt điểm tin cậy cao hơn mức này. |

---

## 3. Quy trình thực hiện Backend (Filtering Logic)

Hệ thống xử lý yêu cầu danh sách theo thứ tự ưu tiên:

1. **Date Range Filtering**: Backend sử dụng indexing trên trường `created_at` để đảm bảo tốc độ lọc theo ngày cực nhanh ngay cả khi database có hàng triệu dòng.
2. **Type Filtering**: Phân tách nhanh các cuộc hội thoại (Multi) và các lệnh thoại đơn lẻ (Single).
3. **Identity Search**: Đối với tham số `search`, Backend thực hiện truy vấn phức tạp trên trường JSONB `results`. Hệ thống sẽ tìm các phiên mà mảng kết quả có chứa metadata trùng khớp với từ khóa tìm kiếm.
4. **Pagination Response**: Trả về mảng dữ liệu kèm theo object `pagination` (total, total_pages) để FE vẽ điều hướng trang.

---

## 4. Cấu trúc dữ liệu phản hồi (Response Structure)

Dữ liệu trả về ở API list được giản lược tối đa để tiết kiệm băng thông.

### Ví dụ kết quả thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách phiên thành công!",
  "data": [
    {
      "id": "session-uuid-1",
      "type": "MULTI",
      "created_at": "2026-04-10T15:00:00Z",
      "summary": "Nguyễn Văn A & Khách lạ",
      "highest_score": 0.98,
      "audio_available": true
    },
    {
      "id": "session-uuid-2",
      "type": "SINGLE",
      "created_at": "2026-04-10T14:45:00Z",
      "summary": "Trần Thị B",
      "highest_score": 0.92,
      "audio_available": true
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 542,
    "total_pages": 28
  }
}
```

---

## 5. Hướng dẫn dành cho Frontend (Audit Dashboard)

Việc hiển thị danh sách phiên cần tập trung vào khả năng "Phát hiện nhanh" các vấn đề:

### 5.1 Đánh dấu điểm tin cậy (Badges)

Sử dụng cột `highest_score` để tô màu cho từng dòng:

- **Xanh**: > 0.9 (Hệ thống tự tin).
- **Cam**: 0.7 - 0.9 (Cần xem xét).
- **Đỏ**: < 0.7 (Nghi vấn giả mạo hoặc người lạ).

### 5.2 Lọc theo dải thời gian (Date Picker)

FE nên cung cấp bộ chọn ngày tháng (Range Picker) trực quan. Khi người dùng thay đổi ngày, hãy cập nhật lại URL (Query params) để người dùng có thể chia sẻ link hoặc refresh trang mà không mất bộ lọc.

### 5.3 Preview Audio

Mặc dù API list không trả về link audio trực tiếp cho từng dòng (để bảo mật), FE có thể hiển thị biểu tượng "Có âm thanh" dựa trên trường `audio_available`. Thao tác nghe chỉ nên được thực hiện sau khi vào trang **[Chi tiết phiên](./get-session-detail.md)**.

---

## 6. Xử lý lỗi & Hiệu năng

- **Lưu ý hiệu năng**: Khi database quá lớn, việc tìm kiếm theo `search` trên trường JSON có thể chậm hơn bình thường. Backend khuyến nghị Operator luôn kết hợp `search` với một khoảng thời gian (`from_date`, `to_date`) để thu hẹp vùng tìm kiếm.
- **400 Bad Request**: Thường do định dạng ngày tháng không đúng chuẩn ISO 8601.
- **Empty State**: Khi không có kết quả, FE nên hiển thị các gợi ý lọc (Vd: "Thử tăng khoảng thời gian" hoặc "Xóa bộ lọc tên").

---

## 7. Integrity & Snapshot Management

Mọi dữ liệu hiển thị trong danh sách này là phiên bản tại thời điểm diễn ra phiên nhận dạng. Điều này đảm bảo rằng các báo cáo cuối tháng của Operator sẽ luôn khớp với những gì họ đã nhìn thấy vào thời điểm thực hiện thao tác.

---

> [!TIP]
> Sử dụng bộ lọc `min_score` kết hợp với `type=MULTI` là cách tốt nhất để tìm kiếm các cuộc hội thoại quan trọng của những người dùng VIP đã đăng ký trong hệ thống.

---

> **Tài liệu tham khảo khác:**
>
> - [Chi tiết phiên & Đối soát danh tính](./get-session-detail.md)
> - [Trích xuất âm thanh Speaker](./speaker-audio.md)
