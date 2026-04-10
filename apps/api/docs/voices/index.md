# Module Voice Business Truth

Chào mừng bạn đến với tài liệu kỹ thuật chi tiết của module **Voices**. Module này chịu trách nhiệm quản lý hồ sơ giọng nói của người dùng đã được định danh chính thức trong hệ thống (**Business Truth**).

Dữ liệu tại đây là nguồn tin cậy nhất (Source of Truth) dùng để đối soát kết quả nhận dạng từ AI.

---

## 1. Triết lý thiết kế (Design Philosophy)

Hệ thống quản lý giọng nói được xây dựng dựa trên 3 nguyên lý cốt lõi:

### 1.1 Tách biệt sự thật (Truth Separation)

Chúng tôi phân biệt rõ ràng giữa **AI Truth** (Dữ liệu do AI gợi ý, chưa xác thực) và **Business Truth** (Dữ liệu đã được định danh bởi Operator). Module này tập trung hoàn toàn vào lớp Business Truth.

### 1.2 Snapshot Preservation (Bảo toàn lịch sử)

Mỗi bản ghi định danh được gắn với một phiên bản cụ thể của đặc trưng giọng nói. Khi thông tin cá nhân thay đổi, các Snapshot trong quá khứ vẫn được giữ nguyên để đảm bảo tính toàn vẹn của các báo cáo lịch sử.

### 1.3 Soft Archival (Lưu trữ mềm)

Hệ thống không bao giờ thực hiện xóa vật lý các biometric data quan trọng. Mọi hành động "xóa" bản chất là vô hiệu hóa trạng thái (`is_active: false`), giúp hệ thống luôn có dữ liệu đối soát trong trường hợp cần điều tra tội phạm hoặc gian lận trong tương lai.

---

## 2. Danh mục tài liệu chi tiết

Để thuận tiện cho việc triển khai, tài liệu được chia nhỏ thành các phần chuyên sâu:

| Tài liệu                                        | Nội dung chính                                                                                    | Đối tượng    |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------ | :----------- |
| **[Tra cứu danh sách](./list-voices.md)**       | Hướng dẫn sử dụng API `GET /voices`, các bộ lọc tìm kiếm nâng cao và phân trang.                  | FE / Mobile  |
| **[Chi tiết hồ sơ](./get-voice.md)**            | Cấu trúc dữ liệu User kết hợp Identity Profile và lịch sử nhận dạng 5 phiên gần nhất.             | FE / BA      |
| **[Cập nhật thông tin](./update-info.md)**      | Quy trình thay đổi metadata cá nhân (Name, Phone, Job) mà không ảnh hưởng Biometric.              | FE           |
| **[Vô hiệu hóa hồ sơ](./deactivate-voice.md)**  | Quy trình UC07 — Chuyển hồ sơ vào kho lưu trữ (Archive) và ẩn khỏi luồng nhận dạng.               | FE / QA      |
| **[Cập nhật Biometric](./update-embedding.md)** | **[Trọng yếu]** Luồng UC04 — Cập nhật đặc trưng giọng nói từ lịch sử audio (Full FE/BE Workflow). | FE / Workers |

---

## 3. Các thực thể chính (Entities)

Trong module này, bạn sẽ làm việc chủ yếu với các bảng sau trong Database:

- **Users**: Lưu trữ thông tin định danh cá nhân (Họ tên, CCCD, Điện thoại...).
- **Voice Records**: Lưu trữ liên kết giữa `user_id` và `voice_id` (biometric id), kèm theo trạng thái `is_active`.
- **Audio Files**: Thông tin về tệp âm thanh gốc được dùng để Enroll hoặc lưu vết nhận dạng.

---

## 4. Hỗ trợ & Tích hợp

- **Storage**: Mọi file audio được truy cập thông qua `audio_url` là một link streaming bảo mật.
- **AI Sync**: Mọi thay đổi về trạng thái `is_active` sẽ được AI Service ghi nhận để tối ưu hóa tốc độ tìm kiếm trong Vector Database (Qdrant).

---

> [!TIP]
> Nếu bạn là lập trình viên Frontend mới bắt đầu tích hợp, hãy xem tài liệu **[Cập nhật Biometric](./update-embedding.md)** trước để hiểu về các tương tác phức tạp nhất của module này.
