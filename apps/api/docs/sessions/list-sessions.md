# GET /api/v1/sessions

Lấy danh sách lịch sử các phiên nhận dạng giọng nói đã thực hiện trong hệ thống.

## Endpoint

- **Path:** `/api/v1/sessions`
- **Method:** `GET`
- **Auth:** Required (Bearer Token)

## Query Parameters

| Field       | Type              | Default | Description                   |
| :---------- | :---------------- | :------ | :---------------------------- |
| `page`      | `number`          | `1`     | Trang hiện tại                |
| `page_size` | `number`          | `10`    | Số bản ghi trên mỗi trang     |
| `type`      | `SINGLE \| MULTI` |         | Lọc theo loại phiên nhận diện |
| `from_date` | `string (ISO)`    |         | Lọc các phiên từ ngày này     |
| `to_date`   | `string (ISO)`    |         | Lọc các phiên đến ngày này    |

## Response

### Cấu trúc dữ liệu (200 OK)

Hệ thống trả về danh sách đã được rút gọn thông tin để tối ưu tốc độ tải.

```typescript
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "string (uuid)",
        "session_type": "SINGLE | MULTI",
        "audio_url": "string (url)",
        "identified_at": "string (iso_date)",
        "operator": {
          "id": "string",
          "username": "string"
        },
        "result_count": "number", // số lượng kết quả tìm thấy
        "top_score": "number | null" // điểm số cao nhất trong các match
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 52,
      "total_pages": 6
    }
  }
}
```

## Logic làm giàu dữ liệu (Summary Enrichment)

Tại tầng Repository, ứng dụng thực hiện các bước sau để tối ưu danh sách:

1. **Top Score Calculation:** Duyệt qua trường `results` JSONB để tìm giá trị `score` lớn nhất, giúp Frontend hiển thị độ tin cậy nhanh chóng mà không cần parse toàn bộ JSON.
2. **Audio URL:** Chuyển đổi `file_path` nội bộ thành URL truy cập được từ bên ngoài thông qua CDN URL cấu hình trong hệ thống.
