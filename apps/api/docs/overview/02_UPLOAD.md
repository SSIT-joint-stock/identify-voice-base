# 01_UPLOAD — Module Upload File Audio

**Last updated:** 2026-03-29  
**Related use cases:** UC01 (Enroll), UC02 (Identify Single), UC03 (Identify Multi), UC04 (Update Voice)  
**Status:** DRAFT

---

## 1. Tổng quan

`UploadModule` là module **dùng chung (shared module)** trong hệ thống. Nó chịu trách nhiệm toàn bộ vòng đời tiếp nhận file audio từ client: validate, lưu xuống local disk, và ghi nhận metadata vào bảng `audio_files`.

Các module nghiệp vụ khác — `EnrollModule`, `IdentifyModule`, `UpdateVoiceModule` — **không tự xử lý file**. Tất cả đều inject `UploadService` và gọi qua đó, đảm bảo logic lưu file và quản lý `audio_files` chỉ tồn tại ở một nơi duy nhất.

```
EnrollModule      ─┐
IdentifyModule    ─┼──► UploadService ──► Local Disk (/uploads/...)
UpdateVoiceModule ─┘                  └──► audio_files table (PostgreSQL)
```

---

## 2. Yêu cầu & Ràng buộc Audio Đầu Vào

Tất cả các ràng buộc dưới đây được kiểm tra tập trung tại `UploadModule` — trước khi file được ghi xuống disk và trước khi bất kỳ module nào forward sang AI Service.

### 2.1. Bảng tổng hợp

| Thông số                          | Yêu cầu / Giới hạn       | Ghi chú                                                                                                                   |
| --------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Format**                        | WAV, MP3, FLAC, OGG      | Các format `librosa` hỗ trợ. Kiểm tra qua `mimetype`                                                                      |
| **Dung lượng tối đa**             | ≤ 50MB                   | ⚠️ Áp dụng cho **tất cả** endpoint. Kiểm tra tại Multer trước khi đọc vào memory                                          |
| **Độ dài tối đa**                 | ≤ 10 phút (600 giây)     | ⚠️ File > 10 phút có thể làm sập AI Service khi chạy Speaker Diarization. Kiểm tra sau khi lưu file bằng `music-metadata` |
| **Độ dài tối thiểu** (chỉ Enroll) | ≥ 3 giây                 | Cần đủ dữ liệu để AI học đặc trưng giọng nói chính xác. Kiểm tra tại `EnrollService` sau khi có `durationSec`             |
| **Sample rate**                   | Bất kỳ                   | AI Service tự động resample về 16.000 Hz — backend không cần xử lý                                                        |
| **Kênh âm thanh**                 | Bất kỳ (mono / stereo)   | AI Service tự động convert về mono — backend không cần xử lý                                                              |
| **Chất lượng**                    | Khuyến nghị ít noise nền | Không validate tự động — chỉ ghi chú cho người dùng. Noise cao làm giảm độ chính xác nhận dạng                            |

### 2.2. Tầng kiểm tra và trách nhiệm

Việc kiểm tra được chia thành **3 tầng** theo thứ tự xử lý:

```
Tầng 1 — Multer (trước khi đọc file)
  └── size > 50MB → reject ngay, không đọc vào bộ nhớ (413)

Tầng 2 — AudioValidationPipe (sau khi Multer nhận file, trước khi vào service)
  └── mimetype không hợp lệ → 400
  └── file rỗng / không có file → 422

Tầng 3 — UploadService.validateDuration() (sau khi lưu file xuống disk)
  └── dùng music-metadata đọc duration thực tế từ file
  └── duration > 600 giây → xóa file vừa lưu, trả 422
  └── duration < 3 giây + purpose = ENROLL → xóa file vừa lưu, trả 422
```

> **Lý do tách tầng:** Size và mimetype kiểm tra được trước khi ghi disk. Còn duration bắt buộc phải đọc nội dung file (qua `music-metadata`) — chỉ làm được sau khi file đã lưu xuống local.

### 2.3. Bảng response lỗi đầy đủ

| HTTP  | Tầng phát hiện         | Điều kiện                            | `message`                                                                |
| ----- | ---------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `400` | Pipe                   | mimetype không phải WAV/MP3/FLAC/OGG | `"Định dạng file không được hỗ trợ. Chỉ chấp nhận WAV, MP3, FLAC, OGG"`  |
| `413` | Multer                 | File > 50MB                          | `"File vượt quá giới hạn 50MB"`                                          |
| `422` | Pipe                   | Không có file trong request          | `"Vui lòng đính kèm ít nhất một file audio"`                             |
| `422` | Pipe                   | `purpose` thiếu hoặc không hợp lệ    | `"purpose không hợp lệ. Giá trị hợp lệ: ENROLL, IDENTIFY, UPDATE_VOICE"` |
| `422` | UploadService          | Duration > 600 giây                  | `"File audio vượt quá giới hạn 10 phút"`                                 |
| `422` | UploadService (Enroll) | Duration < 3 giây                    | `"File audio quá ngắn. Yêu cầu tối thiểu 3 giây để đăng ký giọng nói"`   |
| `500` | UploadService          | Lỗi ghi file xuống disk              | `"Lỗi hệ thống khi lưu file"`                                            |
| `500` | UploadService          | `music-metadata` không đọc được file | `"Không thể đọc thông tin file audio"`                                   |

---

## 3. Data Model — Bảng `audio_files`

Bảng trung tâm lưu metadata của tất cả file audio được upload vào hệ thống.

```prisma
enum AudioPurpose {
  ENROLL
  IDENTIFY
  UPDATE_VOICE
}

model AudioFile {
  id          String        @id @default(uuid())
  filePath    String        @unique                   // Đường dẫn local tuyệt đối
  fileName    String                                  // Tên file gốc khi upload
  mimeType    String                                  // audio/wav | audio/mpeg | audio/flac | audio/ogg
  sizeBytes   Int                                     // Dung lượng bytes
  durationSec Float?                                  // Thời lượng (giây) — null cho đến khi AI xử lý xong
  purpose     AudioPurpose                            // Mục đích upload
  uploadedBy  String                                  // FK → auth_accounts.id
  createdAt   DateTime      @default(now())
  deletedAt   DateTime?                               // Soft-delete — null = còn tồn tại

  uploader        AuthAccount       @relation(fields: [uploadedBy], references: [id])
  voiceRecords    VoiceRecord[]
  identifySessions IdentifySession[]

  @@index([purpose])
  @@index([uploadedBy])
  @@index([deletedAt])
  @@map("audio_files")
}
```

**Quy tắc quan trọng:**

- `filePath` là UNIQUE — không bao giờ có 2 record trỏ đến cùng một file trên disk.
- `durationSec` được điền sau khi AI Service xử lý và trả về — không có tại thời điểm upload.
- `deletedAt != null` nghĩa là file đã bị xóa khỏi disk. Các service khác **không được** dùng `filePath` của record đã soft-delete.

---

## 4. Cấu trúc thư mục lưu file

```
/uploads/
  voices/           ← file audio enroll hồ sơ giọng nói
  identify/         ← file audio dùng để nhận dạng (single / multi)
  update-voice/     ← file audio tạm dùng để cập nhật embedding
```

Mỗi file được lưu với tên `<uuid>.<ext>` (không giữ tên gốc) để tránh conflict và path traversal.

| `purpose`      | Thư mục đích             |
| -------------- | ------------------------ |
| `ENROLL`       | `/uploads/voices/`       |
| `IDENTIFY`     | `/uploads/identify/`     |
| `UPDATE_VOICE` | `/uploads/update-voice/` |

---

## 5. API Endpoint

### `POST /api/upload/audio`

Upload một hoặc nhiều file audio. Trả về danh sách `audio_file_id` để các service khác sử dụng tiếp.

> **Lưu ý:** Trong thực tế, các module Enroll / Identify / Update Voice thường nhận file trực tiếp trong request của chính chúng và gọi `UploadService` nội bộ — không bắt buộc client phải gọi endpoint này riêng. Endpoint này tồn tại để hỗ trợ upload độc lập khi cần.

#### Request

```
POST /api/upload/audio
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

| Field     | Type            | Required | Mô tả                                               |
| --------- | --------------- | -------- | --------------------------------------------------- |
| `audio`   | `File / File[]` | ✅       | Một hoặc nhiều file âm thanh WAV / MP3 / FLAC / OGG |
| `purpose` | `string`        | ✅       | Mục đích: `ENROLL` \| `IDENTIFY` \| `UPDATE_VOICE`  |

**Ví dụ cURL — upload một file:**

```bash
curl -X POST http://localhost:3000/api/upload/audio \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/recording.wav" \
  -F "purpose=ENROLL"
```

**Ví dụ cURL — upload nhiều file:**

```bash
curl -X POST http://localhost:3000/api/upload/audio \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/segment1.wav" \
  -F "audio=@/path/to/segment2.wav" \
  -F "purpose=UPDATE_VOICE"
```

#### Response thành công — `201 Created`

```json
{
  "statusCode": 201,
  "message": "Upload thành công",
  "data": [
    {
      "audio_file_id": "a1b2c3d4-...",
      "file_name": "recording.wav",
      "file_path": "/uploads/voices/a1b2c3d4-....wav",
      "mime_type": "audio/wav",
      "size_bytes": 2048000,
      "duration_sec": null,
      "purpose": "ENROLL",
      "created_at": "2026-03-29T10:00:00.000Z"
    }
  ]
}
```

> `duration_sec` luôn là `null` tại thời điểm upload. Sẽ được cập nhật sau khi AI Service xử lý và `UploadService.updateDuration()` được gọi.

#### Response lỗi

| HTTP Status | Điều kiện                                               | `message`                                                                |
| ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `400`       | File không đúng định dạng (không phải WAV/MP3/FLAC/OGG) | `"Định dạng file không được hỗ trợ. Chỉ chấp nhận WAV, MP3, FLAC, OGG"`  |
| `413`       | File vượt quá 50MB                                      | `"File vượt quá giới hạn 50MB"`                                          |
| `422`       | Không có file nào trong request                         | `"Vui lòng đính kèm ít nhất một file audio"`                             |
| `422`       | `purpose` thiếu hoặc không hợp lệ                       | `"purpose không hợp lệ. Giá trị hợp lệ: ENROLL, IDENTIFY, UPDATE_VOICE"` |
| `422`       | Duration > 600 giây                                     | `"File audio vượt quá giới hạn 10 phút"`                                 |
| `422`       | Duration < 3 giây (chỉ khi `purpose = ENROLL`)          | `"File audio quá ngắn. Yêu cầu tối thiểu 3 giây để đăng ký giọng nói"`   |
| `500`       | Lỗi ghi file xuống disk                                 | `"Lỗi hệ thống khi lưu file"`                                            |
| `500`       | `music-metadata` không đọc được file                    | `"Không thể đọc thông tin file audio"`                                   |

---

## 6. Business Logic — `UploadService`

### 6.1. Luồng xử lý `uploadOne` / `uploadMany`

```
Tầng 1 — Multer (tự động)
  size > 50MB → reject 413 trước khi vào controller

Tầng 2 — AudioValidationPipe
  file rỗng          → 422 UnprocessableEntityException
  mimetype không hợp lệ → 400 BadRequestException
  purpose không hợp lệ  → 422 UnprocessableEntityException
       │
       ▼
Tầng 3 — UploadService
  Sinh UUID → xác định thư mục đích theo purpose
  Ghi file xuống disk: /uploads/<purpose-dir>/<uuid>.<ext>
       │
       ├── Lỗi ghi ──► throw InternalServerErrorException (500)
       │
       ▼
  Đọc duration thực tế bằng music-metadata (parseFile)
       │
       ├── parse lỗi ──► xóa file vừa ghi, throw InternalServerErrorException (500)
       │
       ├── duration > 600s ──► xóa file vừa ghi, throw UnprocessableEntityException (422)
       │                       "File audio vượt quá giới hạn 10 phút"
       │
       ├── duration < 3s && purpose = ENROLL
       │               ──► xóa file vừa ghi, throw UnprocessableEntityException (422)
       │                   "File audio quá ngắn. Yêu cầu tối thiểu 3 giây để đăng ký giọng nói"
       │
       ▼
  INSERT audio_files {
    filePath, fileName, mimeType,
    sizeBytes, durationSec, purpose, uploadedBy
  }
       │
       ▼
  Trả về AudioFile record (durationSec đã có giá trị thực)
```

> **Lưu ý:** Với luồng này, `durationSec` trong `audio_files` được điền ngay tại bước upload qua `music-metadata` — **không cần chờ AI Service**. `UploadService.updateDuration()` chỉ dùng khi AI Service trả về duration chính xác hơn (ví dụ sau khi chuẩn hóa audio).

### 5.2. Luồng xử lý `deleteFile`

```
Nhận audioFileId
       │
       ▼
Query audio_files WHERE id = audioFileId AND deletedAt IS NULL
       │
       ├── Không tìm thấy ──► throw NotFoundException
       │
       ▼
fs.unlink(filePath)          ← xóa file khỏi disk
       │
       ├── Lỗi unlink (file không tồn tại) ──► log warning, tiếp tục (không throw)
       │
       ▼
UPDATE audio_files SET deletedAt = NOW()  ← soft-delete record
```

> Lỗi `unlink` không throw exception vì file có thể đã bị xóa thủ công — điều quan trọng là record trong DB phải được soft-delete.

### 5.3. Luồng xử lý `updateDuration`

```
Nhận audioFileId + durationSec (float, giây)
       │
       ▼
UPDATE audio_files SET durationSec = durationSec WHERE id = audioFileId
```

Được gọi bởi `EnrollService` và `IdentifyService` ngay sau khi nhận response từ AI Service.

---

## 7. Public Methods của `UploadService`

```typescript
interface AudioFile {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;       // Luôn có giá trị sau khi upload — đọc từ music-metadata
  purpose: AudioPurpose;
  uploadedBy: string;
  createdAt: Date;
  deletedAt: Date | null;
}

// Upload và lưu một file — dùng trong EnrollService, IdentifyService
// Bao gồm validate mimetype, size (Multer), duration (music-metadata)
uploadOne(
  file: Express.Multer.File,
  purpose: AudioPurpose,
  uploadedBy: string,
): Promise<AudioFile>

// Upload và lưu nhiều file — dùng trong UpdateVoiceService
uploadMany(
  files: Express.Multer.File[],
  purpose: AudioPurpose,
  uploadedBy: string,
): Promise<AudioFile[]>

// Xóa file khỏi disk và soft-delete record — dùng khi rollback hoặc cleanup
deleteFile(audioFileId: string): Promise<void>

// Cập nhật duration_sec nếu AI Service trả về giá trị chính xác hơn music-metadata
// (ví dụ: sau khi chuẩn hóa audio về 16kHz mono)
updateDuration(audioFileId: string, durationSec: number): Promise<void>
```

---

## 8. Cách các module khác sử dụng `UploadService`

### EnrollService

```typescript
// 1. Upload file
const audioFile = await this.uploadService.uploadOne(
  file,
  AudioPurpose.ENROLL,
  userId,
);

// 2. Forward sang AI Service, nhận voice_id + duration_sec
const { voice_id, duration_sec } = await this.aiService.uploadVoice(
  audioFile.filePath,
  params,
);

// 3. Cập nhật duration vào audio_files
await this.uploadService.updateDuration(audioFile.id, duration_sec);

// 4. INSERT users + voice_records
// ...

// Rollback nếu AI Service lỗi:
// await this.uploadService.deleteFile(audioFile.id);
```

### IdentifyService

```typescript
const audioFile = await this.uploadService.uploadOne(
  file,
  AudioPurpose.IDENTIFY,
  userId,
);
const results = await this.aiService.identifyVoice(audioFile.filePath);
await this.uploadService.updateDuration(audioFile.id, results.duration_sec);
// INSERT identify_sessions với audio_file_id = audioFile.id
```

### UpdateVoiceService

```typescript
// Tiếp nhận nhiều file audio mẫu mới
const audioFiles = await this.uploadService.uploadMany(
  files,
  AudioPurpose.UPDATE_VOICE,
  userId,
);
const audioFileIds = audioFiles.map((f) => f.id);

// INSERT update_voice_jobs với audio_file_ids = audioFileIds
// Push job vào Bull Queue
// Worker sẽ query audio_files theo audioFileIds để lấy filePath và xử lý
```

---

## 9. NestJS Implementation Notes

### Cấu trúc module

```typescript
// upload.module.ts
@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, file, cb) => {
          // Tạm lưu vào /uploads/tmp/ — UploadService sẽ move sang đúng thư mục
          cb(null, '/uploads/tmp/');
        },
        filename: (_req, _file, cb) => {
          cb(null, `${uuidv4()}`); // không có ext — UploadService tự xử lý
        },
      }),
      limits: { fileSize: 52_428_800 }, // 50MB
    }),
    PrismaModule,
  ],
  providers: [UploadService],
  exports: [UploadService], // ← bắt buộc export để các module khác inject được
})
export class UploadModule {}
```

### `AudioValidationPipe`

Pipe kiểm tra **mimetype** và **purpose** ngay tại tầng controller — trước khi bất kỳ logic service nào chạy. Áp dụng ở tất cả controller nhận file audio.

```typescript
// audio-validation.pipe.ts
@Injectable()
export class AudioValidationPipe implements PipeTransform {
  private readonly ALLOWED_MIMETYPES = [
    'audio/wav',
    'audio/mpeg',
    'audio/flac',
    'audio/ogg',
  ];

  private readonly ALLOWED_PURPOSES: AudioPurpose[] = [
    AudioPurpose.ENROLL,
    AudioPurpose.IDENTIFY,
    AudioPurpose.UPDATE_VOICE,
  ];

  transform(value: { file: Express.Multer.File; purpose: string }) {
    const { file, purpose } = value;

    if (!file) {
      throw new UnprocessableEntityException(
        'Vui lòng đính kèm ít nhất một file audio',
      );
    }
    if (!this.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng file không được hỗ trợ. Chỉ chấp nhận WAV, MP3, FLAC, OGG',
      );
    }
    if (!purpose || !this.ALLOWED_PURPOSES.includes(purpose as AudioPurpose)) {
      throw new UnprocessableEntityException(
        'purpose không hợp lệ. Giá trị hợp lệ: ENROLL, IDENTIFY, UPDATE_VOICE',
      );
    }

    return value;
  }
}
```

### `validateDuration()` trong `UploadService`

Hàm nội bộ dùng `music-metadata` để đọc duration thực tế sau khi file đã ghi xuống disk. Không cần cài FFmpeg trên server.

```bash
npm install music-metadata
```

```typescript
import * as mm from 'music-metadata';

// Dùng nội bộ trong uploadOne / uploadMany — không export ra ngoài
private async validateDuration(
  filePath: string,
  purpose: AudioPurpose,
): Promise<number> {
  let durationSec: number;

  try {
    const metadata = await mm.parseFile(filePath);
    durationSec = metadata.format.duration ?? 0;
  } catch (err) {
    await fs.promises.unlink(filePath);
    throw new InternalServerErrorException('Không thể đọc thông tin file audio');
  }

  if (durationSec > 600) {
    await fs.promises.unlink(filePath);
    throw new UnprocessableEntityException('File audio vượt quá giới hạn 10 phút');
  }

  if (purpose === AudioPurpose.ENROLL && durationSec < 3) {
    await fs.promises.unlink(filePath);
    throw new UnprocessableEntityException(
      'File audio quá ngắn. Yêu cầu tối thiểu 3 giây để đăng ký giọng nói',
    );
  }

  return durationSec;
}
```

### Cách import trong module khác

```typescript
// enroll.module.ts
@Module({
  imports: [UploadModule], // ← import UploadModule là đủ
  providers: [EnrollService],
  controllers: [EnrollController],
})
export class EnrollModule {}
```

### ServeStaticModule — phục vụ file audio qua HTTP

```typescript
// app.module.ts
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', 'uploads'),
  serveRoot: '/uploads',       // URL prefix: http://host/uploads/voices/uuid.wav
  serveStaticOptions: {
    index: false,              // không serve index.html
    fallthrough: false,        // trả 404 thay vì pass-through khi không tìm thấy
  },
}),
```

---

## 10. Prisma Query Examples

### INSERT audio_files

```typescript
const audioFile = await this.prisma.audioFile.create({
  data: {
    filePath: destPath,
    fileName: originalname,
    mimeType: mimetype,
    sizeBytes: size,
    purpose: purpose,
    uploadedBy: userId,
  },
});
```

### UPDATE duration

```typescript
await this.prisma.audioFile.update({
  where: { id: audioFileId },
  data: { durationSec: durationSec },
});
```

### Soft-delete

```typescript
await this.prisma.audioFile.update({
  where: { id: audioFileId },
  data: { deletedAt: new Date() },
});
```

### Query file còn tồn tại

```typescript
const audioFile = await this.prisma.audioFile.findFirst({
  where: {
    id: audioFileId,
    deletedAt: null, // chỉ lấy file chưa bị xóa
  },
});
```

---

## 11. Lưu ý & Rủi ro

| Rủi ro                                      | Tình huống                                      | Xử lý                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| File ghi được nhưng INSERT DB lỗi           | Disk có file nhưng DB không có record           | Wrap trong try/catch: nếu INSERT lỗi thì `fs.unlink` file vừa ghi                                                            |
| File bị xóa thủ công khỏi disk              | `deletedAt = null` nhưng file không còn tồn tại | Service gọi `fs.existsSync(filePath)` trước khi dùng — nếu không tồn tại thì log + trả `audio_available: false`              |
| Tên thư mục không tồn tại khi deploy mới    | `fs.writeFile` throw `ENOENT`                   | Khi app khởi động, `UploadService.onModuleInit()` tự tạo các thư mục cần thiết bằng `fs.mkdirSync(..., { recursive: true })` |
| Hai request upload cùng lúc sinh trùng UUID | Cực kỳ hiếm nhưng có thể xảy ra                 | `filePath` là UNIQUE trong DB — nếu trùng sẽ throw Prisma unique constraint error, client retry                              |
