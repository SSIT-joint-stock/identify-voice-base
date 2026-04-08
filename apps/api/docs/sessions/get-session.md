# GET /api/v1/sessions/:id

Chi tiết đầy đủ về một phiên nhận dạng giọng nói, bao gồm toàn bộ dữ liệu so khớp kỹ thuật.

## Endpoint

- **Path:** `/api/v1/sessions/:id`
- **Method:** `GET`
- **Auth:** Required (Bearer Token)

## Response

### Cấu trúc dữ liệu (200 OK)

Cung cấp thông tin chi tiết nhất có thể để phục vụ việc đối soát và phân tích kỹ thuật.

```typescript
{
  "statusCode": 200,
  "data": {
    "id": "string (uuid)",
    "session_type": "SINGLE | MULTI",
    "audio_url": "string (url)",
    "identified_at": "string (iso_date)",
    "operator": {
      "id": "string",
      "username": "string"
    },
    "results": "Json (Cấu trúc chi tiết tùy theo session_type)"
  }
}
```

### Cấu trúc `results` theo Session Type

#### 1. SINGLE SESSION

Mảng chứa danh sách các ứng viên có giọng nói tương đồng nhất.

```json
[
  {
    "rank": 1,
    "voice_id": "uuid",
    "score": 0.98,
    "name": "Nguyen Van A",
    "citizen_identification": "012345678901",
    "phone_number": "0987654321",
    "criminal_record": [...]
  }
]
```

#### 2. MULTI SESSION

Mảng chứa danh sách các người nói được tách ra từ hội thoại.

```json
[
  {
    "speaker_label": "SPEAKER_00",
    "voice_id": "uuid",
    "score": 0.95,
    "name": "Nguyen Van A",
    "segments": [{ "start": 0.5, "end": 10.2 }]
  },
  {
    "speaker_label": "SPEAKER_01",
    "voice_id": null,
    "score": null,
    "name": "Unknown",
    "segments": [{ "start": 10.5, "end": 15.0 }]
  }
]
```

## Error Codes

- `404 Not Found`: Không tìm thấy phiên nhận dạng với ID cung cấp.
- `401 Unauthorized`: Token không hợp lệ hoặc thiếu.
