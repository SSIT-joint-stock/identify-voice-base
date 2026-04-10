# API: Nhận dạng đơn người (Single Speaker Identify)

Tài liệu này hướng dẫn chi tiết về luồng nhận dạng dành cho trường hợp xác định một nguồn giọng nói duy nhất trong một tệp âm thanh. Đây là chế độ nhanh nhất và có độ chính xác tập trung cao nhất.

---

## 1. Thông tin chung

- **Endpoint**: `POST /api/v1/identify`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Chế độ**: `type = SINGLE`
- **Mục tiêu**: Đối soát 1 file âm thanh với toàn bộ kho dữ liệu Business Truth và AI Truth để trả về định danh duy nhất.

---

## 2. Các tham số yêu cầu (Request Parameters)

| Tham số | Loại     | Yêu cầu        | Mô tả                                                                                        |
| :------ | :------- | :------------- | :------------------------------------------------------------------------------------------- |
| `file`  | `Binary` | **Bắt buộc**   | File âm thanh cần nhận dạng (WAV, MP3, FLAC...). Giới hạn dung lượng < 50MB.                 |
| `type`  | `Enum`   | Không bắt buộc | Giá trị: `SINGLE`. Nếu không gửi, hệ thống mặc định sẽ xử lý theo chế độ đa người (`MULTI`). |

---

## 3. Quy trình thực hiện chi tiết (Step-by-Step)

Quy trình nhận dạng đơn người diễn ra theo chuỗi sự kiện tuyến tính nhằm tối ưu tốc độ phản hồi:

### 3.1 Giai đoạn Tiếp nhận (Ingestion)

Backend nhận file thông qua `FileInterceptor`. Hệ thống thực hiện kiểm tra sơ bộ về định dạng mã hóa và độ dài. Các file quá ngắn (< 1s) sẽ bị từ chối vì không đủ đặc trưng để trích xuất đặc trưng giọng nói.

### 3.2 Giai đoạn Trích xuất (Feature Extraction)

Toàn bộ file âm thanh được gửi sang AI Core Service. Tại đây, AI sẽ chuyển đổi sóng âm thành một vector toán học (128 hoặc 512 chiều). Trong chế độ `SINGLE`, AI sẽ không thực hiện tách tiếng mà coi toàn bộ âm thanh là của một người duy nhất.

### 3.3 Giai đoạn Đối soát (Matching)

Vector trích xuất được so sánh với hàng triệu Vector trong Qdrant bằng thuật toán Cosine Similarity.

- **Top 1 Match**: Hệ thống lấy ra kết quả có điểm tin cậy (`score`) cao nhất.
- **Identity Resolution**:
  - Nếu ID thuộc về một User trong Database -> Trả về thông tin Business Truth.
  - Nếu ID chỉ tồn tại trong AI Cache -> Trả về thông tin AI Truth.
  - Nếu không có kết quả nào vượt ngưỡng tối thiểu -> Đánh dấu là "Người lạ" (Unknown).

---

## 4. Cấu trúc dữ liệu phản hồi (Response)

Hệ thống trả về một cấu trúc dữ liệu gọn nhẹ để FE xử lý nhanh.

### Ví dụ kết quả thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Nhận dạng thành công!",
  "data": {
    "session_id": "session-uuid-123",
    "type": "SINGLE",
    "results": [
      {
        "label": "speaker_0",
        "voice_id": "8d4be585-...",
        "score": 0.9542,
        "is_enrolled": true,
        "identity_type": "BUSINESS_TRUTH",
        "metadata": {
          "name": "Nguyễn Văn A"
        }
      }
    ]
  }
}
```

---

## 5. Hướng dẫn dành cho Frontend (UI/UX)

Để tích hợp thành công chế độ nhận dạng đơn người, FE nên lưu ý:

### 5.1 Quản lý File Upload

- Sử dụng các thư viện như `react-dropzone` hoặc `antd upload` để người dùng dễ dàng kéo thả file.
- Validate dung lượng và định dạng file ngay tại Client trước khi gửi lên Server để tiết kiệm băng thông.

### 5.2 Hiển thị kết quả (Confidence Score)

- **Score > 0.9**: Hiển thị màu xanh lá (Độ tin cậy tuyệt đối).
- **Score 0.7 - 0.9**: Hiển thị màu vàng (Cần lưu ý, độ tin cậy trung bình).
- **Score < 0.7**: Hiển thị màu đỏ và nhãn "Cần xác minh" hoặc "Không xác định".

### 5.3 Xử lý danh tính chưa Enroll

Nếu kết quả trả về có `is_enrolled: false`, FE nên hiển thị một nút "Vào kho AI để định danh" để người dùng có thể thực hiện quy trình đăng ký nhanh cho người lạ này.

---

## 6. Các trường hợp lỗi (Exceptions)

- **400 Bad Request**: File không đúng định dạng hoặc bị hỏng (Corrupted).
- **413 Payload Too Large**: File vượt quá 50MB.
- **503 Service Unavailable**: AI Service (FastAPI) đang quá tải hoặc mất kết nối với Vector DB.

---

## 7. Ràng buộc kỹ thuật (Technical Constraints)

- **Thời gian xử lý**: Trung bình 500ms - 800ms cho 1 file audio 10 giây.
- **Độ nhiễu**: Hệ thống hoạt động tốt nhất trong môi trường văn phòng. Trong môi trường quá ồn (Tiếng xe cộ, nhạc to), độ chính xác có thể giảm xuống 20-30%.
- **Ngôn ngữ**: AI của chúng tôi tối ưu cho tiếng Việt và tiếng Anh phổ thông.

---

> [!TIP]
> Luôn sử dụng chế độ `SINGLE` nếu bạn chắc chắn file âm thanh chỉ có một người nói để đạt được tốc độ phản hồi nhanh nhất và độ tin cậy cao nhất.

---

> **Tài liệu tham khảo khác:**
>
> - [Nhận dạng đa người (Diarization)](./multi-identify.md)
> - [Quản lý phiên làm việc](../sessions/index.md)
