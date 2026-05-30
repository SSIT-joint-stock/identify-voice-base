# Batch File Worker

## Luồng xử lý

1. API nhận multipart upload tại `POST /ai-core/audio-translate-batches`.
2. `CreateBatchFileUseCase` tạo batch state trong Redis, lưu file gốc vào storage `batch-file/{batchId}/...`, rồi enqueue job `batch-file.process` vào BullMQ.
3. Worker process nhận job từ queue `batch-file`, đọc lại file bằng `storage_key`, chạy OCR/S2T và translate.
4. Trong lúc worker chạy, các use case tiếp tục patch state vào Redis. Frontend poll `GET /ai-core/audio-translate-batches/:batchId` để hiển thị preview từng file.
5. Retry item dùng `POST /ai-core/audio-translate-batches/:batchId/items/:itemId/retry`, API reset item về `pending` và enqueue job `batch-file.retry-item`.

## Chạy local

API:

```bash
pnpm --filter api run start:dev
```

Worker:

```bash
pnpm --filter api run start:worker
```

Redis phải chạy và dùng chung config với API/worker:

```env
REDIS_HOST=localhost
REDIS_PORT=6380
```

Storage local mặc định:

```env
STORAGE_DRIVER=local
STORAGE_ROOT_DIR=./storage
```

Nếu chạy API và worker ở hai container khác nhau, `STORAGE_ROOT_DIR` phải là shared volume hoặc đổi sang storage dùng chung như S3. Worker không đọc file từ memory của API.

## Triển khai production

Build API:

```bash
pnpm --filter api run build
```

Chạy hai process riêng:

```bash
pnpm --filter api run start:prod
pnpm --filter api run start:worker:prod
```

Biến môi trường của module được gom tại `src/config/batch-file.config.ts`.
Nên cấu hình:

```env
BATCH_FILE_STORAGE_DIR=batch-file
BATCH_FILE_WORKER_CONCURRENCY=1
BATCH_FILE_EXTRACTION_CONCURRENCY=2
BATCH_FILE_OCR_CONCURRENCY=1
BATCH_FILE_TRANSLATE_CONCURRENCY=3
BATCH_FILE_STORAGE_CLEANUP_DELAY_MS=21600000
BATCH_FILE_TTL_SECONDS=25200
```

Gợi ý triển khai:

- API scale ngang được vì file đã nằm trong storage và state nằm trong Redis.
- Worker có thể scale nhiều instance nếu AI core chịu tải được. Tăng `BATCH_FILE_WORKER_CONCURRENCY` từ từ vì mỗi batch còn có concurrency OCR/S2T và translate bên trong.
- OCR PDF nên giữ `BATCH_FILE_OCR_CONCURRENCY=1` nếu AI OCR core không ổn định với nhiều request song song. S2T vẫn dùng `BATCH_FILE_EXTRACTION_CONCURRENCY`.
- File gốc trong `storage/batch-file` chỉ là temporary storage. Khi batch kết thúc, hệ thống enqueue job cleanup trễ để xóa file gốc sau `BATCH_FILE_STORAGE_CLEANUP_DELAY_MS`.
- Redis dùng cho cả BullMQ và trạng thái preview, nên cần bật persistence/backup theo môi trường production. `BATCH_FILE_TTL_SECONDS` phải lớn hơn thời gian cleanup delay; mặc định code tự lấy cleanup delay cộng thêm 1 giờ.
- Với local storage, mount cùng volume `STORAGE_ROOT_DIR` cho API và worker. Với Kubernetes, dùng PVC/shared object storage.
