# API: Trích xuất âm thanh Speaker (On-demand Audio Extraction)

Tài liệu này hướng dẫn chi tiết về cơ chế trích xuất và streaming âm thanh dành riêng cho từng người nói trong một phiên nhận dạng đa người (MULTI). Đây là tính năng kỹ thuật cao giúp tối ưu hóa dung lượng lưu trữ trong khi vẫn đảm bảo trải nghiệm người dùng tốt nhất.

---

## 1. Thông tin chung

- **Endpoint**: `GET /api/v1/sessions/:id/speakers/:label/audio`
- **Phương thức**: `GET`.
- **Nhiệm vụ**: Động (On-the-fly) trích xuất các phân đoạn giọng nói của một speaker cụ thể và ghép nối chúng thành một dòng âm thanh (stream) duy nhất.
- **Tiêu chuẩn**: Trả về dữ liệu âm thanh trực tiếp (`audio/mpeg` hoặc `audio/wav`).

---

## 2. Bài toán kỹ thuật & Giải pháp

### 2.1 Vấn đề: Lưu trữ phân mảnh

Trong một cuộc hội thoại 10 phút, Speaker A có thể nói 50 lần, mỗi lần chỉ 2-3 giây. Nếu chúng ta cắt và lưu 50 file nhỏ này cho mỗi speaker:

- Gây lãng phí inodes (số lượng file) trong hệ thống file.
- Gây khó khăn cho việc quản lý Metadata.
- Tốn dung lượng cho phần header của 50 file audio riêng lẻ.

### 2.2 Giải pháp: Dynamic Filtering

Hệ thống sử dụng metadata `segments` lưu trong Database để biết chính xác Speaker A nói ở những giây nào. Khi có yêu cầu nghe lại, Backend sử dụng thư viện **FFmpeg** để:

1. Đọc file audio gốc từ Storage.
2. Áp dụng các bộ lọc `atrim` (Audio Trim) và `concat` (Ghép nối) dựa trên danh sách Segments.
3. Chuyển đổi (Transcode) kết quả thành một stream âm thanh duy nhất.
4. Gửi trực tiếp (Pipe) stream này về phía Client.

---

## 3. Quy trình thực hiện tại Backend (Internal Logic)

1. **Truy vấn Segments**: Backend lấy mảng `segments` từ bảng `identify_sessions` lọc theo `label` được yêu cầu (ví dụ: `speaker_0`).
2. **Khởi tạo FFmpeg**:
   - Sử dụng lệnh `ffmpeg -i input.wav`.
   - Với mỗi Segment, tạo một filter: `[0:a]atrim=start=0.5:end=15.2,asetpts=PTS-STARTPTS[a0]`.
   - Kết nối tất cả các filter lại bằng filter `concat`.
3. **Streaming**: Kết quả được đẩy thẳng ra `Response` đối tượng của Express.
4. **Hiệu năng**: Quá trình này diễn ra cực nhanh (< 100ms cho việc khởi tạo) và không lưu file tạm trên đĩa cứng (Ram-to-Stream).

---

## 4. Hướng dẫn dành cho Frontend (Media Implementation)

Để tích hợp API này vào giao diện Người nói (Speaker Cards), FE cần xử lý như sau:

### 4.1 Cấu trúc URL

Link audio cho mỗi người nói sẽ có định dạng:
`http://api.domain.com/v1/sessions/uuid-123/speakers/speaker_0/audio`

### 4.2 Tích hợp thẻ `<audio>`

FE chỉ cần truyền URL này vào thuộc tính `src` của thẻ audio chuẩn HTML5:

```html
<audio controls>
  <source
    src="http://api.domain.com/v1/sessions/.../speaker_0/audio"
    type="audio/mpeg"
  />
  Trình duyệt của bạn không hỗ trợ phát âm thanh.
</audio>
```

### 4.3 Quản lý Authentication

Vì API này yêu cầu Bearer Token, FE không thể dùng thẻ `<audio>` truyền thống nếu Server yêu cầu Token trong Header.
**Giải pháp**:

- Cách 1: Truyền token qua Query Param (ví dụ: `?token=xxx`). Cần Backend hỗ trợ.
- Cách 2: Sử dụng `fetch` với Header Authorization để tải dữ liệu dưới dạng `Blob`, sau đó tạo `URL.createObjectURL(blob)` để gán vào thẻ audio.

---

## 5. Ví dụ kết quả phản hồi

API này không trả về JSON mà trả về **Dòng âm thanh nhị phân** (Audio Binary Stream).

### Header phản hồi (Expected):

- `Content-Type`: `audio/mpeg` (Hoặc loại audio tương ứng).
- `Transfer-Encoding`: `chunked` (Dữ liệu được gửi theo từng phần).
- `Accept-Ranges`: `bytes` (Hỗ trợ người dùng tua nhanh audio).

---

## 6. Các trường hợp lỗi & Xử lý (Troubleshooting)

- **404 Not Found**:
  - Session ID không hợp lệ.
  - Speaker Label không tồn tại trong phiên này (Vd: Gửi `speaker_5` trong khi session chỉ có 2 người).
- **500 Internal Server Error**: Thường xảy ra khi FFmpeg gặp lỗi trong quá trình xử lý filter (vd: tệp gốc bị hỏng).
- **File Loss**: Nếu tệp âm thanh gốc bị mất trên Storage, Backend sẽ báo lỗi 404 kèm thông báo "File gốc không khả dụng để trích xuất".

---

## 7. Integrity & Media Quality

- **Bitrate**: Stream đầu ra giữ nguyên Bitrate của file gốc để đảm bảo chất lượng nhận diện của con người.
- **Duration**: Độ dài của stream trả về sẽ đúng bằng tổng thời lượng nói của Speaker đó (Tổng các Segments). Điều này giúp Operator không phải nghe các đoạn im lặng hoặc giọng của người khác.

---

> [!NOTE]
> Việc trích xuất âm thanh này là hoàn toàn động. Mọi thay đổi về `segments` trong Database (nếu có) sẽ được phản ánh ngay lập tức trong lần gọi API tiếp theo.

---

> **Các tài liệu liên kết:**
>
> - [Chi tiết phiên làm việc](./get-session-detail.md)
> - [Module Identify (Quy trình sinh Segments)](../identify/multi-identify.md)
