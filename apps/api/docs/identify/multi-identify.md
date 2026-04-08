# POST /api/v1/identify/multi

Nhận dạng hội thoại (Speaker Diarization) cho phép phân tách và nhận danh tính của tối đa 2 người nói trong cùng một tệp âm thanh.

## Endpoint

- **Path:** `/api/v1/identify/multi`
- **Method:** `POST`
- **Auth:** Required (Bearer Token)
- **Content-Type:** `multipart/form-data`

## Request Body

| Field  | Type     | Description                               | Constraints                  |
| :----- | :------- | :---------------------------------------- | :--------------------------- |
| `file` | `Buffer` | File hội thoại cần phân tách và nhận diện | max 50MB, tối đa 2 người nói |

## Quy trình xử lý (Technical Flow)

1. **Validation:** Kiểm tra định dạng file (WAV/MP3/FLAC/OGG), kích thước và thời lượng.
2. **AI Core Multi Identification:** Gửi file sang AI Service (`POST /identify_2_voice/`).
   - Nếu AI phát hiện > 2 người nói $\rightarrow$ Trả về lỗi `422 Unprocessable Entity`.
3. **Lazy Import (Duyệt theo từng Speaker):**
   - AI trả về danh sách các `speakers`.
   - Với mỗi speaker, nếu `matched_voice_id` tồn tại:
     - Kiểm tra User trong DB.
     - Nếu chưa có $\rightarrow$ Tự động tạo User (`AI_IMPORTED`).
4. **Data Enrichment:** Tổng hợp thông tin từ DB cho từng speaker đã nhận diện được.
5. **Session Recording:** Lưu kết quả hội thoại (bao gồm các đoạn `segments` của từng người) vào bảng `identify_sessions`.

## Response

### Cấu trúc dữ liệu (200 OK)

```typescript
{
  "statusCode": 200,
  "message": "Nhận dạng hội thoại thành công",
  "data": {
    "session_id": "string (uuid)",
    "session_type": "MULTI",
    "audio_url": "string (url)",
    "identified_at": "string (iso_date)",
    "speakers": [
      {
        "speaker_label": "string", // ví dụ: SPEAKER_00, SPEAKER_01
        "voice_id": "string (uuid) | null",
        "score": "number | null",
        "name": "string",
        "citizen_identification": "string | null",
        "phone_number": "string | null",
        "criminal_record": "Json | null",
        "segments": [
          { "start": "number", "end": "number" }
        ]
      }
    ]
  }
}
```

## Error Codes

- `422 Unprocessable Entity`: Phát hiện quá 2 người nói trong file âm thanh.
- `500 Internal Server Error`: Lỗi xử lý Diarization từ AI Service.
- Các lỗi chung về validation (400, 413) tương tự Single Identify.
