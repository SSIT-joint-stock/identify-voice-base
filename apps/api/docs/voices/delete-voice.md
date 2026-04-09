# Delete Voice — DELETE /api/voices/:id

Xóa hoàn toàn hồ sơ giọng nói khỏi hệ thống. Đây là quy trình **Biometric Destruction**, đảm bảo tất cả dấu vết sinh trắc học và thông tin cá nhân liên quan được tiêu hủy một cách an toàn.

## Request

```http
DELETE /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
```

### Path Parameters

| Param | Type     | Mô tả                       |
| ----- | -------- | --------------------------- |
| `id`  | `string` | UUID của người dùng cần xóa |

### Example cURL

```bash
curl -X DELETE "http://localhost:3000/api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer <access_token>"
```

## Response

### Success (200 OK)

```json
{
  "statusCode": 200,
  "message": "Xóa hồ sơ giọng nói thành công!",
  "data": {
    "deleted_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

## Quy trình tiêu hủy (Biometric Destruction)

Để đảm bảo an toàn và quyền riêng tư, quy trình xóa được thực hiện theo thứ tự ưu tiên tiêu hủy dữ liệu sinh trắc học trước:

| Bước | Hành động          | Mô tả                                                                                                                                         |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **AI Destruction** | Gửi yêu cầu tới AI Service để xóa vĩnh viễn vector embedding trong Qdrant. Nếu bước này lỗi, quy trình dừng lại để bảo toàn dữ liệu đối soát. |
| 2    | **File Cleanup**   | Xóa các file audio vật lý lưu trữ trên server (Best effort).                                                                                  |
| 3    | **DB Destruction** | Xóa hoàn toàn record User và VoiceRecord khỏi PostgreSQL (Hard delete).                                                                       |

> [!CAUTION]
> Thao tác này **không thể hoàn tác**. Một khi đã thực hiện, tất cả dữ liệu nhận dạng và lịch sử liên kết trực tiếp với người dùng này sẽ bị xóa khỏi hệ thống.
