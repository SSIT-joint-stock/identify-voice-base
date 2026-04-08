# List Identify Sessions

Lấy danh sách các phiên nhận dạng đã thực hiện từ trước tới nay.

`GET /api/v1/sessions`

## Request

**Headers:**

- `Authorization: Bearer <access_token>`

**Query Parameters:**
| Param | Type | Default | Mô tả |
| ----------- | --------------------- | ------- | ------------------------------------------------- |
| `page` | `number` | `1` | Số trang |
| `page_size` | `number` | `10` | Kích thước trang |
| `from_date` | `string` | — | Từ ngày (ISO 8601 date: `2026-04-01`) |
| `to_date` | `string` | — | Đến ngày (ISO 8601 date: `2026-04-05`, inclusive) |

## Response

Returns a `200 OK`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "audio_url": "http://localhost:3000/uploads/identify/xyz789.wav",
        "identified_at": "2026-04-05T14:30:00.000Z",
        "operator": {
          "id": "op-uuid-here",
          "username": "admin"
        },
        "result_count": 5,
        "top_score": 0.94
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 28,
      "total_pages": 3
    }
  }
}
```

## Lỗi

- **401 Unauthorized** Token sai
- **400 Bad request** Thiếu/Sai param
