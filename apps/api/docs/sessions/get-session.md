# Get Identify Session Details

Lấy chi tiết đầy đủ 1 phiên identify, kích hoạt Lazy Enrichment để tổng hợp dữ liệu metadata.

`GET /api/v1/sessions/:id`

## Request

**Headers:**

- `Authorization: Bearer <access_token>`

**Path Parameter:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | ID của session nhận diện |

## Response

Returns a `200 OK`

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "audio_url": "http://localhost:3000/uploads/identify/conv456.wav",
    "identified_at": "2026-04-05T15:00:00.000Z",
    "operator": {
      "id": "op-uuid-here",
      "username": "admin"
    },
    "results": [
      {
        "speaker_label": "SPEAKER_00",
        "matched_voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "score": 0.91,
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "is_business_truth": true,
        "segments": [{ "start": 0.5, "end": 4.2 }]
      }
    ]
  }
}
```

**Trường `is_business_truth`:** Xác định dữ liệu định danh của speaker này là kết quả trích xuất từ bảng `users` thực tế chứa (Business Truth = true), hay chỉ là metadata bộ nhớ tạm từ `ai_identities_cache` (Business Truth = false).

## Lỗi

- **401 Unauthorized:** Token không hợp lệ.
- **404 Not Found:** Không tìm thấy session tương ứng.
