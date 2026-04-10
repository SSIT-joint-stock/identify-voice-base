# API & Workflow: Chuyển đổi danh tính (AI to Business)

> [!CAUTION]
> **THÔNG BÁO CHO TEAM FRONTEND**: Hiện tại API Chuyển đổi danh tính (Convert) đang trong quá trình hoàn thiện ở phía Backend. Team FE **chưa cần triển khai** UI cho tính năng này ở thời điểm hiện tại.

Chào mừng bạn đến với tài liệu kỹ thuật của module **AiVoices**. Đây là tầng dữ liệu chứa các danh tính do AI tự tạo ra (**AI Truth**) trong các phiên nhận dạng khi không tìm thấy kết quả phù hợp trong kho dữ liệu chính xác (**Business Truth**).

---

## 1. Thông tin chung

- **Endpoint**: `POST /api/v1/ai-voices/:id/convert`
- **Phương thức**: `POST`.
- **Nhiệm vụ**: Chuyển giao mã định danh `voice_id` từ kho cache sang hệ thống quản lý User chính thức.
- **Ràng buộc**: Yêu cầu quyền `Operator` hoặc `Admin`.

---

## 2. Ý nghĩa nghiệp vụ (The Business Value)

Quy trình Convert giải quyết vấn đề "Sinh trắc học đi trước, Định danh đi sau":

1. Bạn đã có dữ liệu giọng nói chất lượng cao của một người lạ từ các Session trước.
2. Bạn không muốn bắt họ phải Enroll lại từ đầu (để tránh sai số do micro hoặc môi trường khác nhau).
3. Bạn muốn "Thừa kế" (Inherit) đặc trưng giọng nói đã có và chỉ việc gán thêm Tên, CCCD vào đó.

Hành động này giúp làm giàu kho dữ liệu Business Truth một cách chuẩn xác vì nó dựa trên dữ liệu thực tế đã được kiểm chứng qua các phiên Identify.

---

## 3. Quy trình thực hiện Backend (Logic Workflow)

Khi nhận được yêu cầu Convert, Backend thực hiện chuỗi hành động nguyên tử (Atomic Transaction):

### 3.1 Giai đoạn Kiểm tra (Pre-validation)

- Backend kiểm tra xem `voice_id` (ID của AI Voice) có thực sự tồn tại trong bảng `ai_identities_cache` không.
- Kiểm tra xem ID này đã được convert trước đó chưa (Tránh tạo trùng lặp User).

### 3.2 Giai đoạn Tìm kiếm bằng chứng (Evidence Gathering)

- Hệ thống thực hiện quét trong bảng `identify_sessions` để tìm phiên nhận dạng đầu tiên (hoặc phiên có điểm số cao nhất) liên quan đến ID này.
- Trích xuất `audio_file_id` từ phiên đó để làm "Mẫu âm thanh gốc" cho User mới.

### 3.3 Giai đoạn Khởi tạo danh tính (Identity Creation)

- **INSERT User**: Tạo bản ghi mới trong bảng `users` với các Metadata do Operator gửi lên (Name, SĐT...).
- **INSERT Voice Record**: Tạo bản ghi trong `voice_records` kết nối User ID mới với `voice_id` cũ của AI.
- **Set Active**: Đánh dấu bản ghi mới là `is_active: true`.

### 3.4 Giai đoạn Dọn dẹp (Cleanup)

- Xóa bản ghi tương ứng trong bảng `ai_identities_cache` vì danh tính này đã "tốt nghiệp" sang lớp Business.

---

## 4. Cấu trúc dữ liệu yêu cầu (Request Payload)

FE cần gửi lên thông tin cá nhân giống hệt như quy trình Enroll, nhưng không cần gửi đính kèm file Audio.

```json
{
  "name": "Nguyễn Văn A",
  "citizen_identification": "012345678901",
  "phone_number": "0912345678",
  "job": "Kỹ thuật viên",
  "criminal_record": []
}
```

---

## 5. Cấu trúc dữ liệu phản hồi (Response)

### Ví dụ kết quả thành công (201 Created):

```json
{
  "statusCode": 201,
  "message": "Chuyển đổi danh tính thành công!",
  "data": {
    "user_id": "new-user-uuid",
    "voice_id": "old-ai-voice-id",
    "name": "Nguyễn Văn A",
    "converted_at": "2026-04-10T11:00:00Z"
  }
}
```

---

## 6. Hướng dẫn dành cho Frontend (The Conversion Modal)

FE nên triển khai luồng này dưới dạng một **Chương trình hướng dẫn (Wizard)** hoặc **Modal**:

1. **Trigger**: Người dùng nhấn nút "Định danh người này" từ danh sách AI Voices hoặc từ trang Detail của một Multi-Session.
2. **Data Prefill**:
   - FE hiển thị sẵn ID của AI Voice.
   - Nếu có thể, hãy hiển thị một đoạn Audio Preview lấy được từ Session gần nhất của họ để Operator nghe lại trước khi nhập tên.
3. **Form Entry**: Hiển thị các trường `name`, `citizen_id`, v.v.
4. **Success Handling**: Sau khi Convert thành công, hãy điều hướng người dùng tới trang **Chi tiết hồ sơ (Voices Detail)** để họ thấy được thành quả.

---

## 7. Xử lý lỗi & Biên (Edge Cases)

- **Lỗi 409 Conflict**: Số CCCD hoặc Số điện thoại đã tồn tại cho một User khác trong hệ thống. FE cần thông báo rõ để Operator kiểm tra lại xem có phải đối tượng này đã đăng ký trước đó rồi không.
- **Lỗi 404 Not Found**: AI Voice ID đã bị xóa hoặc đã được người khác convert trước đó 1 giây (Race condition).
- **AI Service Error**: Nếu Vector Database (Qdrant) gặp sự cố, transaction sẽ bị rollback và thông tin AI Voice vẫn được giữ nguyên trong cache.

---

## 8. Tại sao quy trình này an toàn?

Vì mã `voice_id` (Vector ID) không hề thay đổi, quy trình này không cần tương tác lại với AI Core Service để tính toán lại Embedding. Nó chỉ là một thao tác quản trị dữ liệu ở lớp SQL, giúp tốc độ phản hồi cực nhanh (< 50ms) và độ tin cậy tuyệt đối về mặt sinh trắc học.

---

> [!TIP]
> Luôn khuyến khích Operator thực hiện Convert càng sớm càng tốt để hệ thống có thể đối soát Tên người dùng thực tế trong các báo cáo xuất ra hàng ngày.

---

> **Các tài liệu liên kết:**
>
> - [Module Voices (Business Truth)](../voices/index.md)
> - [Module Sessions (Lịch sử nhận dạng)](../sessions/index.md)
