# 08_STORAGE — Kiến trúc Lưu trữ (Storage Architecture)

**Last updated:** 2026-04-06
**Status:** FINAL

---

## 1. Tổng quan

Hệ thống sử dụng mô hình **Storage Abstraction Layer** để tách biệt logic nghiệp vụ khỏi chi tiết hạ tầng lưu trữ. Điều này cho phép hệ thống chuyển đổi linh hoạt giữa lưu trữ Local Disk, AWS S3, Google Cloud Storage mà không cần sửa đổi `UploadService`.

## 2. Các thành phần chính

### 2.1. `StorageService` (Facade)

Là điểm truy cập duy nhất cho ứng dụng. Nó không chứa logic lưu trữ cụ thể mà điều phối công việc cho các Driver.

- **Nhiệm vụ:**
  - Khởi tạo thư mục (Init) khi ứng dụng start.
  - Phân luồng file tới Driver đang được cấu hình (`local`, `s3`, ...).
  - Cung cấp phương thức `save`, `delete`, `exists`.

### 2.2. `StorageDriver` (Interface)

Định nghĩa hợp đồng (contract) mà tất cả các driver phải tuân thủ.

```typescript
export interface StorageDriver {
  save(
    stream: Readable,
    destDir: string,
    fileName: string,
  ): Promise<StorageSaveResult>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  onInit?(subDirs: string[]): Promise<void>;
}
```

### 2.3. driver thực thi (`LocalStorageDriver`)

Hiện tại, hệ thống sử dụng `LocalStorageDriver` để lưu file vào server cục bộ.

- **Luồng hoạt động:** Sử dụng `stream/promises.pipeline` để ghi dữ liệu từ `ReadableStream` xuống `fs.WriteStream`.
- **Ưu điểm:** Tiết kiệm RAM khi xử lý file lớn và tự động cleanup nếu giữa chừng bị lỗi.

---

## 3. Cấu hình (Environment Variables)

Toàn bộ cấu hình được quản lý qua `STORAGE_` prefix trong file `.env`:

| Biến ENV                | Mô tả                          | Giá trị ví dụ               |
| :---------------------- | :----------------------------- | :-------------------------- |
| `STORAGE_DRIVER`        | Driver đang sử dụng            | `local`                     |
| `STORAGE_ROOT_DIR`      | Thư mục gốc (cho Local Driver) | `./storage`                 |
| `STORAGE_PUBLIC_DIR`    | Tên thư mục public             | `public`                    |
| `STORAGE_MAX_SIZE`      | Giới hạn dung lượng (bytes)    | `52428800` (50MB)           |
| `STORAGE_ALLOWED_MIMES` | Các loại audio cho phép        | `audio/wav,audio/mpeg...`   |
| `STORAGE_CDN_URL`       | URL base để truy cập file      | `http://localhost:3000/cdn` |

---

## 4. Cấu trúc lưu trữ (Local)

Mặc định, các file được phân bổ như sau:

```
{STORAGE_ROOT_DIR}/
  ├── voices/         # Chứa audio Enrollment
  ├── identify/       # Chứa audio nhận dạng
  └── update-voice/   # Chứa audio dùng để cập nhật embedding
```

**Lưu ý:** `storageKey` lưu trong DB sẽ có dạng `voices/uuid.wav` (đường dẫn tương đối tính từ root).

---

## 5. Hướng dẫn mở rộng (Cloud Storage)

Để tích hợp AWS S3 hoặc Minio:

1.  Tạo `S3StorageDriver` thực thi interface `StorageDriver`.
2.  Sử dụng `@aws-sdk/lib-storage` để hỗ trợ ghi stream (Upload) hiệu quả.
3.  Cập nhật `StorageModule` để cung cấp `S3StorageDriver` khi `STORAGE_DRIVER=s3`.

## 6. Cleanup & Bảo trì

- **Tự động Rollback:** Nếu `UploadService` gặp lỗi DB sau khi tải file lên, nó sẽ tự động gọi phương thức `delete` của Storage để đảm bảo không tồn tại file "mồ côi".
- **Soft-delete:** Khi xóa bản ghi audio trong DB, file vật lý sẽ được xóa thật để tiết kiệm dung lượng, trong khi bản ghi DB chỉ đánh dấu `deleted_at`.
