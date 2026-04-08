# Identification Module

Tài liệu chi tiết về module nhận dạng giọng nói, bao gồm nhận dạng đơn và nhận dạng hội thoại.

## Endpoints

- [Single Identify](./single-identify.md) — Nhận dạng một người nói trong audio.
- [Multi Identify (Diarization)](./multi-identify.md) — Phân tách và nhận dạng nhiều người nói.

## Quy trình chung

1. Thu thập dữ liệu âm thanh từ Client.
2. Trích xuất đặc trưng và so khớp vector qua AI Service.
3. Đồng bộ hóa dữ liệu User (Lazy Migration) nếu cần.
4. Lưu trữ lịch sử phiên nhận dạng.

---

> [!TIP]
> Luôn đảm bảo chất lượng file ghi âm tốt (WAV format) để đạt độ chính xác cao nhất.
