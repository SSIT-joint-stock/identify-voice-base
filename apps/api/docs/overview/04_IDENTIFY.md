# 04 — Identify Module (UC02, UC03)

> **Last updated:** 2026-04-09
> **Related use cases:** UC02 (Single Identify), UC03 (Multi Identify)
> **Module path:** `src/module/identify/`

---

## Tổng quan

Module nhận dạng giọng nói nhận file audio từ Client, forward sang AI Service để so khớp với tất cả embedding đã đăng ký trong Qdrant. Kết quả thô từ AI (RAW AI data) cùng metadata sẽ được lưu vào bảng `ai_identities_cache` (đóng vai trò lưu trữ AI Truth) và kết quả được trả về trực tiếp, hoàn toàn cắt đứt việc tự động đồng bộ (tạo mới/cập nhật) vào bảng `users`. Mọi thao tác mapping danh tính thật (Business Truth) sẽ được xử lý Lazy Enrichment khi người dùng truy vấn Session Detail.

| Endpoint                | Use Case | Mô tả                                                                               |
| ----------------------- | -------- | ----------------------------------------------------------------------------------- |
| `POST /api/v1/identify` | UC02/03  | Endpoint xác định giọng nói đồng nhất, truyền tham số `type` để chọn 1 hoặc 2 người |

---

## Sự khác biệt Business Truth và AI Truth

Hệ thống được thiết kế sử dụng **Anti-Corruption Layer** để đảm bảo dữ liệu Business không bị nhiễm bẩn do AI nhận diện sai:

1. `IdentifyUseCase` chỉ gọi AI, lưu Raw Metadata vào bảng `ai_identities_cache`. TUYỆT ĐỐI KHÔNG TẠO NEW USER tại thời điểm Identify.
2. `ai_identities_cache` đóng vai trò là "AI Truth" - những gì AI gợi ý thuộc về file âm thanh (nhưng chưa được nhân viên xác nhận).
3. Tại trang kết quả của hệ thống, người dùng sẽ là người quyết định có bấm "Xác nhận & Chuyển vào Users" (Business Truth) hay từ chối.
4. Tránh trường hợp hôm nay mô hình tách 1 người, ngày mai tách 2 người, làm rác bảng liên quan.

---

## POST /api/v1/identify

### Mô tả (UC02, UC03)

### Request

```
POST /api/v1/identify
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field  | Type     | Required | Mô tả                                                         |
| ------ | -------- | -------- | ------------------------------------------------------------- |
| `file` | `File`   | ✅       | File hội thoại (WAV/MP3/FLAC/OGG, ≤ 50MB, ≤ 10 phút)          |
| `type` | `String` | ❌       | Loại nhận dạng. Enum: `SINGLE` hoặc `MULTI`. Mặc định `MULTI` |

> ⚠️ **Diarization rất tốn tài nguyên.** Backend **phải** validate size + duration trước khi gọi AI Service.

### Response thành công — 200 OK

```typescript
interface UnifiedIdentifyResponse {
  statusCode: 200;
  message: string;
  data: {
    session_id: string; // UUID — ID của identify_session vừa tạo trong DB
    audio_url: string; // URL audio đã upload (để debug/replay)
    identified_at: string; // ISO 8601
    speakers: NormalizedSpeakerResult[];
  };
}

interface NormalizedSpeakerResult {
  speaker_label: string; // 'SPEAKER_00' | 'SPEAKER_01' — từ AI Service
  matched_voice_id: string | null; // null nếu không nhận ra (Unknown)
  score: number | null; // null nếu Unknown
  name: string; // 'Unknown' nếu không nhận ra
  citizen_identification: string | null;
  phone_number: string | null;
  segments: Array<{
    // phân đoạn thời gian speaker này nói
    start: number; // giây
    end: number; // giây
  }>;
}
```

**Example response (Multi):**

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
        "segments": [
          { "start": 0.5, "end": 4.2 },
          { "start": 10.1, "end": 15.3 }
        ]
      },
      {
        "speaker_label": "SPEAKER_01",
        "matched_voice_id": null,
        "score": null,
        "name": "Unknown",
        "citizen_identification": null,
        "phone_number": null,
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

### AI Service Integration

```
1. Lưu file: /uploads/identify/<uuid>.<ext>
2. Tuỳ theo `type=SINGLE` hoặc `type=MULTI` gọi đến `identify_voice` hoặc `identify_2_voice` AI AI Service
   Body (multipart): audio file stream
   Timeout: 30 giây (diarization chậm hơn single)

   AI Service response trả về Raw Result. Tầng Anti-Corruption layer (AiCoreModule) sẽ chịu trách nhiệm Normalization các input lộn xộn của AI array/object về cấu trúc chung NormalizedSpeakerResult.

3. Với mỗi voice_id hợp lệ có trả về từ AI:
   UPSERT bảng `ai_identities_cache` để lưu metadata do AI suggest!

4. INSERT identify_sessions {
     user_id: operator_id,    // từ JWT payload
     audio_file_id: file_id,
     results: normalized_speakers // JSON array trực tiếp chứa NormalizedSpeakerResult
   }

5. Trả response (không access bảng Users)
```

### Cấu trúc JSON lưu trong DB

```typescript
// Cấu trúc lưu vào identify_sessions.results (JSON trực tiếp kiểu array)
type ResultsJson = Array<{
  speaker_label: string;
  matched_voice_id: string | null;
  score: number | null;
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
  segments: Array<{ start: number; end: number }>;
  raw_ai_data: any;
}>;
```

---

## Lưu ý nghiệp vụ

1. **Lazy Data Enrichment:** Module Identify hoàn toàn mù Business Truth. Mọi logic truy cứu xem người đang nhận diện là ai được giao khoán cho SessionsModule khi lấy detail.
2. **Loại bỏ SessionType:** Không lưu `SESSION_TYPE` (SINGLE, MULTI) trong DB. Hệ thống xác định nó single thì mảng size 1, multi thì kích thước mảng speakers > 1 dựa vào record JSON results cuối cùng, vì AI có thể trả lại kích thước mảng thay đổi trong tương lai.
3. **Mô hình AiCoreService:** Tầng Anti-Corruption Layer tập trung tại `src/module/ai-core/usecase/`, chịu trách nhiệm gánh và chuẩn hóa bất cứ dữ liệu lộn xộn nào mà AI Engine trả ra.
