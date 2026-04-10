# API: Vô hiệu hóa hồ sơ (Soft Deactivation & Archival)

Tài liệu này giải thích chi tiết quy trình **UC07 — Vô hiệu hóa hồ sơ giọng nói**, một cơ chế thay thế cho việc xóa vật lý dữ liệu (Hard Delete) để đảm bảo tính toàn vẹn của hệ thống và phục vụ mục đích lưu vết (Audit Trail) lâu dài.

---

## 1. Thông tin chung

- **Endpoint**: `PATCH /api/v1/voices/:id/deactivate`
- **Phương thức**: `PATCH`.
- **Quyền truy cập**: `Operator`, `Admin` (Cần Token có thẩm quyền cao).
- **Phạm vi tác động**: Bảng `voice_records`.

---

## 2. Tại sao không sử dụng "Xóa" (Delete)?

Trong các hệ thống nhận dạng sinh trắc học phục vụ an ninh và đối soát tội phạm, việc xóa vật lý (Physical Deletion) một hồ sơ giọng nói là một rủi ro lớn vì:

1. **Mất dấu vết lịch sử**: Nếu xóa User, các phiên nhận dạng trong quá khứ liên kết với ID đó sẽ bị mồ côi (Orphaned Record).
2. **Đối soát tội phạm**: Các giọng nói vi phạm cần được lưu trữ vĩnh viễn trong kho lưu trữ (Archive) để AI có thể nhận diện lại nếu đối tượng tái xuất hiện dưới một danh tính khác.
3. **Pháp lý**: Đảm bảo tuân thủ các quy định về việc lưu trữ dữ liệu điện tử của Ngành (Data Retention Policies).

Do đó, hành động "Deactivate" bản chất là **chuyển hồ sơ vào trạng thái ngưng hoạt động** nhưng vẫn giữ nguyên giá trị dữ liệu trong Database.

---

## 3. Quy trình thực hiện tại Backend

Khi Frontend gửi yêu cầu Vô hiệu hóa, hệ thống thực hiện các bước sau:

1. **Xác thực User**: Kiểm tra xem User ID có tồn tại không. Nếu không -> 404.
2. **Kiểm tra trạng thái**: Nếu hồ sơ đã ở trạng thái `INACTIVE`, trả về thông báo thành công ngay lập tức để đảm bảo tính idempotent.
3. **Transaction DB**:
   - Cập nhật trường `is_active = false` trong bảng `voice_records` cho tất cả các bản ghi liên quan đến User này.
   - Cập nhật thông tin `updated_at` và `deactivated_by` (Lưu User ID của người thực hiện).
4. **AI Sync (Lazy Update)**:
   - Khi có yêu cầu Identify tiếp theo, hệ thống sẽ lọc bỏ (Filter-out) các `voice_id` có `is_active: false` trong Database trước khi trả kết quả cho người dùng.
   - _Lưu ý_: Qdrant vẫn giữ Point này nhưng logic nghiệp vụ ở Backend sẽ ẩn nó đi.
5. **Clear Cache**: Xóa tệp cache của hồ sơ này nếu đang được lưu trên RAM của AI Service.

---

## 4. Request & Response

### URL Parameters

- `:id`: **UUID** của User cần vô hiệu hóa.

### Ví dụ Request:

```bash
curl -X PATCH "http://localhost:3000/api/v1/voices/uuid-xxx/deactivate" \
     -H "Authorization: Bearer <access_token>"
```

### Ví dụ Response Thành công (200 OK):

```json
{
  "statusCode": 200,
  "message": "Vô hiệu hóa hồ sơ giọng nói thành công",
  "data": {
    "id": "uuid-xxx",
    "status": "INACTIVE",
    "deactivated_at": "2026-04-10T16:30:00Z"
  }
}
```

---

## 5. Tác động của việc Vô hiệu hóa

Sau khi hồ sơ bị vô hiệu hóa, hệ thống sẽ thay đổi hành vi như sau:

| Module           | Tác động                                                                                                                                                                            |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Voices List**  | Hồ sơ **biến mất** hoàn toàn khỏi API `GET /api/v1/voices`.                                                                                                                         |
| **Identify**     | Nếu AI nhận diện ra giọng nói này, Backend sẽ kiểm tra trạng thái `is_active` và trả về kết quả là **"Không xác định"** hoặc **"AI Voice (Unenrolled)"** thay vì thông tin User cũ. |
| **Sessions**     | Các phiên nhận dạng cũ trong lịch sử vẫn hiển thị tên User này (Snapshot metadata) nhưng có kèm nhãn `[Inactive]`.                                                                  |
| **Update Voice** | Các job cập nhật embedding liên quan đến User này sẽ bị dừng hoặc báo lỗi 404.                                                                                                      |

---

## 6. Hướng dẫn dành cho Frontend (Confirmation Dialog)

Vô hiệu hóa là một hành động có ảnh hưởng lớn. FE bắt buộc phải thực hiện quy trình xác nhận:

1. **Hiển thị Dialog**: "Bạn có chắc chắn muốn vô hiệu hóa hồ sơ này không? Hành động này sẽ ẩn người dùng khỏi mọi kết quả nhận dạng mới."
2. **Yêu cầu lý do**: (Tùy chọn) FE có thể yêu cầu Operator nhập lý do vô hiệu hóa (Gửi kèm trong Body nếu cần mở rộng API).
3. **Xác nhận mật khẩu**: Đối với một số hệ thống yêu cầu bảo mật cực cao, FE có thể yêu cầu Re-authenticate trước khi cho phép Patch Deactivate.

---

## 7. Khôi phục hồ sơ (Re-activation)

Hiện tại, hệ thống **CHƯA** cung cấp API để khôi phục (Recover) một hồ sơ đã bị vô hiệu hóa thông qua UI để đảm bảo tính kỷ luật dữ liệu.
Việc khôi phục chỉ có thể được thực hiện bởi **Database Administrator** bằng cách cập nhật trực tiếp SQL:

```sql
UPDATE voice_records SET is_active = true WHERE user_id = 'uuid-xxx';
```

---

## 8. Integrity & Security

- **Safe Handling**: Thao tác này an toàn gấp 10 lần so với lệnh DELETE vì nó không phá vỡ các khóa ngoại (Foreign Keys) trong Database.
- **Biometric Preservation**: Mẫu giọng nói vẫn được giữ lại, đề phòng trường hợp User này cố tình đăng ký lại một tài khoản mới để thực hiện hành vi xấu, AI vẫn có thể đối soát chéo (Cross-match).

---

> [!WARNING]
> Thao tác Vô hiệu hóa sẽ dừng mọi kết nối realtime liên quan đến profile này. Nếu FE đang mở trang detail của hồ sơ này, cần redirect người dùng về trang danh sách ngay lập tức sau khi thành công.

---
