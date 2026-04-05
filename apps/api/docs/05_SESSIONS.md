# 05 — Sessions Module (UC05)

> **Last updated:** 2026-04-05
> **Related use cases:** UC05
> **Module path:** `src/module/sessions/`

---

## Tổng quan

Module lịch sử phiên nhận dạng cho phép tra cứu và xem lại kết quả của các lần nhận dạng đã thực hiện. Dữ liệu lưu trong bảng `identify_sessions` với trường `results` kiểu JSONB chứa toàn bộ kết quả AI.

---

## GET /api/sessions

### Mô tả

Lấy danh sách các phiên nhận dạng với hỗ trợ lọc theo loại phiên và khoảng thời gian.

### Request

```
GET /api/sessions?page=1&page_size=10&type=SINGLE&from_date=2026-04-01&to_date=2026-04-05
Authorization: Bearer <access_token>
```

**Query parameters:**

| Param       | Type                  | Default | Mô tả                                             |
| ----------- | --------------------- | ------- | ------------------------------------------------- |
| `page`      | `number`              | `1`     | Số trang                                          |
| `page_size` | `number`              | `10`    | Kích thước trang: `10` \| `25` \| `50`            |
| `type`      | `'SINGLE' \| 'MULTI'` | —       | Lọc theo loại phiên                               |
| `from_date` | `string`              | —       | Từ ngày (ISO 8601 date: `2026-04-01`)             |
| `to_date`   | `string`              | —       | Đến ngày (ISO 8601 date: `2026-04-05`, inclusive) |

**cURL:**

```bash
curl "http://localhost:3000/api/sessions?page=1&page_size=10&type=SINGLE&from_date=2026-04-01&to_date=2026-04-05" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

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
  session_type: 'SINGLE' | 'MULTI';
  audio_url: string; // URL audio đã nhận dạng
  identified_at: string; // ISO 8601
  operator: {
    // Tài khoản thực hiện nhận dạng
    id: string;
    username: string;
  };
  result_count: number; // Số kết quả trong results (top-N hoặc số speakers)
  top_score: number | null; // Score cao nhất trong kết quả
}
```

**Example response:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "session_type": "SINGLE",
        "audio_url": "http://localhost:3000/uploads/identify/xyz789.wav",
        "identified_at": "2026-04-05T14:30:00.000Z",
        "operator": {
          "id": "op-uuid-here",
          "username": "admin"
        },
        "result_count": 5,
        "top_score": 0.94
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "session_type": "MULTI",
        "audio_url": "http://localhost:3000/uploads/identify/conv456.wav",
        "identified_at": "2026-04-05T15:00:00.000Z",
        "operator": {
          "id": "op-uuid-here",
          "username": "admin"
        },
        "result_count": 2,
        "top_score": 0.91
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

### Business Logic

```typescript
// Prisma query với filter
const where: Prisma.identify_sessionsWhereInput = {
  ...(type && { session_type: type }),
  ...((from_date || to_date) && {
    identified_at: {
      ...(from_date && { gte: new Date(from_date) }),
      // to_date là ngày cuối → include hết ngày đó
      ...(to_date && { lte: new Date(`${to_date}T23:59:59.999Z`) }),
    },
  }),
};

const [items, total] = await Promise.all([
  prisma.identify_sessions.findMany({
    where,
    include: { operator: { select: { id: true, username: true } } },
    orderBy: { identified_at: 'desc' },
    skip: (page - 1) * page_size,
    take: page_size,
  }),
  prisma.identify_sessions.count({ where }),
]);

// Compute top_score từ results JSONB (xử lý ở application layer)
const enriched = items.map((session) => {
  const results = session.results as any[];
  const topScore =
    results.length > 0
      ? Math.max(...results.map((r) => r.score ?? r.speakers?.[0]?.score ?? -1))
      : null;
  return { ...session, result_count: results.length, top_score: topScore };
});
```

### Response lỗi

| Status             | Điều kiện                                                  |
| ------------------ | ---------------------------------------------------------- |
| `400 Bad Request`  | `page_size` không hợp lệ, `from_date`/`to_date` sai format |
| `401 Unauthorized` | Token thiếu/hết hạn                                        |

---

## GET /api/sessions/:id

### Mô tả

Lấy chi tiết đầy đủ một phiên nhận dạng, bao gồm toàn bộ nội dung trường `results` JSONB.

### Request

```
GET /api/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <access_token>
```

**Path parameter:** `id` — UUID của identify_session

**cURL:**

```bash
curl "http://localhost:3000/api/sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

**Single session:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_type": "SINGLE",
    "audio_url": "http://localhost:3000/uploads/identify/xyz789.wav",
    "identified_at": "2026-04-05T14:30:00.000Z",
    "operator": {
      "id": "op-uuid-here",
      "username": "admin"
    },
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

**Multi session:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "session_type": "MULTI",
    "audio_url": "http://localhost:3000/uploads/identify/conv456.wav",
    "identified_at": "2026-04-05T15:00:00.000Z",
    "operator": {
      "id": "op-uuid-here",
      "username": "admin"
    },
    "results": [
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

### Business Logic

```typescript
// Prisma query — đơn giản, results JSONB trả nguyên dạng
const session = await prisma.identify_sessions.findUniqueOrThrow({
  where: { id },
  include: {
    operator: { select: { id: true, username: true } },
  },
});

// results là Prisma.JsonValue — cast về type tương ứng ở application layer
// Không cần raw query vì không filter trong JSONB ở endpoint này
return session;
```

**Ghi chú về JSONB trong Prisma:**

Khi cần **filter trong JSONB** (ví dụ: tìm tất cả session có `voice_id` cụ thể trong results), Prisma không hỗ trợ trực tiếp — cần dùng raw query:

```typescript
// Tìm session có voice_id trong results (ví dụ cho lịch sử nhận dạng trong GET /api/voices/:id)
const sessions = await prisma.$queryRaw<identify_sessions[]>`
  SELECT *
  FROM identify_sessions
  WHERE results @> ${JSON.stringify([{ voice_id: targetVoiceId }])}::jsonb
  ORDER BY identified_at DESC
  LIMIT 5
`;
```

### Response lỗi

| Status             | Điều kiện             |
| ------------------ | --------------------- |
| `401 Unauthorized` | Token thiếu/hết hạn   |
| `404 Not Found`    | Session không tồn tại |

---

## Lưu ý nghiệp vụ

1. **JSONB trả nguyên vẹn:** Trường `results` được lưu nguyên vẹn khi nhận dạng và trả về không qua transform — Frontend nhận đúng cấu trúc đã lưu.
2. **Filter JSONB:** Nếu cần tìm kiếm trong nội dung `results` (ví dụ: "tất cả session có voice_id X xuất hiện"), phải dùng `prisma.$queryRaw` với toán tử PostgreSQL `@>` (jsonb contains).
3. **Nguồn gốc dữ liệu:** `results` JSONB là dữ liệu được **Backend** tổng hợp từ AI Service + DB trước khi lưu — không phải raw output của AI Service.
