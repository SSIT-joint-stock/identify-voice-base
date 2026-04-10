# Module Đăng ký giọng nói (Enrollment)

Chào mừng bạn đến với tài liệu kỹ thuật của module **Enroll**. Đây là điểm khởi đầu cho toàn bộ hệ sinh thái định danh sinh trắc học trong hệ thống, chịu trách nhiệm cho việc "khai sinh" một danh tính mới.

---

## 1. Triết lý thiết kế (Enrollment Standards)

Quá trình Enrollment là quá trình quan trọng nhất vì nó xác định "Mẫu chuẩn" (Golden Template) để đối soát cho tất cả các giao dịch trong tương lai.

### 1.1 Tính nhất quán dữ liệu (Data Integrity)

Khi một người dùng thực hiện Enroll, hệ thống thực hiện đồng bộ hóa dữ liệu trên 3 thành phần:

1. **Lớp Hồ sơ (Prisma/PostgreSQL)**: Lưu thông tin định danh cá nhân mở rộng.
2. **Lớp Sinh trắc (AI Core/Qdrant)**: Lưu trữ các đặc trưng sóng âm dưới dạng một Vector toán học.
3. **Lớp Media (Local/S3 Storage)**: Lưu trữ tệp âm thanh gốc làm bằng chứng pháp lý và đối soát thủ công.

### 1.2 Biometric Quality Gate (Cửa chặn chất lượng)

Hệ thống không chấp nhận mọi loại file âm thanh. AI của chúng tôi có các bộ lọc tự động để kiểm tra:

- **Thời lượng**: Phải đủ dài (> 5s) để trích xuất đủ đặc trưng.
- **Tỉ lệ tín hiệu trên nhiễu (SNR)**: Âm thanh quá ồn sẽ bị từ chối để tránh làm nhiễm bẩn kho dữ liệu.
- **Tính duy nhất**: Hệ thống tự động kiểm tra xem giọng nói này đã tồn tại dưới một danh tính khác chưa (Cơ chế chống giả mạo danh tính - Anti-spoofing/De-duplication).

---

## 2. Danh mục tài liệu chi tiết

Module Enroll được tổ chức thành các hướng dẫn chuyên sâu sau:

| Tài liệu                                        | Nội dung chính                                                                         | Đối tượng   |
| :---------------------------------------------- | :------------------------------------------------------------------------------------- | :---------- |
| **[Quy trình Đăng ký mới](./create-enroll.md)** | Hướng dẫn chi tiết API `POST /enroll`, cấu trúc Multipart và các bước xử lý liên tầng. | FE / Mobile |
| **[Tiêu chuẩn âm thanh](./standards.md)**       | Các thông số kỹ thuật (Bitrate, Sample rate) và môi trường thu âm khuyến nghị.         | Media / QA  |

---

## 3. Workflow tổng quát (High-level Workflow)

1. **Nhận diện nhu cầu**: Người dùng mới cần được định danh vào hệ thống.
2. **Thu thập dữ liệu**: Operator sử dụng thiết bị thu âm để lấy mẫu giọng nói và nhập thông tin cá nhân.
3. **Xử lý AI**: Hệ thống gọi tới AI Service để trả về một `voice_id` duy nhất và lưu Vector vào Qdrant.
4. **Đóng gói dữ liệu**: Toàn bộ metadata, audio path và voice_id được gói vào một transaction DB để đảm bảo tính nguyên tử.
5. **Kích hoạt danh tính**: Sau khi thành công, người dùng chính thức trở thành một bản ghi **Business Truth** và có thể được nhận diện ngay lập tức.

---

## 4. Các thực thể dữ liệu liên quan

- **Users**: Bản ghi định danh chính.
- **Voice Records**: Bản ghi liên kết User với Voice ID AI.
- **Audio Files**: Bản ghi quản lý tệp tin vật lý dùng để Enroll.

---

## 5. Lưu ý dành cho Frontend

- **Xử lý File nhị phân**: Luôn gửi dữ liệu qua `FormData`. Hãy đảm bảo file audio không bị nén hoặc can thiệp bởi các thư viện JS làm thay đổi chất lượng âm thanh gốc.
- **Validation**: Kiểm tra các trường `citizen_identification` và `phone_number` ngay tại FE để mang lại trải nghiệm mượt mà, tránh đợi Server phản hồi lỗi trùng lặp.
- **Feedback UI**: Quy trình Enroll có thể mất 1-2 giây vì cần tương tác với AI Service. Hãy hiển thị UI "Đang trích xuất đặc trưng sinh trắc học..." thay vì chỉ hiển thị biểu tượng Loading đơn giản.

---

> [!IMPORTANT]
> Một phiên Enrollment thành công là điều kiện tiên quyết để hệ thống có thể hoạt động chính xác. Chất lượng âm thanh đầu vào tại bước này quyết định 90% độ chính xác của toàn bộ hệ thống sau này.

---

> **Tài liệu tham khảo tiếp theo:** [Quy trình Đăng ký mới](./create-enroll.md)
