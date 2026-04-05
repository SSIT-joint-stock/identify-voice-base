# 04 — Identify Module (UC02, UC03)

> **Last updated:** 2026-04-05
> **Related use cases:** UC02 (Single Identify), UC03 (Multi Identify)
> **Module path:** `src/module/identify/`

---

## Tổng quan

Module nhận dạng giọng nói nhận file audio từ Client, forward sang AI Service để so khớp với tất cả embedding đã đăng ký trong Qdrant, rồi lưu kết quả vào DB và trả về cho Client.

| Endpoint                    | Use Case | Mô tả                                                   |
| --------------------------- | -------- | ------------------------------------------------------- |
| `POST /api/identify/single` | UC02     | Nhận dạng 1 người nói trong audio                       |
| `POST /api/identify/multi`  | UC03     | Phân tách và nhận dạng tối đa 2 người nói (Diarization) |

**Score trong kết quả:**

- Range: `[-1, 1]` — cosine similarity giữa embedding audio input và embedding đã đăng ký
- `≥ 0.85`: độ khớp cao (confident)
- `0.6–0.85`: khớp trung bình (cần xác nhận thêm)
- `< 0.6`: không khớp tin cậy

---

## POST /api/identify/single

### Mô tả (UC02)

Nhận dạng 1 người nói từ file audio. Trả về top-5 kết quả khớp nhất được sắp xếp theo score giảm dần.

### Request

```
POST /api/identify/single
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field   | Type   | Required | Mô tả                                             |
| ------- | ------ | -------- | ------------------------------------------------- |
| `audio` | `File` | ✅       | File âm thanh WAV/MP3/FLAC/OGG, ≤ 50MB, ≤ 10 phút |

**cURL:**

```bash
curl -X POST http://localhost:3000/api/identify/single \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "audio=@/path/to/audio_to_identify.wav"
```

### Response thành công — 200 OK

```typescript
interface SingleIdentifyResponse {
  statusCode: 200;
  message: string;
  data: {
    session_id: string; // UUID — ID của identify_session vừa tạo trong DB
    session_type: 'SINGLE';
    audio_url: string; // URL audio đã upload (để debug/replay)
    identified_at: string; // ISO 8601
    results: SingleResult[];
  };
}

interface SingleResult {
  rank: number; // 1–5, sắp xếp theo score giảm dần
  voice_id: string; // UUID — Qdrant point ID
  score: number; // [-1, 1]
  name: string; // từ DB users
  citizen_identification: string | null;
  phone_number: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
}
```

**Example response — tìm thấy kết quả:**

```json
{
  "statusCode": 200,
  "message": "Nhận dạng thành công",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_type": "SINGLE",
    "audio_url": "http://localhost:3000/uploads/identify/xyz789.wav",
    "identified_at": "2026-04-05T14:30:00.000Z",
    "results": [
      {
        "rank": 1,
        "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "score": 0.94,
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "criminal_record": [{ "case": "Trộm cắp tài sản", "year": 2021 }]
      },
      {
        "rank": 2,
        "voice_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "score": 0.71,
        "name": "Trần Thị B",
        "citizen_identification": null,
        "phone_number": "0987654321",
        "criminal_record": null
      }
    ]
  }
}
```

**Example response — không tìm thấy:**

```json
{
  "statusCode": 200,
  "message": "Không tìm thấy giọng nói phù hợp",
  "data": {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_type": "SINGLE",
    "audio_url": "http://localhost:3000/uploads/identify/xyz789.wav",
    "identified_at": "2026-04-05T14:30:00.000Z",
    "results": []
  }
}
```

### Response lỗi

| Status                      | Điều kiện                      |
| --------------------------- | ------------------------------ |
| `400 Bad Request`           | Thiếu file `audio`, sai format |
| `401 Unauthorized`          | Token thiếu/hết hạn            |
| `413 Payload Too Large`     | File > 50MB                    |
| `422 Unprocessable Entity`  | Duration > 10 phút             |
| `500 Internal Server Error` | AI Service lỗi hoặc lỗi lưu DB |
| `503 Service Unavailable`   | AI Service timeout (> 5 giây)  |

### AI Service Integration

```
1. Lưu file: /uploads/identify/<uuid>.<ext>
2. POST http://localhost:1112/identify_voice/
   Body (multipart): audio file stream
   Timeout: 5 giây (SLA requirement)

   AI Service response:
   [
     { "voice_id": "uuid", "score": 0.94 },
     { "voice_id": "uuid", "score": 0.71 },
     ...   // top-5
   ]

3. Với mỗi voice_id trong kết quả:
   SELECT users.* WHERE id = voice_id
   → enrich kết quả với thông tin cá nhân từ DB

4. INSERT identify_sessions {
     user_id: operator_id,    // từ JWT payload
     session_type: SINGLE,
     audio_url,
     results: enriched_results  // JSONB
   }

5. Trả response
```

### Business Logic

```typescript
async identifySingle(operatorId: string, audioPath: string, audioUrl: string) {
  // 1. Call AI Service
  const aiResults = await this.aiService.identifyVoice(audioPath);
  // aiResults = [{ voice_id, score }, ...]

  if (!aiResults || aiResults.length === 0) {
    // Vẫn lưu session với results=[]
    await this.prisma.identify_sessions.create({ ... });
    return { results: [] };
  }

  // 2. Enrich với thông tin từ DB
  const enriched = await Promise.all(
    aiResults.map(async (r, i) => {
      const user = await this.prisma.users.findUnique({ where: { id: r.voice_id } });
      return {
        rank: i + 1,
        voice_id: r.voice_id,
        score: r.score,
        name: user?.name ?? 'Unknown',
        citizen_identification: user?.citizen_identification ?? null,
        phone_number: user?.phone_number ?? null,
        criminal_record: user?.criminal_record ?? null,
      };
    })
  );

  // 3. Lưu session
  const session = await this.prisma.identify_sessions.create({
    data: {
      user_id: operatorId,
      session_type: SessionType.SINGLE,
      audio_url: audioUrl,
      results: enriched as Prisma.JsonArray,
    },
  });

  return { session_id: session.id, results: enriched };
}
```

---

## POST /api/identify/multi

### Mô tả (UC03)

Nhận dạng hội thoại tối đa 2 người (Speaker Diarization). AI Service phân tách các đoạn nói theo từng speaker, sau đó nhận dạng từng người riêng lẻ.

### Request

```
POST /api/identify/multi
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field   | Type   | Required | Mô tả                                                       |
| ------- | ------ | -------- | ----------------------------------------------------------- |
| `audio` | `File` | ✅       | File hội thoại 2 người, WAV/MP3/FLAC/OGG, ≤ 50MB, ≤ 10 phút |

> ⚠️ **Diarization rất tốn tài nguyên.** Backend **phải** validate size + duration trước khi gọi AI Service.

**cURL:**

```bash
curl -X POST http://localhost:3000/api/identify/multi \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "audio=@/path/to/conversation.wav"
```

### Response thành công — 200 OK

```typescript
interface MultiIdentifyResponse {
  statusCode: 200;
  message: string;
  data: {
    session_id: string;
    session_type: 'MULTI';
    audio_url: string;
    identified_at: string;
    speakers: SpeakerResult[];
  };
}

interface SpeakerResult {
  speaker_label: string; // 'SPEAKER_00' | 'SPEAKER_01' — từ AI Service
  voice_id: string | null; // null nếu không nhận ra (Unknown)
  score: number | null; // null nếu Unknown
  name: string; // 'Unknown' nếu không nhận ra
  citizen_identification: string | null;
  phone_number: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
  segments: Array<{
    // phân đoạn thời gian speaker này nói
    start: number; // giây
    end: number; // giây
  }>;
}
```

**Example response — 2 người, cả 2 đều nhận ra:**

```json
{
  "statusCode": 200,
  "message": "Nhận dạng hội thoại thành công",
  "data": {
    "session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "session_type": "MULTI",
    "audio_url": "http://localhost:3000/uploads/identify/conv456.wav",
    "identified_at": "2026-04-05T15:00:00.000Z",
    "speakers": [
      {
        "speaker_label": "SPEAKER_00",
        "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "score": 0.91,
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "criminal_record": [],
        "segments": [
          { "start": 0.5, "end": 4.2 },
          { "start": 10.1, "end": 15.3 }
        ]
      },
      {
        "speaker_label": "SPEAKER_01",
        "voice_id": null,
        "score": null,
        "name": "Unknown",
        "citizen_identification": null,
        "phone_number": null,
        "criminal_record": null,
        "segments": [{ "start": 4.5, "end": 9.8 }]
      }
    ]
  }
}
```

### Response lỗi

| Status                      | Điều kiện                                               |
| --------------------------- | ------------------------------------------------------- |
| `400 Bad Request`           | Thiếu file, sai format                                  |
| `401 Unauthorized`          | Token thiếu/hết hạn                                     |
| `413 Payload Too Large`     | File > 50MB                                             |
| `422 Unprocessable Entity`  | Duration > 10 phút, **hoặc** AI phát hiện > 2 người nói |
| `500 Internal Server Error` | AI Service lỗi                                          |

**Example 422 — quá nhiều người nói:**

```json
{
  "statusCode": 422,
  "message": "Hội thoại phát hiện 3 người nói — hệ thống chỉ hỗ trợ tối đa 2 người",
  "error": "Unprocessable Entity",
  "data": {
    "num_speakers": 3
  }
}
```

### AI Service Integration

```
1. Lưu file: /uploads/identify/<uuid>.<ext>
2. POST http://localhost:1112/identify_2_voice/
   Body (multipart): audio file stream
   Timeout: 30 giây (diarization chậm hơn single)

   AI Service response có 3 nhánh:
   ┌─ Nếu num_speakers > 2:
   │  { "error": "too_many_speakers", "num_speakers": N }
   │  → Backend trả 422 kèm num_speakers
   │
   ├─ Nếu num_speakers == 1:
   │  { "speakers": [{ "label": "SPEAKER_00", "voice_id": "uuid",
   │                   "score": 0.94, "segments": [...] }] }
   │  → Xử lý như single identify (1 speaker)
   │
   └─ Nếu num_speakers == 2:
      { "speakers": [
          { "label": "SPEAKER_00", "voice_id": "uuid", "score": 0.91,
            "segments": [{ "start": 0.5, "end": 4.2 }] },
          { "label": "SPEAKER_01", "voice_id": null,
            "segments": [{ "start": 4.5, "end": 9.8 }] }
        ] }
      → Enrich từng speaker với thông tin từ DB
      → INSERT identify_sessions (session_type=MULTI)
```

### Cấu trúc JSONB lưu trong DB

```typescript
// Cấu trúc lưu vào identify_sessions.results (JSONB)
// Single identify:
type SingleResultsJson = Array<{
  rank: number;
  voice_id: string;
  score: number;
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
}>;

// Multi identify:
type MultiResultsJson = Array<{
  speaker_label: string;
  voice_id: string | null;
  score: number | null;
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
  segments: Array<{ start: number; end: number }>;
}>;
```

---

## Lưu ý nghiệp vụ

1. **SLA single identify:** Toàn bộ pipeline (upload → AI → lưu DB → response) phải hoàn thành trong **≤ 5 giây**. Nếu AI Service không phản hồi trong 5 giây → trả `503`.
2. **Không có SLA cho multi:** Diarization phụ thuộc độ dài audio, timeout mặc định 30 giây.
3. **Score `null` cho Unknown:** Khi AI không tìm được match trong Qdrant, `voice_id = null` và `score = null`. Frontend nên hiển thị badge "Unknown" thay vì hiển thị score.
4. **Vẫn lưu session khi không nhận ra:** Ngay cả khi `results = []` hoặc tất cả là Unknown, hệ thống vẫn INSERT `identify_sessions` để lưu lịch sử thao tác.
5. **File identify được giữ lại:** Khác với update-voice (xóa file tạm), file trong `/uploads/identify/` được giữ lại để phục vụ replay và audit.
