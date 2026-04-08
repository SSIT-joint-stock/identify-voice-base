# Identify Voice Endpoint

Endpoint duy nhất dùng để nhận dạng phát hiện danh tính qua giọng nói.

`POST /api/v1/identify`

## Request

**Headers:**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Body Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | File ghi âm cần nhận dạng. Kích thước <= 50MB. (WAV, MP3, FLAC, OGG) |
| `type` | `String` | No | Loại xử lý: `SINGLE` (1 người) hoặc `MULTI` (nhiều người). Mặc định là `MULTI`. |

## Response

Returns a `200 OK` với thông tin Metadata Raw sinh ra từ AI.

> ⚠️ Endpoint này hoàn toàn mù Business Truth, không thực hiện tạo mới User, cũng không update thông tin gì. Nó chỉ đơn thuần đẩy RAW Metadata vào bảng Cache (`ai_identities_cache`) đóng vai trò là nhận định của AI.

```json
{
  "statusCode": 200,
  "message": "Nhận dạng thành công",
  "data": {
    "session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "audio_url": "http://localhost:3000/uploads/identify/conv456.wav",
    "identified_at": "2026-04-05T15:00:00.000Z",
    "speakers": [
      {
        "speaker_label": "SPEAKER_00",
        "matched_voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "score": 0.91,
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "segments": [{ "start": 0.5, "end": 4.2 }]
      }
    ]
  }
}
```

## Error Responses

- **400 Bad Request:** Thiếu định dạng file hợp lệ.
- **401 Unauthorized:** Token hết hạn.
- **422 Unprocessable Entity:** File vượt quá giới hạn hoặc quá hội thoại tối đa 2 người.
- **500 Internal Server Error:** AI Server timeout / failed.
