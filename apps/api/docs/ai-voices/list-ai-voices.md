# Danh sách AI Voices

Tài liệu mô tả API tra cứu các giọng nói do AI Core phát hiện nhưng chưa được đăng ký
thành hồ sơ giọng nói chính thức.

## API

| Chức năng | Method | Endpoint                |
| --------- | ------ | ----------------------- |
| Danh sách | `GET`  | `/api/v1/ai-voices`     |
| Chi tiết  | `GET`  | `/api/v1/ai-voices/:id` |

Hai API yêu cầu access token và permission `voices.read`.

## Tham số danh sách

| Tham số     | Mặc định | Mô tả                                 |
| ----------- | -------- | ------------------------------------- |
| `page`      | `1`      | Trang hiện tại, tối thiểu 1           |
| `page_size` | `10`     | Số bản ghi mỗi trang, từ 1 đến 100    |
| `search`    | Không có | Tìm theo tên, CCCD hoặc số điện thoại |

Kết quả gồm `items` và thông tin phân trang: `page`, `page_size`, `total`,
`total_pages`.

## Phạm vi dữ liệu

- `ADMIN` có thể xem toàn bộ AI Voice chưa được enroll.
- Tài khoản khác chỉ thấy AI Voice xuất hiện trong session do chính tài khoản đó tạo.
- AI Voice đã có trong `voice_records` không còn xuất hiện trong danh sách này.
- API chi tiết trả `404` khi ID không tồn tại hoặc nằm ngoài phạm vi được phép xem.

## Nguồn dữ liệu

Thông tin được đọc từ `ai_identities_cache`. `voice_id` là mã do AI Core cung cấp;
metadata có thể chưa đầy đủ và chỉ trở thành hồ sơ nghiệp vụ sau khi được chuyển đổi.

Xem tiếp: [Chuyển đổi AI Voice](./convert-voice.md).
