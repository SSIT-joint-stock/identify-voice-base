# Get Voice Detail — GET /api/voices/:id

Lấy chi tiết đầy đủ một hồ sơ giọng nói, bao gồm thông tin cá nhân, lịch sử các phiên bản giọng nói và lịch sử nhận dạng gần đây.

## Request

```http
GET /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
```

### Path Parameters

| Param | Type     | Mô tả                         |
| ----- | -------- | ----------------------------- |
| `id`  | `string` | UUID của người dùng (User ID) |

### Example cURL

```bash
curl "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer <access_token>"
```

## Response

### Success (200 OK)

```json
{
  "statusCode": 200,
  "message": "Lấy chi tiết giọng nói thành công!",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Nguyễn Văn A",
    "citizen_identification": "012345678901",
    "phone_number": "0912345678",
    "hometown": "Hà Nội",
    "job": "Kỹ sư",
    "criminal_record": [],
    "audio_url": "http://localhost:3000/cdn/voices/abc123.wav",
    "is_active": true,
    "version": 2,
    "enrolled_at": "2026-04-05T10:00:00.000Z",
    "voice_history": [
      {
        "version": 1,
        "audio_url": "http://localhost:3000/cdn/voices/abc000.wav",
        "is_active": false,
        "created_at": "2026-03-01T08:00:00.000Z"
      }
    ],
    "identify_history": [
      {
        "session_id": "uuid-xxx",
        "identified_at": "2026-04-04T14:00:00.000Z",
        "score": 0.94
      }
    ]
  }
}
```

## Business Logic

1.  **Lấy thông tin User:** Truy vấn bảng `users` kèm theo danh sách `voice_records` liên quan, sắp xếp theo phiên bản mới nhất.
2.  **Lịch sử nhận dạng:** Truy vấn 5 phiên nhận dạng gần nhất trong bảng `identify_sessions` mà kết quả có chứa `voice_id` này.
3.  **Dữ liệu làm giàu:** Thông tin cá nhân được lấy từ database (Business Truth), đảm bảo tính nhất quán ngay cả khi embedding AI thay đổi.

> [!TIP]
> Nếu file audio không còn tồn tại trên server, `audio_url` vẫn được trả về nhưng frontend nên kiểm tra tính khả dụng nếu cần thiết.
