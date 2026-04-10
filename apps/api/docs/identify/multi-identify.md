# API: Nhận dạng đa người (Speaker Diarization)

Tài liệu này hướng dẫn chi tiết về chế độ nhận dạng nâng cao, cho phép hệ thống tự động tách biệt và xác định danh tính của nhiều người nói trong cùng một tệp âm thanh. Đây là tính năng cốt lõi của giải pháp thu âm và định danh trong các cuộc hội thoại.

---

## 1. Thông tin chung

- **Endpoint**: `POST /api/v1/identify`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Chế độ**: `type = MULTI` (Mặc định nếu không truyền `type`).
- **Mục tiêu**: Phân tích file audio hỗn hợp, thực hiện tách tiếng (Diarization) và định danh đồng thời các bên tham gia (thường là 2 người).

---

## 2. Các tham số yêu cầu (Request Parameters)

| Tham số | Loại     | Yêu cầu        | Mô tả                                             |
| :------ | :------- | :------------- | :------------------------------------------------ |
| `file`  | `Binary` | **Bắt buộc**   | File âm thanh cần nhận dạng. Hỗ trợ đa định dạng. |
| `type`  | `String` | Không bắt buộc | Giá trị: `MULTI`.                                 |

---

## 3. Quy trình xử lý đa luồng (Multi-Processing Workflow)

Chế độ `MULTI` tiêu tốn nhiều tài nguyên tính toán hơn chế độ `SINGLE` do phải thực hiện thêm bước phân đoạn (Segmentation).

### 3.1 Giai đoạn Tách tiếng (Diarization)

AI Service sẽ quét qua toàn bộ file để xác định các điểm thay đổi giọng nói (Change points).

- **VAD (Voice Activity Detection)**: Loại bỏ các đoạn im lặng và nhiễu nền.
- **Clustering**: Gom nhóm các phân đoạn âm thanh giống nhau về một "Label" (ví dụ: `speaker_0`, `speaker_1`).
- **Audio Length**: Nếu tổng thời lượng nói của một Speaker quá ngắn (< 2 giây), AI có thể bỏ qua Speaker đó để tránh lỗi nhận dạng nhầm do không đủ dữ liệu.

### 3.2 Giai đoạn Trích xuất & Đối soát

Sau khi đã có các cụm âm thanh riêng biệt cho từng người, AI thực hiện trích xuất Embedding cho mỗi cụm.

- Mỗi Speaker sẽ có một kết quả đối soát riêng biệt trong Vector Database.
- Hệ thống sẽ trả về mảng `results` chứa thông tin của tất cả các Speaker được phát hiện.

### 3.3 Lưu trữ Phiên (Session Persistence)

Hệ thống tạo một bản ghi `identify_sessions` lưu trữ:

- File audio gốc.
- Mảng kết quả định danh của từng Speaker.
- Dữ liệu `segments`: Lưu vị trí bắt đầu và kết thúc (timestamp) của từng người nói trong file để phục vụ việc **nghe lại theo từng speaker** sau này.

---

## 4. Cấu trúc dữ liệu phản hồi (Response)

### Ví dụ kết quả thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Nhận dạng đa người thành công!",
  "data": {
    "session_id": "session-uuid-multi",
    "type": "MULTI",
    "results": [
      {
        "label": "speaker_0",
        "voice_id": "8d4be585-...",
        "score": 0.9211,
        "is_enrolled": true,
        "metadata": { "name": "Nguyễn Văn A" }
      },
      {
        "label": "speaker_1",
        "voice_id": "9f5cf696-...",
        "score": 0.8845,
        "is_enrolled": false,
        "identity_type": "AI_TRUTH",
        "metadata": { "name": "AI Identity #4021" }
      }
    ]
  }
}
```

---

## 5. Hướng dẫn dành cho Frontend (Complex Integration)

Chế độ MULTI mang lại nhiều thông tin hơn nhưng cũng đòi hỏi xử lý giao diện phức tạp hơn:

### 5.1 Hiển thị Danh tính đa luồng

FE không chỉ hiển thị một kết quả mà nên hiển thị dưới dạng mảng hoặc thẻ (Card). Mỗi thẻ đại diện cho một Speaker được phát hiện trong file.

### 5.2 Cơ chế Nghe lại tách biệt (On-demand Audio)

Trong chế độ MULTI, hệ thống hỗ trợ API lấy audio của từng người nói đơn lẻ. FE nên cung cấp nút "Nghe Speaker 0" và "Nghe Speaker 1".

- Endpoint: `GET /api/v1/sessions/:id/speakers/:label/audio`
- FE sử dụng `label` (ví dụ `speaker_0`) từ kết quả trả về để gọi link audio này.

### 5.3 Trạng thái Identificaiton

Nếu có 1 Speaker là `is_enrolled: false` và 1 Speaker là `is_enrolled: true`, FE nên hiển thị rõ sự khác biệt giữa "Người trong hệ thống" và "Khách lạ" để Operator dễ dàng xử lý nghiệp vụ xác xác thực.

---

## 6. Xử lý lỗi & Hạn chế

- **Quá nhiều người nói**: Hệ thống hiện tại tối ưu nhất cho **2 người nói** (Cuộc hội thoại 1-1). Nếu trong file có 4-5 người nói đè lên nhau, độ chính xác của Diarization sẽ giảm mạnh.
- **Tiếng nói chồng lấn (Overlapping)**: Khi hai người nói cùng lúc, AI có thể gặp khó khăn trong việc tách lọc. Kết quả `score` trong trường hợp này thường thấp hơn bình thường.
- **Timeout**: Do tính chất xử lý nặng, với file audio dài (> 5 phút), yêu cầu có thể mất tới 5-10 giây để phản hồi. FE nên có UX "Đang phân tích chuyên sâu..." để giữ chân người dùng.

---

## 7. Integrity & Metadata Snapshot

Kết quả nhận diện được lưu trữ dưới dạng **Snapshot** trong session. Điều này có nghĩa là nếu sau này người dùng đổi tên trong module Voices, tên hiển thị trong Session cũ này **vẫn được giữ nguyên** như lúc nhận dạng để đảm bảo tính khách quan của dữ liệu tại thời điểm đó.

---

> [!TIP]
> Để đạt hiệu quả tốt nhất, hãy sử dụng các thiết bị thu âm chất lượng cao hoặc micro định hướng khi thực hiện các phiên nhận dạng đa người.

---

> **Các tài liệu liên quan:**
>
> - [Module Sessions (Phát lại audio tách tiếng)](../sessions/speaker-audio.md)
> - [Chuyển đổi danh tính AI thành Business Truth](../ai-voices/convert-voice.md)
