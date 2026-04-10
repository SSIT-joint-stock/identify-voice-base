# Module Nhận dạng giọng nói (Identify Engine)

Chào mừng bạn đến với tài liệu kỹ thuật của **Identify Engine**, "trái tim" AI của hệ thống. Module này thực hiện các nhiệm vụ phức tạp nhất liên quan đến xử lý tín hiệu âm thanh và đối soát sinh trắc học thời gian thực.

---

## 1. Triết lý thiết kế (Core Concepts)

Hệ thống nhận dạng được thiết kế dựa trên các công nghệ SOTA (State Of The Art) về Voice Biometrics, tập trung vào 3 giá trị cốt lõi:

### 1.1 Tính ẩn danh tạm thời (AI Truth)

Mọi kết quả nhận diện ban đầu đều được coi là **AI Truth**. Điều này có nghĩa là hệ thống nhận diện ra một "giọng nói cụ thể" dựa trên đặc trưng sóng âm, nhưng chưa gán nó vào một "con người cụ thể" trong Database Business cho đến khi có sự xác nhận của Operator. Dữ liệu này được lưu trữ tạm thời trong cache để tối ưu hiệu năng.

### 1.2 Diarization (Tách tiếng người nói)

Hệ thống hỗ trợ cơ chế tự động tách tiếng (Speaker Diarization). Thay vì bắt người dùng phải chia nhỏ file âm thanh, AI của chúng tôi có khả năng phân tích một dòng âm thanh hỗn hợp, xác định có bao nhiêu người đang nói và trích xuất từng phân đoạn của mỗi người để nhận dạng riêng biệt.

### 1.3 Cơ chế đối soát lười (Lazy Enrichment)

Để đảm bảo tốc độ phản hồi < 1 giây cho API nhận dạng, chúng tôi không thực hiện truy vấn User metadata nặng nề tại đây. API nhận dạng chỉ trả về các ID và Score. Việc "làm giàu" thông tin (như lấy tên, CCCD) sẽ được trì hoãn (lazy) cho đến khi người dùng truy cập vào trang chi tiết phiên làm việc.

---

## 2. Danh mục tài liệu chi tiết

Module Nhận dạng được chia thành các phần chuyên sâu để phục vụ việc tích hợp:

| Tài liệu                                                    | Nội dung chính                                                          | Đối tượng     |
| :---------------------------------------------------------- | :---------------------------------------------------------------------- | :------------ |
| **[Nhận dạng đơn người](./single-identify.md)**             | Hướng dẫn luồng nhận dạng nhanh cho 1 nguồn âm thanh duy nhất.          | FE / Mobile   |
| **[Nhận dạng đa người (Diarization)](./multi-identify.md)** | Quy trình tách tiếng và nhận diện đồng thời 2 người nói trong một file. | FE / BA       |
| **[Cấu trúc AI Cache](./concepts.md)**                      | Giải thích cách hệ thống lưu trữ các bản danh tính AI chưa xác thực.    | BE / Research |

---

## 3. Quy trình xử lý tổng quát (Global Workflow)

Mỗi yêu cầu nhận dạng đi qua các lớp bảo mật và xử lý sau:

1. **Ingestion Layer**: Nhận file audio (WAV/MP3/FLAC) và kiểm tra tính hợp lệ (Size, Duration).
2. **Preprocessing Layer**: Chuẩn hóa tần số lấy mẫu (Sample Rate) và khử nhiễu cơ bản.
3. **AI Core Layer**:
   - Nếu là `SINGLE`: Gửi toàn bộ audio sang Embedding Service.
   - Nếu là `MULTI`: Thực hiện tách Speaker, sau đó mới trích xuất Embedding cho từng Speaker.
4. **Vector Search Layer**: Thực hiện tìm kiếm Vector tương đồng nhất trong Qdrant Database.
5. **Persistence Layer**: Lưu kết quả vào bảng `identify_sessions` và tạo `ai_identities_cache` nếu cần.

---

## 4. Các tham số cấu hình AI

Hệ thống cho phép tinh chỉnh các ngưỡng nhạy cảm để phù hợp với từng môi trường:

- **Threshold High (0.85+)**: Độ tin cậy rất cao, thường dùng cho các giao dịch xác thực tài chính.
- **Threshold Medium (0.70 - 0.85)**: Phù hợp cho việc điểm danh hoặc quản lý ra vào.
- **Threshold Low (< 0.70)**: Hệ thống sẽ đánh dấu là "Cần xác minh thủ công" (Potential Identity).

---

## 5. Lưu ý dành cho Frontend

- **Multi-part Form Data**: API Identify yêu cầu gửi dữ liệu dưới dạng `multipart/form-data`. Đảm bảo FE thiết lập đúng Header `Content-Type`.
- **Loading State**: Quá trình nhận dạng có thể mất từ 1-3 giây tùy thuộc vào độ dài file (đặc biệt với chế độ MULTI). FE nên hiển thị các hiệu ứng tải (Skeleton/Loading) tương ứng.
- **Error Handling**: Nếu AI Service không phản hồi (Timeout), FE nên có cơ chế retry tự động tối đa 2 lần trước khi báo lỗi cho người dùng.

---

> [!IMPORTANT]
> Toàn bộ kết quả của module này là **Tạm thời**. Kết quả chỉ trở thành sự thật nghiệp vụ (Business Truth) sau khi được Operator phê duyệt thông qua module **Sessions** hoặc **AiVoices**.

---

> **Tài liệu tham khảo tiếp theo:** [Nhận dạng đơn người](./single-identify.md)
