# 02 — Enroll Module (UC01)

> **Last updated:** 2026-04-05
> **Related use cases:** UC01
> **Module path:** `src/module/enroll/`

---

## Tổng quan

Module đăng ký giọng nói (Enroll) cho phép operator đưa một người mới vào cơ sở dữ liệu nhận dạng. Quá trình này:

1. Thu nhận file audio + thông tin cá nhân từ Client
2. Lưu file audio lên Local Storage
3. Forward audio tới AI Service để trích xuất và lưu embedding vào Qdrant
4. Lưu metadata cá nhân + hồ sơ giọng nói vào PostgreSQL

> **Thuật ngữ quan trọng:**
>
> - `voice_id`: UUID do **AI Service (Qdrant)** cấp — Backend không tự sinh giá trị này
> - `user.id` trong DB = `voice_id` từ AI Service (đồng bộ)

---

## POST /api/voices/enroll

### Mô tả

Đăng ký giọng nói mới. Nhận `multipart/form-data` gồm file audio và thông tin cá nhân. Trả về `voice_id` sau khi thành công.

### Request

```
POST /api/voices/enroll
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field                    | Type     | Required | Mô tả                                       | Nguồn    |
| ------------------------ | -------- | -------- | ------------------------------------------- | -------- |
| `audio`                  | `File`   | ✅       | File âm thanh WAV/MP3/FLAC/OGG, ≤ 50MB      | Frontend |
| `name`                   | `string` | ✅       | Họ tên đầy đủ, tối đa 100 ký tự             | Frontend |
| `citizen_identification` | `string` | ❌       | Số CCCD / CMND (9–12 chữ số)                | Frontend |
| `phone_number`           | `string` | ❌       | Số điện thoại (10–11 chữ số)                | Frontend |
| `hometown`               | `string` | ❌       | Quê quán                                    | Frontend |
| `job`                    | `string` | ❌       | Nghề nghiệp                                 | Frontend |
| `passport`               | `string` | ❌       | Số hộ chiếu                                 | Frontend |
| `criminal_record`        | `string` | ❌       | JSON string: `[{"case":"...","year":2020}]` | Frontend |

> **Lưu ý:** `criminal_record` được gửi là **JSON string** (do giới hạn của multipart/form-data). Backend parse bằng `JSON.parse()` trước khi validate và lưu DB.

**cURL example:**

```bash
curl -X POST http://localhost:3000/api/voices/enroll \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "audio=@/path/to/voice_sample.wav" \
  -F "name=Nguyễn Văn A" \
  -F "citizen_identification=012345678901" \
  -F "phone_number=0912345678" \
  -F "hometown=Hà Nội" \
  -F "job=Kỹ sư phần mềm" \
  -F 'criminal_record=[{"case":"Trộm cắp tài sản","year":2021}]'
```

### Response thành công — 201 Created

```typescript
interface EnrollResponse {
  statusCode: 201;
  message: string;
  data: {
    voice_id: string; // UUID — do AI Service cấp, lưu trong Qdrant
    user_id: string; // = voice_id — đồng nhất trong hệ thống
    audio_url: string; // URL truy cập file audio (VD: http://localhost:3000/cdn/voices/xxx.m4a)
    name: string; // Tên người dùng
    enrolled_at: string; // ISO 8601 — thời điểm tạo voice_record
  };
}
```

**Example response:**

```json
{
  "statusCode": 201,
  "message": "Đăng ký giọng nói thành công",
  "data": {
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "audio_url": "http://localhost:3000/cdn/voices/f47ac10b.m4a",
    "name": "Nguyễn Văn A",
    "enrolled_at": "2026-04-05T10:00:00.000Z"
  }
}
```

**Nguồn gốc dữ liệu trong response:**

- `voice_id`: **AI Service** trả về (Qdrant point ID)
- `user_id`: **Backend** set = `voice_id` khi INSERT `users`
- `audio_url`: **Backend** tính toán từ đường dẫn file đã lưu
- `enrolled_at`: **Backend** — thời điểm INSERT `voice_records`

### Response lỗi

| Status                      | Điều kiện                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `400 Bad Request`           | File audio không decode được, sai format, hoặc thiếu field `audio`                                   |
| `401 Unauthorized`          | Thiếu hoặc hết hạn access token                                                                      |
| `413 Payload Too Large`     | File audio vượt quá 50MB                                                                             |
| `422 Unprocessable Entity`  | Thiếu field `name` bắt buộc, duration > 10 phút, hoặc AI Service từ chối audio (quá ngắn, noise cao) |
| `500 Internal Server Error` | Lỗi kết nối AI Service, Qdrant, hoặc PostgreSQL                                                      |
| `503 Service Unavailable`   | AI Service không phản hồi trong 30 giây                                                              |

**Example 422 (AI Service từ chối):**

```json
{
  "statusCode": 422,
  "message": "Audio quá ngắn hoặc chất lượng quá thấp để trích xuất embedding. Khuyến nghị ≥ 3–5 giây, SNR > 20dB.",
  "error": "Unprocessable Entity"
}
```

---

## Business Logic — Luồng xử lý UC01

```
Bước 1: Validate đầu vào
  ├─ FileInterceptor('audio') → Multer validate size ≤ 50MB, mime type
  ├─ EnrollVoiceDto → class-validator validate các text fields
  ├─ Nếu file tồn tại: kiểm tra duration ≤ 10 phút (ffprobe)
  └─ Nếu vi phạm → trả lỗi ngay, không lưu file

Bước 2: Lưu file audio local (via UploadService & StorageService)
  └─ File lưu vào /storage/voices/<uuid>.<ext>
     audio_url = `http://<host>/cdn/voices/<uuid>.<ext>`

Bước 3: Forward audio sang AI Service
  └─ POST http://localhost:1112/upload_voice/
     Body: multipart — file audio stream + { name }
     Timeout: 30 giây
     Response: { voice_id: "uuid", status: "success" }
     Nếu lỗi → rollback: xóa file local đã lưu → trả 422/500

Bước 4: Parse criminal_record (nếu có)
  └─ JSON.parse(dto.criminal_record) → validate array schema

Bước 5: INSERT trong Prisma transaction
  ┌─ INSERT users {
  │    id: voice_id,          ← từ AI Service, KHÔNG tự sinh
  │    name,
  │    citizen_identification,
  │    phone_number,
  │    hometown,
  │    job,
  │    passport,
  │    criminal_record,       ← JSONB
  │    audio_url              ← URL CDN
  │  }
  └─ INSERT voice_records {
       user_id: voice_id,
       user_name: user.name,  ← Snapshot name
       voice_id: voice_id,
       audio_file_id,         ← ID file từ bảng audio_files
       is_active: true,
       version: 1
     }

Bước 6: Trả HTTP 201
```

### Prisma transaction example

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  const user = await tx.users.create({
    data: {
      id: voiceId, // từ AI Service
      name: dto.name,
      citizen_identification: dto.citizen_identification,
      phone_number: dto.phone_number,
      hometown: dto.hometown,
      job: dto.job,
      passport: dto.passport,
      criminal_record: dto.criminal_record
        ? (JSON.parse(dto.criminal_record) as Prisma.JsonArray)
        : undefined,
    },
  });

  const voiceRecord = await tx.voice_records.create({
    data: {
      user_id: user.id,
      voice_id: voiceId,
      audio_url: audioUrl,
      is_active: true,
      version: 1,
    },
  });

  return { user, voiceRecord };
});
```

### Rollback khi AI Service thất bại

```typescript
// Sau khi lưu file local, nếu AI Service thất bại:
try {
  const { voice_id } = await this.aiService.uploadVoice(audioPath, dto.name);
  // ...
} catch (error) {
  // Xóa file đã lưu để tránh orphan files
  await fs.unlink(audioPath).catch(() => {});
  throw new UnprocessableEntityException(
    error.response?.message ?? 'AI Service từ chối audio',
  );
}
```

---

## Lưu ý nghiệp vụ

1. **`voice_id` không do Backend sinh:** UUID này là Point ID trong Qdrant, do AI Service cấp. Backend chỉ nhận và lưu lại.
2. **Chất lượng audio:** Khuyến nghị ≥ 3–5 giây, môi trường yên tĩnh (SNR > 20dB). AI Service sẽ trả lỗi nếu audio không đủ chất lượng.
3. **Idempotency:** Không có cơ chế de-dup tự động — nếu cùng một người đăng ký hai lần, sẽ tạo ra hai `voice_id` khác nhau trong Qdrant. Cần kiểm tra trùng lặp ở tầng nghiệp vụ (ví dụ: check `citizen_identification`).
4. **File tồn tại lâu dài:** File trong `/uploads/voices/` không bị xóa tự động — chỉ bị xóa khi gọi `DELETE /api/voices/:id`.

---

## NestJS Implementation Notes

```typescript
// enroll.controller.ts
@Post('enroll')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('audio', multerAudioOptions('voices')))
async enroll(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: EnrollVoiceDto,
) { ... }

// enroll-voice.dto.ts (class-validator)
export class EnrollVoiceDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsString() @IsOptional() @MaxLength(20)
  citizen_identification?: string;

  @IsString() @IsOptional() @Matches(/^[0-9]{10,11}$/)
  phone_number?: string;

  @IsString() @IsOptional()
  hometown?: string;

  @IsString() @IsOptional()
  job?: string;

  @IsString() @IsOptional()
  passport?: string;

  @IsString() @IsOptional()
  // JSON string — parse thủ công trong service sau khi nhận
  criminal_record?: string;
}
```
