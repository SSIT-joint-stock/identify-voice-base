# 03 — Voices Module (UC06)

> **Last updated:** 2026-04-05
> **Related use cases:** UC06
> **Module path:** `src/module/voices/`

---

## Tổng quan

Module quản lý hồ sơ giọng nói cung cấp các thao tác CRUD trên dữ liệu đã đăng ký. **Quan trọng:** Các thao tác trong module này chỉ thay đổi metadata trong PostgreSQL và/hoặc embedding trong Qdrant — **không** thay đổi model AI.

- `GET /api/voices` — Danh sách hồ sơ (phân trang + tìm kiếm)
- `GET /api/voices/:id` — Chi tiết hồ sơ + lịch sử nhận dạng
- `PUT /api/voices/:id` — Cập nhật thông tin cá nhân (không ảnh hưởng embedding)
- `DELETE /api/voices/:id` — Xóa đồng bộ: DB + Qdrant + file audio local

---

## GET /api/voices

### Mô tả

Lấy danh sách hồ sơ giọng nói kèm phân trang và tìm kiếm.

### Request

```
GET /api/voices?page=1&page_size=10&search=Nguyễn
Authorization: Bearer <access_token>
```

**Query parameters:**

| Param       | Type     | Default | Mô tả                                                               |
| ----------- | -------- | ------- | ------------------------------------------------------------------- |
| `page`      | `number` | `1`     | Số trang (bắt đầu từ 1)                                             |
| `page_size` | `number` | `10`    | Kích thước trang: `10` \| `25` \| `50`                              |
| `search`    | `string` | —       | Tìm kiếm theo `name`, `citizen_identification`, hoặc `phone_number` |

**cURL:**

```bash
curl "http://localhost:3000/api/voices?page=1&page_size=10&search=Nguyễn" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```typescript
interface VoicesListResponse {
  statusCode: 200;
  message: string;
  data: {
    items: VoiceSummary[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
}

interface VoiceSummary {
  id: string; // = voice_id = user.id
  voice_id: string; // Point ID trong Qdrant
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  audio_url: string; // URL phát lại
  is_active: boolean; // true = bản embedding đang dùng
  version: number; // phiên bản hiện tại
  enrolled_at: string; // created_at của voice_record — ISO 8601
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
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "Nguyễn Văn A",
        "citizen_identification": "012345678901",
        "phone_number": "0912345678",
        "audio_url": "http://localhost:3000/uploads/voices/abc123.wav",
        "is_active": true,
        "version": 2,
        "enrolled_at": "2026-04-05T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 42,
      "total_pages": 5
    }
  }
}
```

### Business Logic

```typescript
// Prisma query
const where: Prisma.voice_recordsWhereInput = {
  is_active: true,
  user: search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { citizen_identification: { contains: search } },
          { phone_number: { contains: search } },
        ],
      }
    : undefined,
};

const [items, total] = await Promise.all([
  prisma.voice_records.findMany({
    where,
    include: { user: true },
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * page_size,
    take: page_size,
  }),
  prisma.voice_records.count({ where }),
]);
```

> Chỉ trả về bản `is_active = true` của mỗi user trong danh sách. Lịch sử phiên bản xem ở `GET /api/voices/:id`.

---

## GET /api/voices/:id

### Mô tả

Lấy chi tiết đầy đủ một hồ sơ giọng nói: thông tin cá nhân, audio, trạng thái file local, và lịch sử nhận dạng.

### Request

```
GET /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
```

**Path parameter:** `id` — UUID của user (= voice_id)

**cURL:**

```bash
curl "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```typescript
interface VoiceDetailResponse {
  statusCode: 200;
  message: string;
  data: {
    id: string;
    voice_id: string;
    // Thông tin cá nhân — từ bảng users
    name: string;
    citizen_identification: string | null;
    phone_number: string | null;
    hometown: string | null;
    job: string | null;
    passport: string | null;
    criminal_record: Array<{ case: string; year: number }> | null;
    // Hồ sơ giọng nói hiện tại — từ voice_records (is_active=true)
    audio_url: string;
    audio_available: boolean; // false nếu file không tồn tại trên disk
    is_active: boolean;
    version: number;
    enrolled_at: string;
    // Lịch sử phiên bản giọng nói
    voice_history: Array<{
      version: number;
      audio_url: string;
      is_active: boolean;
      created_at: string;
    }>;
    // Lịch sử nhận dạng (5 phiên gần nhất)
    identify_history: Array<{
      session_id: string;
      session_type: 'SINGLE' | 'MULTI';
      identified_at: string;
      score: number | null; // score từ results JSONB
    }>;
  };
}
```

**Example response:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Nguyễn Văn A",
    "citizen_identification": "012345678901",
    "phone_number": "0912345678",
    "hometown": "Hà Nội",
    "job": "Kỹ sư phần mềm",
    "passport": null,
    "criminal_record": [{ "case": "Trộm cắp tài sản", "year": 2021 }],
    "audio_url": "http://localhost:3000/uploads/voices/abc123.wav",
    "audio_available": true,
    "is_active": true,
    "version": 2,
    "enrolled_at": "2026-04-05T10:00:00.000Z",
    "voice_history": [
      {
        "version": 1,
        "audio_url": "http://localhost:3000/uploads/voices/abc000.wav",
        "is_active": false,
        "created_at": "2026-03-01T08:00:00.000Z"
      },
      {
        "version": 2,
        "audio_url": "http://localhost:3000/uploads/voices/abc123.wav",
        "is_active": true,
        "created_at": "2026-04-05T10:00:00.000Z"
      }
    ],
    "identify_history": [
      {
        "session_id": "uuid-xxx",
        "session_type": "SINGLE",
        "identified_at": "2026-04-04T14:00:00.000Z",
        "score": 0.94
      }
    ]
  }
}
```

### Business Logic

```typescript
// 1. Lấy user + tất cả voice_records
const user = await prisma.users.findUniqueOrThrow({
  where: { id },
  include: {
    voice_records: { orderBy: { version: 'asc' } },
  },
});

// 2. Kiểm tra file audio tồn tại trên disk
const activeRecord = user.voice_records.find((r) => r.is_active);
const audioPath = resolve('./uploads/voices', basename(activeRecord.audio_url));
const audioAvailable = await fs
  .access(audioPath)
  .then(() => true)
  .catch(() => false);

// 3. Lấy 5 phiên nhận dạng gần nhất có voice_id này trong results JSONB
// (raw query nếu cần filter JSONB)
const sessions = await prisma.identify_sessions.findMany({
  where: {
    /* raw filter JSONB */
  },
  orderBy: { identified_at: 'desc' },
  take: 5,
});
```

> Nếu file audio không tồn tại trên disk → `audio_available: false`. **Không** trả lỗi 500, chỉ đánh dấu trong response.

### Response lỗi

| Status             | Điều kiện                        |
| ------------------ | -------------------------------- |
| `401 Unauthorized` | Token thiếu/hết hạn              |
| `404 Not Found`    | Không tìm thấy user với `id` này |

---

## PUT /api/voices/:id

### Mô tả

Cập nhật thông tin cá nhân. **Không thay đổi embedding AI trong Qdrant.**

### Request

```
PUT /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body schema:**

```typescript
interface UpdateVoiceInfoDto {
  // Tất cả optional — chỉ gửi field cần thay đổi
  name?: string; // max 100 ký tự
  citizen_identification?: string; // max 20 ký tự
  phone_number?: string; // pattern: /^[0-9]{10,11}$/
  hometown?: string;
  job?: string;
  passport?: string;
  criminal_record?: Array<{ case: string; year: number }>;
}
```

**Example body:**

```json
{
  "phone_number": "0987654321",
  "job": "Công an",
  "criminal_record": []
}
```

**cURL:**

```bash
curl -X PUT "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0987654321","job":"Công an"}'
```

### Response thành công — 200 OK

```json
{
  "statusCode": 200,
  "message": "Cập nhật thông tin thành công",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Nguyễn Văn A",
    "phone_number": "0987654321",
    "job": "Công an",
    "updated_at": "2026-04-05T10:30:00.000Z"
  }
}
```

### Response lỗi

| Status             | Điều kiện                                                   |
| ------------------ | ----------------------------------------------------------- |
| `400 Bad Request`  | Vi phạm validation rule (sai format phone, vượt max length) |
| `401 Unauthorized` | Token thiếu/hết hạn                                         |
| `404 Not Found`    | Không tìm thấy user                                         |

### Business Logic

```typescript
// Chỉ UPDATE bảng users — không chạm tới voice_records, Qdrant, hay file local
const updated = await prisma.users.update({
  where: { id },
  data: {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.citizen_identification !== undefined && {
      citizen_identification: dto.citizen_identification,
    }),
    ...(dto.phone_number !== undefined && { phone_number: dto.phone_number }),
    ...(dto.hometown !== undefined && { hometown: dto.hometown }),
    ...(dto.job !== undefined && { job: dto.job }),
    ...(dto.passport !== undefined && { passport: dto.passport }),
    ...(dto.criminal_record !== undefined && {
      criminal_record: dto.criminal_record as Prisma.JsonArray,
    }),
  },
});
```

---

## DELETE /api/voices/:id

### Mô tả

Xóa hoàn toàn hồ sơ giọng nói: metadata trong PostgreSQL, embedding trong Qdrant, và tất cả file audio trên Local Storage. Thực hiện theo thứ tự an toàn để đảm bảo khả năng rollback.

### Request

```
DELETE /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
```

**cURL:**

```bash
curl -X DELETE "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```json
{
  "statusCode": 200,
  "message": "Đã xóa hồ sơ giọng nói thành công",
  "data": {
    "deleted_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

### Response lỗi

| Status                      | Điều kiện                                       |
| --------------------------- | ----------------------------------------------- |
| `401 Unauthorized`          | Token thiếu/hết hạn                             |
| `404 Not Found`             | Không tìm thấy user                             |
| `500 Internal Server Error` | Lỗi khi gọi AI Service xóa Qdrant (có rollback) |

### Business Logic — Thứ tự xóa an toàn

```typescript
async deleteVoice(id: string) {
  // --- Bước 1: Lấy đầy đủ thông tin trước khi xóa ---
  const user = await prisma.users.findUniqueOrThrow({
    where: { id },
    include: { voice_records: true },
  });
  const audioPaths = user.voice_records.map(r => r.audio_url);
  const voiceId = user.id; // = Qdrant point ID

  // --- Bước 2: Soft-delete trong DB (ngăn query mới tới record này) ---
  // (Nếu DB không có deleted_at, đánh dấu bằng is_active=false tất cả records)
  await prisma.voice_records.updateMany({
    where: { user_id: id },
    data: { is_active: false },
  });

  try {
    // --- Bước 3: Xóa embedding khỏi Qdrant ---
    await aiService.deleteVoice(voiceId);
    // DELETE http://localhost:1112/delete_voice/ body: { voice_id }

    // --- Bước 4: Xóa file audio local ---
    await Promise.allSettled(
      audioPaths.map(url => fs.unlink(urlToLocalPath(url)))
    );

    // --- Bước 5: Hard-delete DB records ---
    await prisma.$transaction([
      prisma.voice_records.deleteMany({ where: { user_id: id } }),
      prisma.users.delete({ where: { id } }),
    ]);

  } catch (error) {
    // --- Rollback: khôi phục soft-delete ---
    await prisma.voice_records.updateMany({
      where: { user_id: id },
      data: { is_active: true },
    });
    throw new InternalServerErrorException(
      `Xóa thất bại: ${error.message}. Đã rollback.`
    );
  }
}
```

**Thứ tự xóa và lý do:**

| Bước | Hành động       | Lý do                                              |
| ---- | --------------- | -------------------------------------------------- |
| 1    | Lấy data đầy đủ | Cần audio paths và voice_id trước khi xóa          |
| 2    | Soft-delete DB  | Ngăn request mới truy cập record này trong khi xóa |
| 3    | Xóa Qdrant      | Phụ thuộc `voice_id` đang còn trong DB             |
| 4    | Xóa file local  | Không phụ thuộc DB                                 |
| 5    | Hard-delete DB  | Chỉ thực hiện khi các bước trước thành công        |

---

## Validation Rules

```typescript
export class UpdateVoiceInfoDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  citizen_identification?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{10,11}$/)
  phone_number?: string;

  @IsString()
  @IsOptional()
  hometown?: string;

  @IsString()
  @IsOptional()
  job?: string;

  @IsString()
  @IsOptional()
  passport?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CriminalRecordItemDto)
  criminal_record?: CriminalRecordItemDto[];
}

export class CriminalRecordItemDto {
  @IsString()
  @IsNotEmpty()
  case: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;
}
```

---

## Lưu ý nghiệp vụ

1. **`PUT` không thay đổi embedding:** Thông tin cá nhân (tên, CCCD, điện thoại...) lưu trong PostgreSQL độc lập với đặc trưng giọng nói (vector embedding trong Qdrant). Hai hệ thống liên kết qua `voice_id`.
2. **`audio_available: false`:** Nếu file bị xóa tay ngoài hệ thống, response vẫn trả dữ liệu bình thường nhưng đánh dấu `audio_available: false`. Frontend nên ẩn nút phát audio trong trường hợp này.
3. **Xóa đồng bộ 3 nơi:** Nếu bất kỳ bước nào thất bại (đặc biệt là Qdrant — phụ thuộc mạng nội bộ), toàn bộ thao tác bị rollback về trạng thái ban đầu.
