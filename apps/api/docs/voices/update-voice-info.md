# Update Voice Info — PUT /api/voices/:id

Cập nhật thông tin cá nhân của người dùng sở hữu hồ sơ giọng nói. Thao tác này chỉ thay đổi metadata trong PostgreSQL và **không** ảnh hưởng đến vector embedding trong Qdrant.

## Request

```http
PUT /api/voices/f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Body Schema

| Field                    | Type     | Description                    |
| ------------------------ | -------- | ------------------------------ |
| `name`                   | `string` | Tên người dùng (max 100 ký tự) |
| `citizen_identification` | `string` | Số CCCD (max 20 ký tự)         |
| `phone_number`           | `string` | Số điện thoại (10-11 chữ số)   |
| `hometown`               | `string` | Quê quán                       |
| `job`                    | `string` | Nghề nghiệp                    |
| `criminal_record`        | `array`  | Danh sách tiền án tiền sự      |

### Example Request Body

```json
{
  "name": "Nguyễn Văn A",
  "phone_number": "0987654321",
  "job": "Công an",
  "criminal_record": [
    {
      "case": "Trộm cắp tài sản",
      "year": 2021
    }
  ]
}
```

## Response

### Success (200 OK)

```json
{
  "statusCode": 200,
  "message": "Cập nhật thông tin cá nhân thành công!",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Nguyễn Văn A",
    "phone_number": "0987654321",
    "job": "Công an"
  }
}
```

## Business Logic

Endpoint này chỉ thực hiện lệnh `UPDATE` trên bảng `users`. Nó được tách biệt hoàn toàn với luồng cập nhật đặc trưng giọng nói (UC04 - `/api/voices/:id/update-voice`) để đảm bảo tính toàn vẹn của dữ liệu sinh trắc học.

> [!IMPORTANT]
> Việc thay đổi `citizen_identification` hoặc `phone_number` tại đây sẽ ảnh hưởng đến kết quả tìm kiếm trong danh sách hồ sơ, nhưng không làm thay đổi định danh `voice_id` dùng để liên kết với hệ thống AI.
