# API: Chi tiết phiên & Đối soát thông tin (Deep Analysis)

Tài liệu này cung cấp hướng dẫn đầy đủ về cách sử dụng API để truy xuất thông tin chi tiết của một phiên nhận dạng. Đây là endpoint quan trọng nhất để Operator thực hiện đối soát giữa kết quả AI và thông tin quản trị thực tế.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/sessions/:id`
- **Tác vụ**: Lấy toàn bộ metadata của phiên, danh sách người nói và thực hiện "Làm giàu dữ liệu" (Enrichment).
- **Quyền truy cập**: `Operator`, `Admin`.
- **Cơ chế**: Real-time DB Matching.

---

## 2. Logic làm giàu dữ liệu (The Enrichment Engine)

Tại sao API này lại quan trọng? Khi một phiên nhận dạng diễn ra, AI chỉ biết ID của vector. API Detail có nhiệm vụ "tìm người" đằng sau các ID đó.

### Thứ tự ưu tiên đối soát:

1. **Lớp Business (Nguồn chính xác tuyệt đối)**: Hệ thống lấy `voice_id` từ kết quả AI và tìm kiếm trong bảng `voice_records`. Nếu tìm thấy và `is_active: true`, hệ thống sẽ JOIN với bảng `users` để lấy tên, CCCD, chức vụ...
2. **Lớp AI Truth (Nguồn gợi ý)**: Nếu không tìm thấy trong Business, hệ thống sẽ tìm trong bảng `ai_identities_cache`. Đây là những danh tính mà AI đã "tự đặt tên" dựa trên các phiên trước đó nhưng chưa được Operator đăng ký chính thức.
3. **Lớp Unknown (Người lạ)**: Nếu ID hoàn toàn mới, hệ thống sẽ hiển thị trạng thái "Người chưa xác định".

---

## 3. Cấu trúc dữ liệu phản hồi (Detailed Response)

Kết quả trả về được thiết kế để FE có thể hiển thị một trang phân tích chuyên sâu.

### Ví dụ kết quả thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Lấy chi tiết phiên thành công!",
  "data": {
    "id": "session-uuid",
    "type": "MULTI",
    "audio_url": "http://localhost:3000/api/v1/sessions/.../audio",
    "status": "COMPLETED",
    "results": [
      {
        "label": "speaker_0",
        "voice_id": "user-uuid-1",
        "score": 0.9854,
        "is_enrolled": true,
        "identity_type": "BUSINESS_TRUTH",
        "metadata": {
          "name": "Nguyễn Văn A",
          "citizen_id": "0123xx456"
        }
      },
      {
        "label": "speaker_1",
        "voice_id": "ai-cache-id-1",
        "score": 0.8842,
        "is_enrolled": false,
        "identity_type": "AI_TRUTH",
        "metadata": {
          "name": "AI Identity #102"
        }
      }
    ],
    "segments": [
      { "speaker": "speaker_0", "start": 0.5, "end": 15.2 },
      { "speaker": "speaker_1", "start": 16.0, "end": 45.8 }
    ],
    "created_at": "2026-04-10T10:00:00Z"
  }
}
```

---

## 4. Hướng dẫn dành cho Frontend (Analysis View)

Để hiển thị trang chi tiết một cách chuyên nghiệp, FE nên triển khai các tính năng sau:

### 4.1 Audio Waveform visualization

Sử dụng thư viện như `wavesurfer.js` để vẽ biểu đồ sóng âm từ `audio_url`.

- Tô màu các vùng trên Waveform dựa vào mảng `segments`.
- Ví dụ: Speaker 0 tô màu xanh, Speaker 1 tô màu đỏ.

### 4.2 Speaker Cards

Hiển thị mỗi Speaker thành một thẻ (Card) riêng biệt.

- Đối với `is_enrolled: true`: Hiển thị nút "Xem hồ sơ" link tới module Voices.
- Đối với `is_enrolled: false`: Hiển thị nút "Xác thực hồ sơ" để chuyển sang module AiVoices thực hiện quy trình đăng ký.

### 4.3 On-demand Speaker Player

Trong mỗi thẻ Speaker, hãy cung cấp một nút Play riêng. Nút này sẽ gọi API **[Trích xuất âm thanh Speaker](./speaker-audio.md)** để chỉ nghe giọng của người đó, giúp Operator dễ dàng kiểm tra chéo (Cross-check).

---

## 5. Xử lý logic Snapshot và Drift

**Dữ liệu Drift (Sự trôi dạt)**: Có trường hợp tại thời điểm nhận dạng AI trả về tên "Nguyễn Văn A", nhưng 1 tuần sau Operator đổi tên người đó thành "Nguyễn Văn B".

- API Detail luôn ưu tiên hiển thị **Thông tin mới nhất** từ bảng Users.
- Tuy nhiên, hệ thống vẫn lưu trữ thông tin Snapshot (tại thời điểm nhận dạng) để phục vụ việc so sánh nếu cần thiết trong các cuộc điều tra chuyên sâu.

---

## 6. Các trường hợp lỗi & Ngoại lệ

- **404 Not Found**: Session ID không hợp lệ hoặc đã bị xóa khỏi hệ thống.
- **403 Forbidden**: Người dùng không có quyền xem chi tiết các phiên làm việc của bộ phận khác (Nếu có phân quyền Tenant).
- **Audio Error**: Nếu file audio trên Storage bị xóa vật lý, trường `audio_url` có thể vẫn tồn tại nhưng khi FE truy cập sẽ nhận được lỗi 404. FE nên xử lý lỗi tag `<audio>` và hiển thị thông báo "File gốc đã bị lưu trữ hoặc xóa".

---

## 7. Ràng buộc & Hiệu năng

- **Lazy Enrichment**: Đôi khi việc lấy thông tin chi tiết cho 2-3 người cùng lúc có thể mất thêm ~100ms. Tuy nhiên, điều này đảm bảo tính chính xác của dữ liệu "Social Truth".
- **JSON Structure**: Trường `segments` và `results` là JSONB. FE cần kiểm tra xem các trường này có tồn tại và đúng định dạng mảng trước khi render để tránh lỗi JS Crash.

---

> [!TIP]
> Luôn kiểm tra trường `identity_type`. Nếu là `AI_TRUTH`, hãy nhắc nhở Operator thực hiện quy trình "Chuyển thành Business Truth" để cải thiện kho dữ liệu định danh của hệ thống.

---

> **Tài liệu tham khảo tiếp theo:**
>
> - [Trích xuất âm thanh Speaker](./speaker-audio.md)
> - [Module AiVoices (Xác thực người lạ)](../ai-voices/index.md)
