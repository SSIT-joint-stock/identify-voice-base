import { Readable } from 'stream';

/**
 * Kết quả trả về sau khi lưu file thành công.
 */
export interface StorageSaveResult {
  /** Key duy nhất để xác định file (vd: đường dẫn tương đối hoặc UUID S3) */
  storageKey: string;
  /** URL công khai có thể truy cập qua HTTP (nếu có) */
  publicUrl?: string;
}

/**
 * Interface chuẩn cho tất cả storage driver.
 * Mọi driver (Local, S3, GCS, ...) phải implement interface này.
 */
export interface StorageDriver {
  /**
   * Lưu file vào storage bằng Stream.
   * Không phụ thuộc filesystem hay file tạm trên disk.
   *
   * @param stream   Readable stream chứa nội dung file
   * @param destDir  Thư mục/Prefix đích (vd: "voices")
   * @param fileName Tên file đích (vd: "uuid.wav")
   * @returns        Thông tin file đã lưu
   */
  save(
    stream: Readable,
    destDir: string,
    fileName: string,
  ): Promise<StorageSaveResult>;

  /**
   * Xóa file khỏi storage theo storage key.
   * @param storageKey Key duy nhất của file
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Kiểm tra file có tồn tại hay không.
   * @param storageKey Key duy nhất của file
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Truy xuất file dưới dạng ReadStream.
   * @param storageKey Key duy nhất của file
   * @returns Khối dữ liệu dạng Readable stream
   */
  getReadStream?(storageKey: string): Promise<Readable>;

  /**
   * (Tùy chọn) Khởi tạo môi trường (thư mục, bucket)
   */
  onInit?(subDirs: string[]): Promise<void>;
}

/** Token để inject StorageDriver qua DI */
export const STORAGE_DRIVER_TOKEN = 'STORAGE_DRIVER';
