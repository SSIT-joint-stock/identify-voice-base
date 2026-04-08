# POST /api/v1/identify/single

Nhận dạng 1 người nói duy nhất từ file âm thanh. Hệ thống sẽ so khớp giọng nói với cơ sở dữ liệu và trả về top kết quả phù hợp nhất.

## Endpoint

- **Path:** `/api/v1/identify/single`
- **Method:** `POST`
- **Auth:** Required (Bearer Token)
- **Content-Type:** `multipart/form-data`

## Request Body

| Field  | Type     | Description                 | Constraints                             |
| :----- | :------- | :-------------------------- | :-------------------------------------- |
| `file` | `Buffer` | File âm thanh cần nhận diện | format: `.wav`, `.mp3`, `.flac`, `.ogg` |

## Quy trình xử lý (Technical Flow)

1. **Validation:** Kiểm tra định dạng file, kích thước (max 50MB) và thời lượng (max 10 phút).
2. **AI Core Identification:** Gửi file sang AI Service (`POST /identify_voice/`).
3. **Lazy Import:**
   - Duyệt qua danh sách `matched_voice_id` trả về.
   - Nếu `voice_id` chưa tồn tại trong bảng `users`, thực hiện tạo mới User với `source: AI_IMPORTED`.
4. **Data Enrichment:** Lấy thêm thông tin chi tiết (CCCD, SĐT, Tiểu sử tiền án) từ bảng `users`.
5. **Session Recording:** Lưu lịch sử phiên nhận dạng vào bảng `identify_sessions`.

## Response

### Cấu trúc dữ liệu (200 OK)

```typescript
{
  "statusCode": 200,
  "message": "Nhận dạng thành công",
  "data": {
    "session_id": "string (uuid)",
    "session_type": "SINGLE",
    "audio_url": "string (url)",
    "identified_at": "string (iso_date)",
    "results": [
      {
        "rank": "number",
        "voice_id": "string (uuid)",
        "score": "number (0-1)",
        "name": "string",
        "citizen_identification": "string | null",
        "phone_number": "string | null",
        "criminal_record": "Json | null"
      }
    ]
  }
}
```

## Error Codes

- `400 Bad Request`: File không hợp lệ hoặc thiếu.
- `413 Payload Too Large`: File vượt quá 50MB.
- `422 Unprocessable Entity`: Thời lượng audio quá dài (> 10 phút).
- `503 Service Unavailable`: AI Service không phản hồi (timeout 5s).
