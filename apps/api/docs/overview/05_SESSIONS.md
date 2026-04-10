# 05 — Sessions Module (UC05)

> **Last updated:** 2026-04-09
> **Related use cases:** UC05
> **Module path:** `src/module/sessions/`

---

## Tổng quan

Module lịch sử phiên nhận dạng cho phép tra cứu và xem lại kết quả của các lần nhận dạng đã thực hiện. Dữ liệu lưu trong bảng `identify_sessions` với trường `results` kiểu JSON chứa kết quả phân tích AI RAW metadata.

Đặc biệt, hệ thống xử lý **Lazy Enrichment**. Identity kết quả cuối cùng là Business Truth được xác minh theo trình tự ưu tiên: `voice_records (is_active=true) -> users` trước, nếu không có, sẽ lấy metadata tạm thời từ bảng `ai_identities_cache` (AI Truth).

---

## GET /api/v1/sessions

### Mô tả

Lấy danh sách các phiên nhận dạng với hỗ trợ lọc theo khoảng thời gian. Khái niệm `session_type` (SINGLE/MULTI) đã được gỡ bỏ khỏi hệ thống để đảm bảo linh hoạt.

### Request

```
GET /api/v1/sessions?page=1&page_size=10&from_date=2026-04-01&to_date=2026-04-05
Authorization: Bearer <access_token>
```

**Query parameters:**

| Param       | Type     | Default | Mô tả                                             |
| ----------- | -------- | ------- | ------------------------------------------------- |
| `page`      | `number` | `1`     | Số trang                                          |
| `page_size` | `number` | `10`    | Kích thước trang                                  |
| `from_date` | `string` | —       | Từ ngày (ISO 8601 date: `2026-04-01`)             |
| `to_date`   | `string` | —       | Đến ngày (ISO 8601 date: `2026-04-05`, inclusive) |

### Response thành công — 200 OK

```typescript
interface SessionsListResponse {
  statusCode: 200;
  message: string;
  data: {
    items: SessionSummary[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
}

interface SessionSummary {
  id: string; // Session UUID — từ DB
  audio_url: string; // URL audio đã nhận dạng
  identified_at: string; // ISO 8601
  operator: {
    id: string;
    username: string;
  };
  result_count: number; // Số speakers được AI nhận ra
  top_score: number | null; // Score cao nhất
}
```

---

## GET /api/v1/sessions/:id

### Mô tả

Lấy chi tiết một phiên nhận dạng. Đây là lúc **Lazy Enrichment** hoạt động, nối thông tin định danh bằng Business Truth hoặc AI Truth.

### Request

```
GET /api/v1/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <access_token>
```

### Response thành công — 200 OK

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

**Trường `is_business_truth`:** Xác định dữ liệu định danh của speaker này là kết quả trích xuất từ bảng `users` thực tế chưa (Business Truth = true), hay chỉ là metadata bộ nhớ tạm từ `ai_identities_cache` (Business Truth = false).

### Ý tưởng cốt lõi của Lazy Data Enrichment

```typescript
// Trong SessionsService:
// 1. Trích xuất mảng speakers từ `results`
const speakers = session.results as any[];

// 2. Chạy Enrichment (nhặt các voice_id khác null)
const matchedVoiceIds = speakers.map(s => s.matched_voice_id).filter(id => !!id);

// 3. Nạp Business Truth Database (Lấy thông tin User đã được confirm)
// Bằng cách map sang voice_records => users
const activeRecords = await this.prisma.voice_records.findMany({
  where: { voice_id: { in: matchedVoiceIds }, is_active: true },
  include: { user: true },
});

// 4. Nếu không có ở Users, Nạp AI Truth Caching
const missingVoiceIds = ...
const aiCaches = await this.prisma.ai_identities_cache.findMany({
  where: { voice_id: { in: missingVoiceIds } },
});

// 5. Build Final Payload
// Phối hợp kết quả lại, gắn cờ is_business_truth = true nếu lấy từ Users.
```

---

## GET /api/v1/sessions/:id/speakers/:label/audio

### Mô tả

Phát audio riêng biệt của một speaker trong phiên nhận dạng. Hệ thống sử dụng **On-demand Media Processing**: tự động cắt và ghép các đoạn segments dựa trên timestamps RAW của AI để tạo ra file audio duy nhất cho speaker đó.

### Request

```
GET /api/v1/sessions/:session_id/speakers/:label/audio
Authorization: Bearer <access_token>
```

- `:session_id`: UUID của phiên nhận dạng.
- `:label`: Label của speaker (ví dụ: `SPEAKER_00`).

### Phản hồi

Trả về stream audio trực tiếp (`audio/wav`).

### Business Logic (On-demand)

Thay vì lưu trữ file audio đã cắt ghép vào database (làm nặng storage vô ích), hệ thống thực hiện:

1. Đọc timestamps từ trường `results` của session.
2. Sử dụng `fluent-ffmpeg` để thực hiện filter `atrim` và `concat` ngay khi có request.
3. Pipe stream kết quả về cho Client.
4. Xóa file tạm ngay sau khi stream hoàn tất.

---

## Lưu ý nghiệp vụ

- JSONB đã được chuyển về JSON thông thường do Prisma có sự cố typing với JSONB query phức tạp.
- Không có field `session_type`, mọi dữ liệu về Speaker nằm gọn trong độ dài của mảng JSON `results`.
