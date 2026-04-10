# 06 — Update Voice Module (UC04)

> **Last updated:** 2026-04-09
> **Related use cases:** UC04
> **Module path:** `src/module/update-voice/`

---

## Tổng quan và bối cảnh nghiệp vụ

Khi hệ thống nhận dạng hoạt động không chính xác (trả về kết quả sai người, hoặc không nhận ra người đã đăng ký), operator có thể thực hiện **cập nhật giọng nói** — quy trình bổ sung thông tin mẫu âm thanh mới để cải thiện và cập nhật chất lượng embedding trong Qdrant.

**Rules cốt lõi của chức năng này:**

1. Mỗi user chỉ có đúng **MỘT** bản ghi âm giọng nói active duy nhất (`voice_id`).
2. Quá trình xử lý chạy dưới nền (Background Job qua Bull Queue) và cập nhật tiến trình qua WebSocket theo room riêng của user.
3. **KHÔNG BAO GIỜ** được phép merge (gộp) các file audio. AI engine sẽ nhận một mảng danh sách các files riêng biệt để trích xuất đặc trưng chính xác.
4. Client không gửi `voice_id`, Backend tự động phân định thông qua `user_id` tra cứu trong Database (Single Source of Truth).
5. Chiến lược **Optimistic Versioning** ở tầng DB: phải tạo record DB mới ở trạng thái `is_active = false` trước khi gọi AI. Chỉ activate khi AI trả về thành công bằng cách so sánh version.

---

## PATCH /api/users/:userId/voice/update

### Mô tả

Khởi tạo job cập nhật embedding giọng nói. Trả về `202 Accepted` ngay lập tức kèm `job_id` để theo dõi tiến độ.

> Chú ý: API không còn yêu cầu Frontend gửi `voice_id` nhằm chống bảo mật spoofing. Backend sẽ tự tra cứu bản ghi cuối cùng của user để lấy `voice_id`.

### Request

```
PATCH /api/users/f47ac10b-58cc-4372-a567-0e02b2c3d479/voice/update
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Path params:**
| Param | Type | Required | Mô tả |
| -------- | -------- | -------- | ------------------------- |
| `userId` | `string` | ✅ | UUID của user cần cập nhật|

**Form fields:**
| Field | Type | Required | Mô tả |
| ------------- | -------- | -------- | ---------------------------------------------------- |
| `audio_files` | `File[]` | ✅ | Mảng file audio mẫu mới (1–10 file), mỗi file ≤ 50MB |

**cURL:**

```bash
curl -X PATCH "http://localhost:3000/api/users/f47ac10b-58cc-4372-a567-0e02b2c3d479/voice/update" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "audio_files=@/path/to/sample_1.wav" \
  -F "audio_files=@/path/to/sample_2.wav"
```

### Response thành công — 202 Accepted

```typescript
interface UpdateVoiceAcceptedResponse {
  statusCode: 202;
  message: string;
  data: {
    job_id: string; // UUID — do Backend sinh, dùng để tracking
    status: 'PENDING';
    created_at: string; // ISO 8601
  };
}
```

---

## Luồng xử lý bất đồng bộ — Chi tiết (Worker Flow)

### Bước 1: Tiếp nhận (Backend Controller/Service)

```typescript
// update-voice.controller.ts
@Patch('users/:userId/voice/update')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FilesInterceptor('audio_files', 10, multerAudioOptions('update-voice/tmp')))
async updateVoice(
  @Param('userId') userId: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  return this.updateVoiceService.initiateUpdateVoice(userId, files);
}

// update-voice.service.ts
async initiateUpdateVoice(userId: string, files: Express.Multer.File[]) {
  // 1. Verify user có tồn tại
  const user = await prisma.users.findUniqueOrThrow({ where: { id: userId } });

  // 2. Gom đường dẫn file tạm
  const audioUrls = files.map(f => f.path);

  // 3. INSERT job update
  const job = await prisma.update_voice_jobs.create({
    data: {
      user_id: userId,
      voice_id: '', // Sẽ resolved ở bước worker query DB
      audio_file_ids: audioUrls as Prisma.JsonArray, // Tạm mượn dòng này để chuyển đường đẫn logic
      status: JobStatus.PENDING,
      progress: 0,
    },
  });

  // 4. Push vào Bull Queue
  await this.updateVoiceQueue.add('update-voice-job', {
    jobId: job.id,
    userId,
    tmpFilePaths: audioUrls,
  });

  return { job_id: job.id, status: 'PENDING' };
}
```

### Bước 2: Xử lý nền (Bull Worker) - Cốt Lõi Race Condition Safe

```typescript
// update-voice.processor.ts
@Processor('update-voice')
export class UpdateVoiceProcessor {
  @Process('update-voice-job')
  async handleUpdateVoice(job: Job<UpdateVoiceJobData>) {
    const { jobId, userId, tmpFilePaths } = job.data;

    try {
      // --- Progress: 0 - Lấy thông tin & Resolve voice_id ---
      await this.updateJobProgress(jobId, JobStatus.PROCESSING, 0);

      // Tra cứu version đang active hiện tại
      const currentActiveVoice = await prisma.voice_records.findFirst({
        where: { user_id: userId, is_active: true },
      });
      if (!currentActiveVoice)
        throw new Error('User does not have an active voice.');

      const currentVersion = currentActiveVoice.version;
      const newVersion = currentVersion + 1;
      const voiceId = currentActiveVoice.voice_id;

      // Update lại job_id có chứa voice_id chính xác
      await prisma.update_voice_jobs.update({
        where: { id: jobId },
        data: { voice_id: voiceId },
      });

      // --- Progress: 10 - Tổ chức File Structure theo Version ---
      // Chiến lược tổ chức file dựa trên VERSION người dùng, không phải jobId
      // Dịch chuyển file từ tmp -> uploads/users/userId/voices/v{newVersion}/<file>
      const savedAudioPaths = await this.fileService.moveToVersionFolder(
        userId,
        newVersion,
        tmpFilePaths,
      );

      // Khởi tạo các records cho file ở DB bảng audio_files
      const audioRecords = await this.fileService.createAudioDbRecords(
        savedAudioPaths,
        userId,
      );

      await this.updateJobProgress(jobId, JobStatus.PROCESSING, 20);

      // --- Progress: 20 - Tạo Voice Record Tạm (Prepare) ---
      // CHUẨN BỊ RECORD DB TRƯỚC KHI GỌI AI
      const pendingRecord = await prisma.voice_records.create({
        data: {
          user_id: userId,
          voice_id: voiceId,
          audio_file_id: audioRecords[0].id, // Cấu trúc cũ bắt lưu 1 file
          is_active: false, // <-- QUAN TRỌNG: Vẫn unactive
          version: newVersion,
        },
      });

      // --- Progress: 30 - Call AI Service (Heavy lift) ---
      // QUAN TRỌNG: Gửi NHIỀU files thay vì file merged.
      await this.aiService.updateVoiceMultipleFiles(savedAudioPaths, voiceId);

      // 80% completion since AI is the heavily processing task
      await this.updateJobProgress(jobId, JobStatus.PROCESSING, 80);

      // --- Progress: 80 - Kích Hoạt Phiên Bản (Database Transaction Safe) ---
      await prisma.$transaction(async (tx) => {
        // [Race condition protection]: Deactivate using exact old version number!
        const deactivateResult = await tx.voice_records.updateMany({
          where: {
            user_id: userId,
            version: currentVersion, // Explicit version condition instead of is_active
          },
          data: { is_active: false },
        });

        if (deactivateResult.count === 0) {
          // Nếu có >= 2 jobs đang update cho cùng 1 user,
          // 1 job đã done và đổi version -> Job này sẽ fail. Retry safe
          throw new Error(
            `Race condition detected: Version ${currentVersion} is no longer active.`,
          );
        }

        // Kích hoạt version mới
        await tx.voice_records.update({
          where: { id: pendingRecord.id },
          data: { is_active: true },
        });
      });

      await this.updateJobProgress(jobId, JobStatus.DONE, 100);

      // --- Emit WebSocket event to specific user room ---
      this.eventsGateway.emitToUserRoom(userId, 'update_voice.completed', {
        job_id: jobId,
        voice_id: voiceId,
      });
    } catch (error) {
      await prisma.update_voice_jobs.update({
        where: { id: jobId },
        data: { status: JobStatus.FAILED, error_msg: error.message },
      });
      // Fallback cho Bull có chế độ retry -> Retry-safe
      this.eventsGateway.emitToUserRoom(userId, 'update_voice.failed', {
        job_id: jobId,
        error_msg: error.message,
      });
      // Re-throw for Bull Queue tracking
      throw error;
    }
  }
}
```

### Bước 3: Thông báo Client bằng WebSocket Room-Based

Để đảm bảo hiệu trình truyền tải, Websocket không sử dụng Broadcast global, mà join vào room tương ứng của `user_id`.

```typescript
// events.gateway.ts
@WebSocketGateway({ namespace: '/jobs', cors: true })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Decode JWT token logic => lấy userId
    const userId = this.extractUserIdFromToken(client.handshake.auth.token);
    if (userId) {
      client.join(`user_${userId}`);
    }
  }

  emitToUserRoom(userId: string, event: string, payload: object) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }
}
```

**Client-side (Socket.IO):**

```javascript
socket.on('update_voice.completed', ({ job_id, voice_id }) => {
  console.log(`Job ${job_id} cập nhật embedding cho ID ${voice_id} hoàn tất.`);
});
```

---

## GET /api/jobs/:id

Duy trì behavior chung của `Job Polling`:

```typescript
// Trả về logic GET /api/jobs/:id y như định nghĩa (đã ẩn chi tiết vì không khác biệt)
// Tuy nhiên lúc này progress 0->20 là tạo Record DB, 20->80 là AI xử lý, và 80->100 là commit DB transaction
```

---

## Retry Safety & Race Conditions Constraints

1. **Split-Brain Prevention:** Flow quy định luôn tạo model `voice_records` version mới ở trạng thái offline (inactive) trước. Backend không update Record hiện tại. Nếu AI Service throw logic lỗi hoặc timeout, DB sẽ bỏ dở version không active đó -> Không bị dirty state giữa Qdrant & Database. Qdrant chỉ write đè đặc trưng khi thực sự pass qua hàm AI Core.
2. **Race condition Prevention:** Lệnh `$transaction` áp dụng kỹ thuật **Optimistic Concurrency Control**. Chỉ thực hiện de-activate khi `version` query xuống mapping bằng version cũ đã phát hiện ở bước 1. Nếu `count === 0` (bị 1 thread khác cướp), transaction ném lỗi và huỷ toàn bộ. Bull trigger xử lý retry logic.
3. **Retry-safe File Mover:** Ném file tmp vào thư mục `v<version>`, nếu retry với version mới `newVersion` do concurrent logic failed, nó sẽ tạo ra thư mục `version + 1` độc lập. Rác file offline (record offline) có thể batch script quét xóa định kỳ 1 tuần/lần, hoàn toàn không gây bug hệ thống.
4. **WebSocket Notification Isolation:** Không lo lộ lọt metrics và data jobs của user khác khi chỉ gửi Socket IO Notification xuống `user_${userId}` room channel.

---

## Cấu hình Bull Queue (Vẫn giữ Retry Mechanism)

```typescript
BullModule.registerQueue({
  name: 'update-voice',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // Auto clean Queue jobs successfully handled
  },
});
```
