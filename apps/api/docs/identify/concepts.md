# Cấu trúc AI Identity Cache

## Mục đích

`ai_identities_cache` lưu tạm danh tính do AI Core phát hiện nhưng chưa có hồ sơ chính
thức trong `voice_records`. Bản ghi cache không được coi là dữ liệu định danh đã xác
minh.

## Dữ liệu chính

- `voice_id`: khóa chính, do AI Core cung cấp.
- Metadata tùy chọn: tên, CCCD, số điện thoại, quê quán, nghề nghiệp, hộ chiếu và
  thông tin tiền án.
- `raw`: response gốc dạng JSON để phục vụ đối soát.
- `first_seen_at`: thời điểm hệ thống ghi nhận lần đầu.

## Phạm vi truy cập

- `ADMIN` có thể tra cứu toàn bộ cache.
- Tài khoản khác chỉ thấy `voice_id` xuất hiện trong session do mình tạo.
- API có thể trả `404` thay vì tiết lộ một AI Voice nằm ngoài phạm vi truy cập.

## Vòng đời

1. Identify nhận kết quả từ AI Core.
2. Kết quả và session được lưu để truy vết.
3. AI Voice chưa enroll xuất hiện trong danh sách `/api/v1/ai-voices`.
4. Operator xác minh và thực hiện convert khi phù hợp.
5. Khi đã có `voice_records`, AI Voice không còn xuất hiện trong danh sách chưa
   enroll.

Không dùng cache làm nguồn sự thật cho thông tin cá nhân. Nguồn dữ liệu nghiệp vụ là
`users` và `voice_records`.

Xem thêm: [Danh sách AI Voices](../ai-voices/list-ai-voices.md).
