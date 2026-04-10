# Module Danh tính tiềm năng (AI Voices & Identity Cache)

> [!CAUTION]
> **THÔNG BÁO CHO TEAM FRONTEND**: Hiện tại Module AI Voices đang trong quá trình hoàn thiện ở phía Backend. Team FE **chưa cần triển khai** module này cho đến khi có thông báo chính thức tiếp theo.

> [!WARNING]
> **LƯU Ý QUAN TRỌNG**: Mọi thay đổi liên quan đến cấu trúc dữ liệu của `ai_identities_cache` cần được thông báo cho đội ngũ Backend để đảm bảo tính đồng bộ với mô hình AI.

Chào mừng bạn đến với tài liệu kỹ thuật của module **AiVoices**. Đây là tầng dữ liệu chứa các danh tính do AI tự tạo ra (**AI Truth**) trong các phiên nhận dạng khi không tìm thấy kết quả phù hợp trong kho dữ liệu chính xác (**Business Truth**).

---

## 1. Triết lý thiết kế (AI Truth Philosophy)

Trong một hệ thống nhận dạng giọng nói Enterprise, chúng ta không thể bỏ qua các giọng nói "Lạ". Module AiVoices giải quyết bài toán: "Làm sao để hệ thống vẫn nhớ được một người ngay cả khi họ chưa bao giờ đăng ký?"

### 1.1 Tính tồn tại của Danh tính AI

Khi AI nhận diện được một giọng nói mới, nó sẽ tự cấp một ID ngẫu nhiên và lưu trữ đặc trưng đó vào `ai_identities_cache`.

- Tại các phiên nhận dạng sau, nếu người đó quay lại, AI sẽ nhận diện ra chính cái ID tạm thời đó.
- Điều này cho phép Operator theo dõi được hành vi của một "Người lạ" qua nhiều phiên làm việc khác nhau trước khi quyết định định danh họ chính thức.

### 1.2 Sự tách biệt với Business Truth

Bản ghi trong AiVoices **chưa** được coi là một con người (User) hợp pháp. Chúng chỉ là những "Thực thể sóng âm".

- Dữ liệu này không có các thông tin cá nhân như CCCD, SĐT hay Nghề nghiệp.
- Chúng đóng vai trò là "Dữ liệu thô" (Raw data) chờ được Operator phê duyệt để chuyển đổi thành hồ sơ chính thức.

---

## 2. Danh mục tài liệu chi tiết

Module AiVoices được tổ chức thành các phần chuyên môn để phục vụ luồng xử lý định danh:

| Tài liệu                                       | Nội dung chính                                                                                  | Đối tượng     |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------ |
| **[Danh sách AI Voices](./list-ai-voices.md)** | Hướng dẫn tra cứu các danh tính tiềm năng, lọc theo thời gian và tần suất xuất hiện.            | FE / Operator |
| **[Chuyển đổi danh tính](./convert-voice.md)** | **[Trọng tâm]** Quy trình chuyển đổi 1 bản ghi AI Truth thành 1 User Business Truth hoàn chỉnh. | FE / BE       |

---

## 3. Workflow tổng quát (Lifecycle of an AI Voice)

1. **Phát hiện (Discovery)**: AI thực hiện Identify và tìm thấy một giọng nói lạ vượt ngưỡng tin cậy tối thiểu (Vd: 0.75).
2. **Lưu cache**: Hệ thống kiểm tra ID này đã có trong `ai_identities_cache` chưa. Nếu chưa -> INSERT bản ghi mới với tên tạm là `AI Identity #XXXX`.
3. **Theo dõi (Tracking)**: Qua nhiều phiên Session, ID này xuất hiện liên tục với điểm số cao.
4. **Phê duyệt (Conversion)**: Operator nhận thấy đây là một đối tượng quan trọng cần quản lý. Họ sử dụng chức năng **Convert** để nhập thông tin cá nhân.
5. **Đăng ký chính thức (Enrolled)**: Bản ghi AI Voice bị xóa, thay thế bằng bản ghi trong bảng `users` và `voice_records`. Từ lúc này, AI sẽ nhận diện đối tượng theo Tên thật.

---

## 4. Các thực thể dữ liệu liên quan

- **AI Identities Cache**: Bảng lưu trữ ID và metadata tạm do AI sinh ra.
- **Identify Sessions**: Liên kết với AI Voices thông qua `voice_id` để hiển thị lịch sử "người lạ".

---

## 5. Lưu ý dành cho Frontend

- **Giao diện riêng biệt**: FE nên thiết kế một màn hình riêng (Vd: "Danh sách người lạ") để Operator không bị nhầm lẫn với danh sách "Khách hàng/Nhân viên" đã đăng ký.
- **Dữ liệu mỏng**: Các bản ghi này không có nhiều thông tin để hiển thị ngoài ID và Lần xuất hiện gần nhất. Hãy tập trung vào việc hiển thị **Số lượng Session** mà ID này đã tham gia.
- **Cơ chế chuyển đổi (Modal)**: Khi người dùng nhấn "Convert", FE nên mở một Form tương tự như trang Enroll nhưng đã được điền sẵn một số thông tin (như Audio File ID gốc) để tiết kiệm thời gian cho người dùng.

---

> [!IMPORTANT]
> Module AiVoices chính là công cụ giúp hệ thống **"Tự học"** và mở rộng kho dữ liệu định danh theo thời gian một cách tự động và thông minh.

---

> **Tài liệu tham khảo tiếp theo:** [Danh sách AI Voices](./list-ai-voices.md)
