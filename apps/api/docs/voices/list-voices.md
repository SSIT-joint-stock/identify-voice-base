# List Voices — GET /api/voices

Lấy danh sách hồ sơ giọng nói kèm phân trang và tìm kiếm. Endpoint này chỉ trả về các bản ghi đang hoạt động (active) của mỗi người dùng.

## Request

```http
GET /api/voices?page=1&page_size=10&search=Nguyễn
Authorization: Bearer <access_token>
```

### Query Parameters

| Param       | Type     | Default | Mô tả                                                               |
| ----------- | -------- | ------- | ------------------------------------------------------------------- |
| `page`      | `number` | `1`     | Số trang (bắt đầu từ 1)                                             |
| `page_size` | `number` | `10`    | Kích thước trang: `10` \| `25` \| `50`                              |
| `search`    | `string` | —       | Tìm kiếm theo `name`, `citizen_identification`, hoặc `phone_number` |

### Example cURL

```bash
curl "http://localhost:3000/api/voices?page=1&page_size=10&search=Nguyễn" \
  -H "Authorization: Bearer <access_token>"
```

## Response

### Success (200 OK)

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách giọng nói thành công!",
  "data": {
    "items": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "audio_url": "http://localhost:3000/cdn/voices/abc123.wav",
        "is_active": true,
        "version": 2,
        "enrolled_at": "2026-04-05T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 42,
      "total_pages": 5
    }
  }
}
```

## Business Logic

Hệ thống lọc các bản ghi trong bảng `voice_records` dựa trên tham số `search`. Việc tìm kiếm được thực hiện trên các trường thông tin định danh của người dùng (name, CCCD, phone).

> [!NOTE]
> Danh sách luôn trả về bản ghi `is_active = true`. Để xem lịch sử các phiên bản giọng nói cũ, vui lòng sử dụng endpoint [Get Voice Detail](./get-voice.md).
