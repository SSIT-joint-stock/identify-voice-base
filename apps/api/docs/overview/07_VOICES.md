# 03 — Voices Module (UC06)

> **Last updated:** 2026-04-05
> **Related use cases:** UC06
> **Module path:** `src/module/voices/`

---

## Tổng quan

Module quản lý hồ sơ giọng nói cung cấp các thao tác quản lý dữ liệu **Business Truth** (đã được xác thực). Dữ liệu tại đây là nguồn tin cậy nhất để định danh người dùng trong các phiên nhận dạng.

- `GET /api/voices` — Danh sách hồ sơ (Active only)
- `GET /api/voices/:id` — Chi tiết hồ sơ + lịch sử nhận dạng
- `PATCH /api/voices/:id` — Cập nhật thông tin cá nhân
- `PATCH /api/voices/:id/deactivate` — Vô hiệu hóa hồ sơ (Archive)

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

| Param        | Type     | Default | Mô tả                                                                                                                                 |
| ------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `page`       | `number` | `1`     | Số trang (bắt đầu từ 1)                                                                                                               |
| `page_size`  | `number` | `10`    | Kích thước trang, tối đa `100`                                                                                                        |
| `search`     | `string` | —       | Tìm kiếm theo `name`, `citizen_identification`, `phone_number`, `job`, `hometown`, `passport`, `criminal_record`, `age` hoặc `gender` |
| `sort_by`    | `enum`   | `name`  | Trường sắp xếp: `name` hoặc `enrolled_at`                                                                                             |
| `sort_order` | `enum`   | `asc`   | Chiều sắp xếp: `asc` hoặc `desc`                                                                                                      |

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
  passport: string | null;
  hometown: string | null;
  age: number | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  job: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
  audio_url: string; // URL phát lại
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
        "passport": "B1234567",
        "hometown": "Hà Nội",
        "age": 30,
        "gender": "MALE",
        "job": "Kỹ sư phần mềm",
        "criminal_record": [],
        "audio_url": "http://localhost:3000/api/v1/sessions/.../audio",
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
const searchAge = search ? Number(search) : NaN;
const searchGender = Object.values(UserGender).find(
  (gender) => gender.toLowerCase() === search?.toLowerCase(),
);

const where: Prisma.voice_recordsWhereInput = {
  is_active: true,
  user: search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { citizen_identification: { contains: search } },
          { phone_number: { contains: search } },
          { job: { contains: search, mode: 'insensitive' } },
          { hometown: { contains: search, mode: 'insensitive' } },
          { passport: { contains: search } },
          {
            criminal_record: {
              path: ['0', 'case'],
              string_contains: search,
            },
          },
          ...(Number.isInteger(searchAge)
            ? [{ age: { equals: searchAge } }]
            : []),
          ...(searchGender ? [{ gender: { equals: searchGender } }] : []),
        ],
      }
    : undefined,
};
```

`criminal_record` là JSONB array dạng `[{ "case": "...", "year": 2021 }]`, nên backend search qua Prisma JSON `path` trên các phần tử `criminal_record[n].case` và `criminal_record[n].year`.

> **Lưu ý:** Chỉ trả về các bản ghi có `is_active = true`. Các bản ghi bị vô hiệu hóa sẽ bị ẩn khỏi danh sách này.

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
    age: number | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    criminal_record: Array<{ case: string; year: number }> | null;
    // Hồ sơ giọng nói hiện tại — từ voice_records (is_active=true)
    audio_url: string;
    audio_available: boolean; // true nếu audio_file_id hợp lệ
    is_active: boolean;
    enrolled_at: string;
    // Lịch sử nhận dạng (5 phiên gần nhất)
    identify_history: Array<{
      session_id: string;
      identified_at: string;
      score: number | null; // score từ results JSON
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
    "age": 30,
    "gender": "MALE",
    "criminal_record": [{ "case": "Trộm cắp tài sản", "year": 2021 }],
    "audio_url": "http://localhost:3000/api/v1/...",
    "audio_available": true,
    "is_active": true,
    "enrolled_at": "2026-04-05T10:00:00.000Z",
    "voice_history": [
      {
        "audio_url": "http://localhost:3000/api/v1/...",
        "created_at": "2026-04-05T10:00:00.000Z",
        "is_active": true
      }
    ],
    "identify_history": [
      {
        "session_id": "uuid-xxx",
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
    voice_records: { orderBy: { created_at: 'asc' } },
  },
});

// 2. Kiểm tra file audio tồn tại trên disk
const activeRecord = user.voice_record;
// Kiểm tra sự tồn tại của audio_file_id
const audioAvailable = !!activeRecord?.audio_file_id;

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

## PATCH /api/voices/:id

### Mô tả

Cập nhật thông tin cá nhân. **Không thay đổi embedding AI trong Qdrant.**

### Request

```
PATCH /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
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
  age?: number; // >= 0
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  criminal_record?: Array<{ case: string; year: number }>;
}
```

**Example body:**

```json
{
  "phone_number": "0987654321",
  "job": "Công an",
  "age": 32,
  "gender": "MALE",
  "criminal_record": []
}
```

**cURL:**

```bash
curl -X PATCH "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"0987654321","job":"Công an","age":32,"gender":"MALE"}'
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
    "age": 32,
    "gender": "MALE",
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
    ...(dto.age !== undefined && { age: dto.age }),
    ...(dto.gender !== undefined && { gender: dto.gender }),
    ...(dto.criminal_record !== undefined && {
      criminal_record: dto.criminal_record as Prisma.JsonArray,
    }),
  },
});
```

---

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

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  age?: number;

  @IsEnum(UserGender)
  @IsOptional()
  gender?: UserGender;

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

1. **`PATCH` không thay đổi embedding:** Thông tin cá nhân (tên, CCCD, điện thoại, tuổi, giới tính...) lưu trong PostgreSQL độc lập với đặc trưng giọng nói (vector embedding trong Qdrant). Hai hệ thống liên kết qua `voice_id`.
2. **`audio_available: false`:** Nếu file bị xóa tay ngoài hệ thống, response vẫn trả dữ liệu bình thường nhưng đánh dấu `audio_available: false`. Frontend nên ẩn nút phát audio trong trường hợp này.
3. **Ưu tiên tiêu hủy Biometric:** Nếu bước xóa Qdrant thất bại, hệ thống dừng lại ngay lập tức và giữ nguyên dữ liệu trong DB để đảm bảo không mất dấu vết (traceability) và cho phép xóa lại sau. Các bước sau (xóa file, xóa DB) sẽ chỉ thực hiện nếu biometric data đã được xác nhận tiêu hủy thành công.
