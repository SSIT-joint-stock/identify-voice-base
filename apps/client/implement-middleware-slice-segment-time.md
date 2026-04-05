# Tổng hợp thay đổi & Tài liệu kỹ thuật (Voice Identify)

Tài liệu này tóm tắt các thay đổi quan trọng trong quy trình đăng ký (Enrollment) và nhận diện (Identification) giọng nói để giải quyết các vấn đề về nhiễu âm thanh và hiển thị UI.

## 1. Cắt âm thanh tại Frontend (Core Fix)

### Vấn đề

Backend hiện tại không hỗ trợ tham số `start` và `end` để cắt file khi đăng ký. Nếu gửi toàn bộ file có nhiều người nói, hệ thống sẽ lưu model giọng nói bị trộn lẫn (nhiễu), dẫn đến nhận diện sai người này thành người kia.

### Giải pháp

Triển khai công cụ cắt âm thanh ngay tại trình duyệt trước khi upload.

- **Kỹ thuật**: Sử dụng Web Audio API và thư viện `audiobuffer-to-wav`.
- **Luồng xử lý**:
  1. Khi người dùng chọn "Đăng ký giọng nói" từ kết quả tra cứu.
  2. Frontend tự động xác định đoạn âm thanh dài nhất và sạch nhất của speaker đó.
  3. Sử dụng `AudioContext` để giải mã và cắt chính xác đoạn âm thanh.
  4. Mã hóa lại thành file `.wav` chuẩn và upload lên server.
- **Kết quả**: Model giọng nói trên server sẽ luôn "sạch", chỉ chứa giọng của 1 người duy nhất.

## 2. Cải thiện UI Tra cứu Multi-Speaker

### Vấn đề

- Kết quả tra cứu 1-2 người (`/identify_2_voice/`) trả về dữ liệu phức tạp, đôi khi bị mất thông tin người thứ 2 do logic parsing chưa linh hoạt.
- React keys bị trùng lặp khi cả 2 speaker cùng khớp với 1 danh tính đã đăng ký.

### Giải pháp

- **Xử lý API linh hoạt**: Cập nhật layer API để hỗ trợ cả định dạng mảng (Array) và đối tượng (Object) có index (`"0"`, `"1"`).
- **Chuẩn hóa dữ liệu mới**: Tự động tìm kiếm thông tin profile (tên, CCCD...) ngay cả khi chúng được lồng sâu trong các object `match` hoặc `result` từ backend.
- **Rendering ổn định**: Thêm `speakerIndex` vào các component hiển thị để đảm bảo React keys luôn duy nhất, tránh các lỗi render và layout.

## 3. Danh sách các file thay đổi chính

| File                                                                                                                                                                          | Chức năng                                                         |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| [src/utils/audio.utils.ts](file:///home/trh_thanh30/Documents/voice-identify-fe/src/utils/audio.utils.ts)                                                                     | **(Mới)** Xử lý cắt ghép và mã hóa âm thanh WAV.                  |
| [src/feature/voice/api/voice.api.ts](file:///home/trh_thanh30/Documents/voice-identify-fe/src/feature/voice/api/voice.api.ts)                                                 | Cập nhật logic normalize dữ liệu và gỡ bỏ các param không hỗ trợ. |
| [src/feature/voice/hooks/use-voice.ts](file:///home/trh_thanh30/Documents/voice-identify-fe/src/feature/voice/hooks/use-voice.ts)                                             | Đồng bộ hóa dữ liệu gửi lên (chỉ gửi file đã cắt).                |
| [src/feature/voice/components/voice-upload-form.tsx](file:///home/trh_thanh30/Documents/voice-identify-fe/src/feature/voice/components/voice-upload-form.tsx)                 | Tích hợp xử lý cắt âm thanh trước khi submit.                     |
| [src/feature/voice/components/voice-speaker-result-card.tsx](file:///home/trh_thanh30/Documents/voice-identify-fe/src/feature/voice/components/voice-speaker-result-card.tsx) | Cải thiện nhận diện "Unknown" và truyền index cho table.          |
| [src/feature/voice/components/voice-top5-match-table.tsx](file:///home/trh_thanh30/Documents/voice-identify-fe/src/feature/voice/components/voice-top5-match-table.tsx)       | Đảm bảo unique keys cho từng dòng kết quả.                        |

## 4. Hướng dẫn kiểm tra (Verification)

1. **Tra cứu đa người**: Tải file có 2 người nói chưa đăng ký.
2. **Đăng ký speaker 2**: Click "Đăng ký" cho người thứ 2.
3. **Quan sát Toast**: Sẽ thấy thông báo "Đang xử lý cắt âm thanh...".
4. **Kiểm tra kết quả**: Khi tra cứu lại file đó, người thứ 2 sẽ được nhận diện đúng tên, không bị lẫn lộn với người 1.
