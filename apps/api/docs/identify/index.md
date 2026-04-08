# Identification Module

Tài liệu chi tiết về module nhận dạng giọng nói, bao gồm nhận dạng đơn và nhận dạng hội thoại (tích hợp vào chung 1 route).

## Endpoints

- [Identify Voice](./identify.md) — Endpoint thống nhất để nhận dạng một hoặc nhiều người trong audio.

## Quy trình chung

1. Thu thập dữ liệu âm thanh từ Client (Kèm field format `type` là `SINGLE` hoặc `MULTI`).
2. Trích xuất đặc trưng và so khớp vector qua AI Service thông qua Anti-Corruption Layer (AiCoreService).
3. Đẩy RAW Kết Quả AI Suggestion vào `ai_identities_cache`. (Không còn tự động Merge Users - chống ô nhiễm data).
4. Lưu trữ lịch sử phiên nhận dạng dưới dạng thuần JSON, phục vụ cho Lazy Enrichment của module Sessions.

---

> [!TIP]
> Luôn đảm bảo chất lượng file ghi âm tốt (WAV format) để đạt độ chính xác cao nhất. Trang này tập trung thuần túy cho AI Interaction.
