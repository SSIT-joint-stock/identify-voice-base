# 01 — Module Upload File Audio Dùng Chung

> **Last updated:** 2026-04-05
> **Module path:** `src/module/upload/` (hoặc tương đương)

---

## Tổng quan

Module trung tâm xử lý toàn bộ việc tiếp nhận, validate, lưu file audio và ghi nhận vào bảng `audio_files`. Các module khác (`Enroll`, `Identify`, `Update Voice`) **không tự xử lý file** mà đều gọi qua `UploadService`.

### Vai trò trong kiến trúc

```text
EnrollModule      ─┐
IdentifyModule    ─┼──► UploadService ──► Local Disk + audio_files table
UpdateVoiceModule ─┘
```

---

## POST /api/upload/audio

### Mô tả

Upload một hoặc nhiều file audio, trả về danh sách `audio_file_id` để các module khác sử dụng tham chiếu trong các tác vụ nghiệp vụ.

### Request

```http
POST /api/upload/audio
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form fields:**

| Field   | Type          | Required | Mô tả                                                 |
| ------- | ------------- | -------- | ----------------------------------------------------- |
| audio   | File / File[] | ✅       | Một hoặc nhiều file WAV/MP3/FLAC/OGG                  |
| purpose | string (ENUM) | ✅       | Mục đích upload: `ENROLL`, `IDENTIFY`, `UPDATE_VOICE` |

### Response thành công — 201 Created

```json
{
  "statusCode": 201,
  "message": "Upload thành công",
  "data": [
    {
      "audio_file_id": "8f8b3fc9-42b7-4c47-9752-d17e2cf15fa1",
      "file_name": "recording.wav",
      "file_path": "/uploads/voices/8f8b3fc9.wav",
      "mime_type": "audio/wav",
      "size_bytes": 2048000,
      "duration_sec": null,
      "purpose": "ENROLL"
    }
  ]
}
```

> **Lưu ý:** `duration_sec` = null ngay sau khi upload. Field này sẽ được cập nhật (điền giá trị) sau khi AI Service xử lý và cung cấp thông tin.

### Response lỗi

| Status                      | Tình huống                                      |
| --------------------------- | ----------------------------------------------- |
| `400 Bad Request`           | File không đúng định dạng (WAV/MP3/FLAC/OGG)    |
| `413 Payload Too Large`     | File vượt quá 50MB                              |
| `422 Unprocessable Entity`  | Thiếu field `purpose` hoặc giá trị không hợp lệ |
| `500 Internal Server Error` | Lỗi ghi file xuống disk                         |

---

## Business Logic — UploadService

1. Nhận file(s) qua cấu hình Multer (`FileInterceptor` đối với 1 file, `FilesInterceptor` đối với nhiều file).
2. Validate từng file:
   - Kiểm tra mimetype: Chỉ chấp thuận `audio/wav`, `audio/mpeg`, `audio/flac`, `audio/ogg`.
   - Kiểm tra size ≤ 50MB.
3. Sinh UUID làm tên file mới và lưu trữ vào thư mục quy định tuỳ theo `purpose`:
   - `ENROLL` → `/uploads/voices/<uuid>.<ext>`
   - `IDENTIFY` → `/uploads/identify/<uuid>.<ext>`
   - `UPDATE_VOICE` → `/uploads/update-voice/<uuid>.<ext>`
4. Ghi metadata vào database — INSERT bảng `audio_files` (`file_path`, `file_name`, `mime_type`, `size_bytes`, `purpose`, `uploaded_by`).
5. Trả về HTTP 201 kèm danh sách `audio_file_id` cho caller.

---

## Giao diện Public của UploadService

Được sử dụng/nhúng vào các module khác như Enroll, Identify, hay UpdateVoice.

```typescript
// Upload và lưu một file — dùng trong Enroll, Identify
uploadOne(file: Express.Multer.File, purpose: AudioPurpose, uploadedBy: string): Promise<AudioFile>

// Upload và lưu nhiều file — dùng trong Update Voice
uploadMany(files: Express.Multer.File[], purpose: AudioPurpose, uploadedBy: string): Promise<AudioFile[]>

// Xóa file khỏi disk và soft-delete record trong audio_files
deleteFile(audioFileId: string): Promise<void>

// Cập nhật duration_sec sau khi AI Service trả về
updateDuration(audioFileId: string, durationSec: number): Promise<void>
```

### Cách các module khác tương tác:

- **`EnrollService`**: `.uploadOne(file, 'ENROLL', userId)` → Trả về `audio_file_id`.
- **`IdentifyService`**: `.uploadOne(file, 'IDENTIFY', userId)` → Trả về `audio_file_id`.
- **`UpdateVoiceService`**: `.uploadMany(files, 'UPDATE_VOICE', userId)` → Trả về mảng `audio_file_ids`.

---

## Kỹ thuật triển khai trong NestJS (Implementation Notes)

- `UploadModule` export class `UploadService` để module khác dễ dàng import và sử dụng.
- Đăng ký `MulterModule.register()` ở Module Setup với config `diskStorage` nhằm xác định thư mục đích tự động theo logic (ví dụ interceptor tuỳ chỉnh hoặc di chuyển file sau khi handle).
- Sử dụng enum chia sẻ `AudioPurpose` (Prisma) và class validator để kiểm soát logic đầu vào cho `purpose`.
- Tạo Pipe tuỳ chỉnh ví dụ `AudioFileValidationPipe` chuyên trách check Mimetype / Size.

### Prisma Query Example

```typescript
const audioFile = await this.prisma.audio_files.create({
  data: {
    file_path: destPath,
    file_name: originalname,
    mime_type: mimetype,
    size_bytes: size,
    purpose: purpose,
    uploaded_by: userId,
  },
});
```
