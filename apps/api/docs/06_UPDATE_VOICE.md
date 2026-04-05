# 06 — Update Voice Module (UC04)

> **Last updated:** 2026-04-05
> **Related use cases:** UC04
> **Module path:** `src/module/update-voice/`

---

## Tổng quan và bối cảnh nghiệp vụ

Khi hệ thống nhận dạng hoạt động không chính xác (trả về kết quả sai người, hoặc không nhận ra người đã đăng ký), operator có thể thực hiện **cập nhật giọng nói** — quy trình ghi đè embedding cũ trong Qdrant bằng embedding mới được trích xuất từ các đoạn audio mẫu mới.

> **Lưu ý thuật ngữ:** Đây **không phải** huấn luyện lại model AI. Đây chỉ là cập nhật vector đặc trưng (embedding) của một người cụ thể trong cơ sở dữ liệu Qdrant — model AI không thay đổi.

**Khi nào cần cập nhật giọng nói?**

- Chất lượng audio đăng ký ban đầu kém (quá nhiều noise)
- Giọng nói của người thay đổi đáng kể (bệnh, tuổi tác)
- Hệ thống nhận dạng liên tục sai với một người cụ thể

**Luồng xử lý:** Bất đồng bộ (Async) — Backend nhận yêu cầu và trả phản hồi ngay, xử lý nặng thực hiện ở Bull Worker trong background.

---

## PATCH /api/voices/:id/update-voice

### Mô tả

Khởi tạo job cập nhật embedding giọng nói. Trả về `202 Accepted` ngay lập tức kèm `job_id` để theo dõi tiến độ.

> **`:id`** là UUID của user (= voice_id). Backend resolve `voice_id` từ `:id` để gửi sang AI Service.

### Request

```
PATCH /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479/update-voice
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field         | Type     | Required | Mô tả                                                |
| ------------- | -------- | -------- | ---------------------------------------------------- |
| `audio_files` | `File[]` | ✅       | Mảng file audio mẫu mới (1–10 file), mỗi file ≤ 50MB |
| `voice_id`    | `string` | ✅       | voice_id cần cập nhật (= Qdrant point ID)            |

> `audio_files` là mảng — dùng `FilesInterceptor('audio_files', 10)` trong NestJS.

**cURL:**

```bash
curl -X PATCH "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479/update-voice" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "audio_files=@/path/to/sample_1.wav" \
  -F "audio_files=@/path/to/sample_2.wav" \
  -F "voice_id=f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

### Response thành công — 202 Accepted

```typescript
interface UpdateVoiceAcceptedResponse {
  statusCode: 202;
  message: string;
  data: {
    job_id: string; // UUID — do Backend sinh, dùng để tracking
    status: 'PENDING';
    voice_id: string; // Qdrant point ID sẽ được cập nhật
    created_at: string; // ISO 8601
  };
}
```

**Example response:**

```json
{
  "statusCode": 202,
  "message": "Yêu cầu cập nhật giọng nói đã được tiếp nhận. Theo dõi tiến độ tại GET /api/jobs/{job_id}",
  "data": {
    "job_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "PENDING",
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "created_at": "2026-04-05T16:00:00.000Z"
  }
}
```

**Nguồn gốc dữ liệu:**

- `job_id`: **Backend** sinh (`@default(uuid())` trong Prisma)
- `status`: **Backend** set = `PENDING` khi tạo job
- `voice_id`: **Frontend** cung cấp trong form field

### Response lỗi

| Status                     | Điều kiện                                            |
| -------------------------- | ---------------------------------------------------- |
| `400 Bad Request`          | Thiếu `audio_files` hoặc `voice_id`, sai format file |
| `401 Unauthorized`         | Token thiếu/hết hạn                                  |
| `404 Not Found`            | `voice_id` không tồn tại trong DB                    |
| `413 Payload Too Large`    | Tổng kích thước files vượt 50MB/file                 |
| `422 Unprocessable Entity` | Số lượng files > 10                                  |

---

## Luồng xử lý bất đồng bộ — Chi tiết

### Bước 1: Tiếp nhận (Backend Controller/Service)

```typescript
// update-voice.controller.ts
@Patch(':id/update-voice')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FilesInterceptor('audio_files', 10, multerAudioOptions('update-voice/tmp')))
async updateVoice(
  @Param('id') userId: string,
  @UploadedFiles() files: Express.Multer.File[],
  @Body('voice_id') voiceId: string,
) { ... }

// update-voice.service.ts — Bước tiếp nhận
async initiateUpdateVoice(userId: string, voiceId: string, files: Express.Multer.File[]) {
  // 1. Verify user + voice tồn tại
  const user = await prisma.users.findUniqueOrThrow({ where: { id: userId } });

  // 2. Tạo job ID (UUID từ Prisma @default)
  const audioUrls = files.map(f => f.path); // đường dẫn local tạm

  // 3. Di chuyển files vào thư mục job cụ thể
  // /uploads/update-voice/tmp/<file> → /uploads/update-voice/<job_id>/<file>
  // (thực hiện sau khi có job_id)

  // 4. INSERT update_voice_jobs
  const job = await prisma.update_voice_jobs.create({
    data: {
      voice_id: voiceId,
      user_id: userId,
      audio_urls: audioUrls as Prisma.JsonArray,
      status: JobStatus.PENDING,
      progress: 0,
    },
  });

  // 5. Di chuyển files vào /uploads/update-voice/<job.id>/
  await this.organizeJobFiles(job.id, files);

  // 6. Push vào Bull Queue
  await this.updateVoiceQueue.add('update-voice-job', {
    jobId: job.id,
    userId,
    voiceId,
    audioUrls: updatedAudioUrls,
  });

  // 7. Trả 202 ngay — không chờ
  return { job_id: job.id, status: 'PENDING', voice_id: voiceId };
}
```

### Bước 2: Xử lý nền (Bull Worker)

```typescript
// update-voice.processor.ts
@Processor('update-voice')
export class UpdateVoiceProcessor {
  @Process('update-voice-job')
  async handleUpdateVoice(job: Job<UpdateVoiceJobData>) {
    const { jobId, userId, voiceId, audioUrls } = job.data;

    try {
      // --- progress: 0 — bắt đầu ---
      await prisma.update_voice_jobs.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PROCESSING,
          progress: 0,
          updated_at: new Date(),
        },
      });

      // --- progress: 20 — forward sang AI Service ---
      const mergedAudioPath = await this.audioService.mergeFiles(
        audioUrls,
        jobId,
      );
      await this.updateJobProgress(jobId, 20);

      // --- progress: 40 — call AI Service ---
      await this.aiService.updateVoice(mergedAudioPath, voiceId);
      // POST http://localhost:1112/update_voice/
      // body: multipart — audio file + voice_id
      // AI Service ghi đè embedding tương ứng trong Qdrant
      await this.updateJobProgress(jobId, 70);

      // --- progress: 70 — cập nhật DB ---
      await prisma.$transaction([
        // Tạo voice_record phiên bản mới
        prisma.voice_records.create({
          data: {
            user_id: userId,
            voice_id: voiceId,
            audio_url: this.buildAudioUrl(mergedAudioPath),
            is_active: true,
            version: await this.getNextVersion(userId),
          },
        }),
        // Deactivate bản cũ
        prisma.voice_records.updateMany({
          where: {
            user_id: userId,
            is_active: true,
            NOT: { id: newRecord.id },
          },
          data: { is_active: false },
        }),
      ]);
      await this.updateJobProgress(jobId, 90);

      // --- progress: 90 — dọn dẹp file tạm ---
      await this.cleanupTempFiles(jobId, audioUrls);

      // --- progress: 100 — DONE ---
      await prisma.update_voice_jobs.update({
        where: { id: jobId },
        data: { status: JobStatus.DONE, progress: 100, updated_at: new Date() },
      });

      // --- Emit WebSocket event ---
      this.eventsGateway.emit('update_voice.completed', {
        job_id: jobId,
        voice_id: voiceId,
        user_id: userId,
      });
    } catch (error) {
      // --- FAILED: lưu lỗi + emit event ---
      await prisma.update_voice_jobs.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          error_msg: error.message,
          updated_at: new Date(),
        },
      });

      this.eventsGateway.emit('update_voice.failed', {
        job_id: jobId,
        error_msg: error.message,
      });
    }
  }
}
```

### Bước 3: Thông báo Client (WebSocket)

```typescript
// events.gateway.ts
@WebSocketGateway({ namespace: '/jobs', cors: true })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emit(event: string, payload: object) {
    this.server.emit(event, payload);
  }
}
```

**Client-side (Socket.IO):**

```javascript
const socket = io('http://localhost:3000/jobs', {
  auth: { token: accessToken },
});

socket.on('update_voice.completed', ({ job_id, voice_id, user_id }) => {
  console.log(`Job ${job_id} hoàn tất — voice_id: ${voice_id}`);
  // Cập nhật UI, refresh danh sách hồ sơ
});

socket.on('update_voice.failed', ({ job_id, error_msg }) => {
  console.error(`Job ${job_id} thất bại: ${error_msg}`);
  // Hiển thị thông báo lỗi cho người dùng
});

// Fallback: reconnect với exponential backoff
socket.on('disconnect', () => {
  let delay = 1000;
  const reconnect = () => {
    setTimeout(() => {
      socket.connect();
      delay = Math.min(delay * 2, 8000); // 1s → 2s → 4s → 8s (max)
    }, delay);
  };
  reconnect();
});
```

---

## GET /api/jobs/:id

### Mô tả

Theo dõi tiến độ xử lý của một job. Dùng làm fallback polling khi WebSocket mất kết nối.

### Request

```
GET /api/jobs/c3d4e5f6-a7b8-9012-cdef-123456789012
Authorization: Bearer <access_token>
```

**Path parameter:** `id` — UUID của job (từ response của `PATCH /api/voices/:id/update-voice`)

**cURL:**

```bash
curl "http://localhost:3000/api/jobs/c3d4e5f6-a7b8-9012-cdef-123456789012" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Response thành công — 200 OK

```typescript
interface JobStatusResponse {
  statusCode: 200;
  message: string;
  data: {
    job_id: string;
    status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
    progress: number; // 0–100, chỉ có ý nghĩa khi status = PROCESSING hoặc DONE
    voice_id: string; // Qdrant point ID đang được cập nhật
    user_id: string; // UUID người sở hữu
    error_msg: string | null; // null nếu chưa lỗi
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601 — thời điểm cập nhật gần nhất
  };
}
```

**Example — đang xử lý:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "job_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "PROCESSING",
    "progress": 60,
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "error_msg": null,
    "created_at": "2026-04-05T16:00:00.000Z",
    "updated_at": "2026-04-05T16:00:05.000Z"
  }
}
```

**Example — thành công:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "job_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "DONE",
    "progress": 100,
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "error_msg": null,
    "created_at": "2026-04-05T16:00:00.000Z",
    "updated_at": "2026-04-05T16:00:12.000Z"
  }
}
```

**Example — thất bại:**

```json
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "job_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "status": "FAILED",
    "progress": 40,
    "voice_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "error_msg": "AI Service timeout after 30 seconds",
    "created_at": "2026-04-05T16:00:00.000Z",
    "updated_at": "2026-04-05T16:00:42.000Z"
  }
}
```

### Response lỗi

| Status             | Điều kiện           |
| ------------------ | ------------------- |
| `401 Unauthorized` | Token thiếu/hết hạn |
| `404 Not Found`    | Job không tồn tại   |

---

## Vòng đời Job

```
PENDING ──→ PROCESSING ──→ DONE
                │
                └──────────→ FAILED
```

| Status       | Mô tả                             | progress    |
| ------------ | --------------------------------- | ----------- |
| `PENDING`    | Job đã tạo, chờ Worker nhận       | `0`         |
| `PROCESSING` | Worker đang xử lý                 | `0` → `100` |
| `DONE`       | Hoàn tất thành công               | `100`       |
| `FAILED`     | Thất bại, `error_msg` có chi tiết | tùy (0–90)  |

**Polling strategy (Client):**

```
Client: PENDING/PROCESSING → poll mỗi 3 giây
Client: DONE/FAILED → dừng poll
Timeout: nếu sau 5 phút job vẫn PROCESSING → Client hiển thị cảnh báo
```

---

## WebSocket Event Specification

**Namespace:** `/jobs`
**Transport:** Socket.IO

### Event: `update_voice.completed`

Phát khi job hoàn tất thành công.

```typescript
interface UpdateVoiceCompletedEvent {
  job_id: string; // UUID của job — từ DB
  voice_id: string; // Qdrant point ID đã được cập nhật — từ DB
  user_id: string; // UUID người sở hữu — từ DB
}
```

### Event: `update_voice.failed`

Phát khi job thất bại.

```typescript
interface UpdateVoiceFailedEvent {
  job_id: string; // UUID của job — từ DB
  error_msg: string; // Mô tả lỗi — từ exception hoặc AI Service response
}
```

---

## Error Handling

| Tình huống                   | Hành động                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| AI Service timeout           | status=FAILED, error_msg="AI Service timeout after {N}s", emit `update_voice.failed`                           |
| AI Service từ chối audio     | status=FAILED, error_msg từ AI response, emit `update_voice.failed`                                            |
| Lỗi ghi DB sau AI thành công | status=FAILED, log error chi tiết (embedding đã update trong Qdrant nhưng DB chưa sync — cần manual reconcile) |
| Mất kết nối WebSocket        | Client tự reconnect exponential backoff, dùng `GET /api/jobs/:id` để lấy trạng thái                            |
| Worker crash giữa chừng      | Bull tự retry theo cấu hình (`attempts: 3, backoff: 5000ms`)                                                   |

---

## Cấu hình Bull Queue

```typescript
// update-voice.module.ts
BullModule.registerQueue({
  name: 'update-voice',
  defaultJobOptions: {
    attempts: 3, // retry tối đa 3 lần nếu Worker throw error
    backoff: {
      type: 'exponential',
      delay: 5000, // bắt đầu từ 5 giây, tăng theo exponential
    },
    removeOnComplete: false, // giữ lại job DONE để audit
    removeOnFail: false, // giữ lại job FAILED để debug
  },
});
```
