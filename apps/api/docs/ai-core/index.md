# AI Core Proxy API

Tài liệu này mô tả các endpoint backend dùng để proxy sang AI Core services.

Mục tiêu chính của lớp backend là:

- Chuẩn hóa đường dẫn API cho frontend.
- Che giấu chi tiết base URL của từng AI Core service.
- Validate input trước khi gọi AI Core.
- Áp permission theo tài khoản đăng nhập.
- Giữ response gần như nguyên bản từ AI Core để FE dễ đối chiếu với tài liệu AI.

---

## 1. Tổng quan

Base URL backend:

```txt
/api/v1/ai-core
```

Tất cả endpoint trong module này yêu cầu JWT access token.

Header bắt buộc:

```http
Authorization: Bearer <access_token>
```

Các endpoint hiện có:

| Method | Path                   | Chức năng               | Permission      |
| :----- | :--------------------- | :---------------------- | :-------------- |
| `POST` | `/ocr`                 | OCR ảnh/PDF/DOCX/TXT    | `ocr.run`       |
| `POST` | `/speech-to-text`      | Chuyển audio thành text | `s2t.run`       |
| `POST` | `/translate`           | Dịch văn bản            | `translate.run` |
| `POST` | `/detect-language`     | Phát hiện ngôn ngữ      | `translate.run` |
| `POST` | `/translate-summarize` | Dịch và tóm tắt         | `translate.run` |

---

## 2. Cấu hình AI Core

Backend đọc base URL AI Core từ environment:

```env
AI_CORE_IDENTIFY_URL=http://localhost:1122
AI_CORE_OCR_URL=http://localhost:8003
AI_CORE_SPEECH_TO_TEXT_URL=http://localhost:8996
AI_CORE_TRANSLATION_URL=http://localhost:8505
AI_SERVICE_TIMEOUT=30000
AUDIO_NORMALIZE_TIMEOUT_MS=15000
```

Lưu ý:

- `AI_CORE_IDENTIFY_URL` dùng cho voice identify/enroll hiện có.
- `AI_CORE_OCR_URL` dùng cho OCR.
- `AI_CORE_SPEECH_TO_TEXT_URL` dùng cho Speech-to-Text.
- `AI_CORE_TRANSLATION_URL` dùng cho translate, detect language, translate summarize.
- `AI_SERVICE_TIMEOUT` là timeout HTTP khi backend gọi sang AI Core.
- `AUDIO_NORMALIZE_TIMEOUT_MS` dùng cho bước normalize audio trước các luồng voice identify/enroll.

Backend không expose các URL này cho FE.

FE chỉ gọi backend theo `/api/v1/ai-core/...`.

---

## 3. Permission

Module này dùng permission riêng:

```ts
OCR.RUN;
S2T.RUN;
TRANSLATE.RUN;
```

Mapping thực tế:

```ts
@Permissions([OCR.RUN])
@Permissions([S2T.RUN])
@Permissions([TRANSLATE.RUN])
```

Giá trị string tương ứng:

```txt
ocr.run
s2t.run
translate.run
```

Nếu user thiếu permission, backend trả lỗi forbidden theo guard chung.

FE nên:

- Ẩn hoặc disable tab OCR nếu thiếu `ocr.run`.
- Ẩn hoặc disable tab Speech-to-Text nếu thiếu `s2t.run`.
- Ẩn hoặc disable các chức năng translate nếu thiếu `translate.run`.
- Không chỉ dựa vào ẩn UI, backend vẫn kiểm tra permission.

---

## 4. Response Wrapper

Backend đang dùng response interceptor chung.

Thông thường response từ controller sẽ được bọc dạng:

```json
{
  "success": true,
  "message": "OCR thành công",
  "data": {
    "results": []
  }
}
```

Trong phần mô tả từng endpoint bên dưới, mục "AI data" là phần nằm trong `data`.

FE nên viết helper unwrap response:

```ts
function unwrap<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
```

---

## 5. Ngôn ngữ hỗ trợ

Danh sách language được backend quản lý tập trung trong:

```txt
apps/api/src/module/ai-core/constants/languages.ts
```

Không hardcode lại danh sách ở nhiều nơi trong FE nếu không cần.

Nếu FE cần render dropdown, có thể copy danh sách từ API docs hoặc yêu cầu BE expose metadata endpoint sau.

### 5.1 OCR languages

| Code | Language   |
| :--- | :--------- |
| `vi` | Vietnamese |
| `en` | English    |
| `de` | German     |
| `fr` | French     |
| `ja` | Japanese   |
| `ko` | Korean     |

### 5.2 Speech-to-Text languages

| Code | Language   |
| :--- | :--------- |
| `vi` | Vietnamese |
| `en` | English    |
| `zh` | Chinese    |
| `ja` | Japanese   |
| `ko` | Korean     |
| `fr` | French     |
| `ru` | Russian    |
| `de` | German     |

### 5.3 Translation languages

| Code      | Language            |
| :-------- | :------------------ |
| `zh`      | Chinese Simplified  |
| `zh-Hant` | Chinese Traditional |
| `yue`     | Cantonese           |
| `en`      | English             |
| `fr`      | French              |
| `de`      | German              |
| `it`      | Italian             |
| `pt`      | Portuguese          |
| `es`      | Spanish             |
| `nl`      | Dutch               |
| `pl`      | Polish              |
| `cs`      | Czech               |
| `uk`      | Ukrainian           |
| `ru`      | Russian             |
| `ar`      | Arabic              |
| `fa`      | Persian             |
| `he`      | Hebrew              |
| `hi`      | Hindi               |
| `bn`      | Bengali             |
| `ur`      | Urdu                |
| `gu`      | Gujarati            |
| `te`      | Telugu              |
| `mr`      | Marathi             |
| `ta`      | Tamil               |
| `ja`      | Japanese            |
| `ko`      | Korean              |
| `th`      | Thai                |
| `vi`      | Vietnamese          |
| `ms`      | Malay               |
| `id`      | Indonesian          |
| `tl`      | Filipino            |
| `km`      | Khmer               |
| `my`      | Burmese             |
| `lo`      | Lao                 |
| `bo`      | Tibetan             |
| `kk`      | Kazakh              |
| `mn`      | Mongolian           |
| `ug`      | Uyghur              |

---

## 6. Endpoint OCR

```http
POST /api/v1/ai-core/ocr
```

Chức năng:

- Nhận file ảnh/PDF/DOCX/TXT từ FE.
- Gửi file sang AI Core OCR.
- Trả kết quả OCR dạng JSON box hoặc plain text tùy `format`.

Permission:

```txt
ocr.run
```

Content-Type:

```txt
multipart/form-data
```

Request fields FE gửi vào backend:

| Field      | Vị trí    | Kiểu           | Bắt buộc | Mặc định | Ghi chú                          |
| :--------- | :-------- | :------------- | :------- | :------- | :------------------------------- |
| `file`     | form-data | File           | Có       | -        | File cần OCR                     |
| `language` | form-data | string         | Không    | Không có | Một trong OCR languages          |
| `format`   | form-data | boolean/string | Không    | `false`  | Backend parse `"true"`/`"false"` |

Backend gọi sang AI Core:

```http
POST {AI_CORE_OCR_URL}/ocr/?format=<true|false>
```

Body gửi sang AI Core:

- `file`: multipart form-data.
- `language`: multipart form-data nếu FE có truyền.

`format` không gửi trong form-data.

`format` được gửi qua query param:

```txt
/ocr/?format=true
/ocr/?format=false
```

Ví dụ FE dùng Axios:

```ts
const formData = new FormData();
formData.append('file', file);
formData.append('language', 'vi');
formData.append('format', 'true');

const res = await axios.post('/api/v1/ai-core/ocr', formData);
```

AI data khi `format=false`:

```json
{
  "results": [
    {
      "page": 0,
      "result": [
        {
          "box": [
            [10, 20],
            [120, 40]
          ],
          "text": "Nội dung nhận dạng được"
        }
      ]
    }
  ]
}
```

AI data khi `format=true`:

```json
{
  "results": "Dòng 1\nDòng 2\nDòng 3"
}
```

FE nên triển khai:

- Nếu `format=true`, hiển thị textarea hoặc viewer plain text.
- Nếu `format=false`, hiển thị danh sách page và text item.
- Không assume `box` luôn tồn tại nếu AI Core thay đổi response.
- Cho phép copy toàn bộ text.
- Với PDF nhiều trang, nên render accordion theo page.

Lỗi thường gặp:

| Status | Nguyên nhân              | FE xử lý                             |
| :----- | :----------------------- | :----------------------------------- |
| `400`  | File không hỗ trợ        | Báo user chọn file khác              |
| `401`  | Thiếu token              | Redirect login                       |
| `403`  | Thiếu `ocr.run`          | Ẩn chức năng hoặc báo không có quyền |
| `500`  | AI Core lỗi hoặc timeout | Cho retry                            |

---

## 7. Endpoint Speech-to-Text

```http
POST /api/v1/ai-core/speech-to-text
```

Chức năng:

- Nhận file audio từ FE.
- Gửi sang AI Core Speech-to-Text.
- Trả transcript và language detect được.

Permission:

```txt
s2t.run
```

Content-Type:

```txt
multipart/form-data
```

Request fields FE gửi vào backend:

| Field              | Vị trí FE -> BE | Kiểu           | Bắt buộc | Mặc định    | Ghi chú                        |
| :----------------- | :-------------- | :------------- | :------- | :---------- | :----------------------------- |
| `file`             | form-data       | File           | Có       | -           | File audio                     |
| `language`         | form-data       | string         | Không    | Auto detect | Một trong S2T languages        |
| `return_timestamp` | form-data       | boolean/string | Không    | `false`     | Backend gửi query sang AI Core |
| `denoise_audio`    | form-data       | boolean/string | Không    | `false`     | Backend gửi query sang AI Core |

Backend gọi sang AI Core:

```http
POST {AI_CORE_SPEECH_TO_TEXT_URL}/s2t_ml?return_timestamp=true&denoise_audio=false
```

Query params gửi sang AI Core:

| Param              | Kiểu    | Ghi chú                    |
| :----------------- | :------ | :------------------------- |
| `language`         | string  | Chỉ gửi nếu FE truyền      |
| `return_timestamp` | boolean | Luôn gửi, mặc định `false` |
| `denoise_audio`    | boolean | Luôn gửi, mặc định `false` |

Body gửi sang AI Core:

- `file`: multipart form-data.

Ví dụ FE dùng Axios:

```ts
const formData = new FormData();
formData.append('file', audioFile);
formData.append('language', 'vi');
formData.append('return_timestamp', 'true');
formData.append('denoise_audio', 'false');

const res = await axios.post('/api/v1/ai-core/speech-to-text', formData);
```

AI data khi không yêu cầu timestamp:

```json
{
  "transcript": "Xin chào, đây là bài kiểm tra nhận dạng giọng nói",
  "language": "vi"
}
```

AI data khi `return_timestamp=true` có thể là:

```json
{
  "transcript": [
    {
      "start": 0.0,
      "end": 2.4,
      "text": "Xin chào"
    }
  ],
  "language": "vi"
}
```

FE nên triển khai:

- Nếu `transcript` là string, render plain text.
- Nếu `transcript` là array, render segment list.
- Với segment list, nên support click segment để seek audio nếu có player.
- `language` dùng để hiển thị badge detected language.
- Nếu user không chọn language, không gửi hoặc để rỗng.
- Boolean nên gửi string `"true"` hoặc `"false"` trong form-data.

Lỗi thường gặp:

| Status | Nguyên nhân               | FE xử lý          |
| :----- | :------------------------ | :---------------- |
| `400`  | Audio không hợp lệ        | Báo user đổi file |
| `401`  | Thiếu token               | Redirect login    |
| `403`  | Thiếu `s2t.run`           | Ẩn chức năng      |
| `500`  | AI Core timeout/lỗi model | Cho retry         |

---

## 8. Endpoint Translate

```http
POST /api/v1/ai-core/translate
```

Chức năng:

- Dịch văn bản sang ngôn ngữ đích.
- Validate `target_lang` trước khi gọi AI Core.
- Tránh lỗi `KeyError` từ AI Core khi language không hợp lệ.

Permission:

```txt
translate.run
```

Content-Type:

```txt
application/json
```

Request body:

```json
{
  "source_text": "Xin chào thế giới",
  "target_lang": "en"
}
```

Fields:

| Field         | Kiểu   | Bắt buộc | Mặc định | Ghi chú                         |
| :------------ | :----- | :------- | :------- | :------------------------------ |
| `source_text` | string | Có       | -        | Text cần dịch                   |
| `target_lang` | string | Không    | `en`     | Một trong Translation languages |

Backend gọi sang AI Core:

```http
POST {AI_CORE_TRANSLATION_URL}/translate
```

Body gửi sang AI Core:

```json
{
  "source_text": "Xin chào thế giới",
  "target_lang": "en"
}
```

AI data:

```json
{
  "success": true,
  "original_text": "Xin chào thế giới",
  "translated_text": "Hello world",
  "target_lang": "en"
}
```

FE nên triển khai:

- Input text area cho `source_text`.
- Dropdown target language.
- Disable submit khi `source_text.trim()` rỗng.
- Render `translated_text` trong output panel.
- Cho phép copy translated text.
- Có thể hiển thị `original_text` để đối chiếu.

Validation:

- Nếu `target_lang` không nằm trong danh sách hỗ trợ, backend trả lỗi validation trước khi gọi AI Core.
- FE nên validate bằng cùng danh sách để giảm request lỗi.

---

## 9. Endpoint Detect Language

```http
POST /api/v1/ai-core/detect-language
```

Chức năng:

- Phát hiện ngôn ngữ của text đầu vào.
- Dùng cùng Translation AI Core service.

Permission:

```txt
translate.run
```

Content-Type:

```txt
application/json
```

Request body:

```json
{
  "text": "Hello world"
}
```

Fields:

| Field  | Kiểu   | Bắt buộc | Ghi chú                  |
| :----- | :----- | :------- | :----------------------- |
| `text` | string | Có       | Text cần detect language |

Backend gọi sang AI Core:

```http
POST {AI_CORE_TRANSLATION_URL}/detect_language
```

Body gửi sang AI Core:

```json
{
  "text": "Hello world"
}
```

AI data:

```json
{
  "success": true,
  "detected_languages": "en"
}
```

FE nên triển khai:

- Có thể gọi endpoint này trước khi translate.
- Nếu detect được language giống target language, có thể cảnh báo user.
- Không bắt buộc dùng endpoint này trong flow translate cơ bản.
- Nên debounce nếu dùng auto-detect khi user đang gõ.
- Không gọi detect mỗi keypress; nên đợi 500-800ms sau khi user dừng gõ.

Luồng gợi ý:

1. User nhập text.
2. FE debounce input.
3. FE gọi `/detect-language`.
4. FE hiển thị badge language detect được.
5. User chọn target language.
6. User bấm translate.

---

## 10. Endpoint Translate Summarize

```http
POST /api/v1/ai-core/translate-summarize
```

Chức năng:

- Dịch văn bản sang ngôn ngữ đích.
- Đồng thời tóm tắt nội dung.
- Phù hợp cho file dài hoặc nội dung nhiều ý.

Permission:

```txt
translate.run
```

Content-Type:

```txt
application/json
```

Request body:

```json
{
  "source_text": "File đã được tạo xong với đầy đủ nội dung, bao gồm trang bìa, 5 phần chính, tất cả bảng biểu và chi tiết Use Case từ UC01 đến UC08.",
  "target_lang": "vi"
}
```

Fields:

| Field         | Kiểu   | Bắt buộc | Mặc định | Ghi chú                         |
| :------------ | :----- | :------- | :------- | :------------------------------ |
| `source_text` | string | Có       | -        | Text cần dịch và tóm tắt        |
| `target_lang` | string | Không    | `en`     | Một trong Translation languages |

Backend gọi sang AI Core:

```http
POST {AI_CORE_TRANSLATION_URL}/translate_summarize
```

Body gửi sang AI Core:

```json
{
  "source_text": "File đã được tạo xong với đầy đủ nội dung...",
  "target_lang": "vi"
}
```

AI data:

```json
{
  "success": true,
  "original_text": "File đã được tạo xong với đầy đủ nội dung, bao gồm trang bìa, 5 phần chính, tất cả bảng biểu và chi tiết Use Case từ UC01 đến UC08.",
  "translated_text": "- File đã được tạo đầy đủ: trang bìa, 5 phần chính, bảng biểu, chi tiết Use Case từ UC01 đến UC08.",
  "target_lang": "vi"
}
```

FE nên triển khai:

- Dùng cùng UI với translate nhưng có mode switch: `Translate` / `Translate + Summarize`.
- Với summarize, label output nên là "Bản dịch tóm tắt".
- Không nên ghi đè bản dịch thường bằng bản summarize nếu user muốn so sánh.
- Có thể render `translated_text` dạng Markdown nếu AI Core trả bullet list.
- Nên giữ `original_text` để user đối chiếu.

---

## 11. Luồng FE đề xuất cho màn Dịch trực tiếp

Màn dịch trực tiếp có thể gồm:

- Text input.
- Auto detect language badge.
- Target language dropdown.
- Mode segmented control:
  - Translate.
  - Translate + Summarize.
- Output panel.
- Copy button.

Luồng cơ bản:

1. User nhập text vào `source_text`.
2. FE debounce và gọi `/detect-language`.
3. FE hiển thị `detected_languages`.
4. User chọn `target_lang`.
5. User chọn mode.
6. Nếu mode là Translate, gọi `/translate`.
7. Nếu mode là Translate + Summarize, gọi `/translate-summarize`.
8. FE unwrap response và render `translated_text`.

Pseudo code:

```ts
const detected = await aiCoreApi.detectLanguage({ text });

const result =
  mode === 'summarize'
    ? await aiCoreApi.translateSummarize({ source_text: text, target_lang })
    : await aiCoreApi.translate({ source_text: text, target_lang });
```

---

## 12. Luồng FE đề xuất cho màn Dịch tệp tin

Màn dịch tệp tin có thể kết hợp OCR và Translation.

Với file document/image:

1. User upload file.
2. FE gọi `/ocr` với `format=true`.
3. FE lấy `data.results` làm plain text.
4. FE hiển thị text OCR để user chỉnh sửa nếu cần.
5. User chọn target language.
6. FE gọi `/translate` hoặc `/translate-summarize`.
7. FE render output.

Với file audio:

1. User upload audio.
2. FE gọi `/speech-to-text`.
3. FE lấy transcript.
4. Nếu transcript là segment array, join text theo thứ tự.
5. User chọn target language.
6. FE gọi `/translate` hoặc `/translate-summarize`.
7. FE render output.

Pseudo code document flow:

```ts
const ocr = await aiCoreApi.ocr(file, {
  language: 'vi',
  format: true,
});

const text = ocr.results;

const translated = await aiCoreApi.translate({
  source_text: text,
  target_lang: 'en',
});
```

Pseudo code audio flow:

```ts
const s2t = await aiCoreApi.speechToText(file, {
  language: 'vi',
  return_timestamp: false,
  denoise_audio: true,
});

const text =
  typeof s2t.transcript === 'string'
    ? s2t.transcript
    : s2t.transcript.map((segment) => segment.text).join(' ');
```

---

## 13. FE API client gợi ý

Endpoint constants:

```ts
export const AI_CORE_ENDPOINTS = {
  OCR: '/ai-core/ocr',
  SPEECH_TO_TEXT: '/ai-core/speech-to-text',
  TRANSLATE: '/ai-core/translate',
  DETECT_LANGUAGE: '/ai-core/detect-language',
  TRANSLATE_SUMMARIZE: '/ai-core/translate-summarize',
} as const;
```

Type gợi ý:

```ts
export interface DetectLanguageResponse {
  success: boolean;
  detected_languages: string;
}

export interface TranslateResponse {
  success: boolean;
  original_text: string;
  translated_text: string;
  target_lang: string;
}

export interface SpeechToTextResponse {
  transcript: string | Array<{ start: number; end: number; text: string }>;
  language: string;
}
```

Multipart helper:

```ts
function appendOptional(formData: FormData, key: string, value?: unknown) {
  if (value === undefined || value === null || value === '') return;
  formData.append(key, String(value));
}
```

---

## 14. Error handling thống nhất

FE nên xử lý theo các nhóm lỗi:

| Nhóm  | Ý nghĩa                      | Cách xử lý                      |
| :---- | :--------------------------- | :------------------------------ |
| `400` | Input hoặc file không hợp lệ | Hiển thị lỗi cạnh form          |
| `401` | Token hết hạn/thiếu token    | Refresh token hoặc logout       |
| `403` | Thiếu permission             | Hiển thị màn không có quyền     |
| `422` | Validation DTO lỗi           | Highlight field sai             |
| `500` | AI Core/backend lỗi          | Cho retry hoặc báo hệ thống bận |

Không nên hiển thị raw stack trace.

Nên lấy message từ response wrapper chung nếu có.

---

## 15. Loading state

OCR:

- File nhỏ: thường nhanh.
- PDF nhiều trang: có thể lâu.
- Nên hiển thị progress state chung, không cần percent nếu backend chưa hỗ trợ progress.

Speech-to-Text:

- Audio dài có thể mất nhiều giây.
- Nên disable submit trong lúc xử lý.
- Nên giữ audio preview để user biết file đang xử lý.

Translate:

- Text càng dài càng lâu.
- Nên cho user cancel UI state, dù request HTTP có thể vẫn chạy.

Translate Summarize:

- Có thể lâu hơn translate thường.
- Nên dùng loading text riêng: "Đang dịch và tóm tắt".

---

## 16. Quy tắc gửi boolean từ FE

Với multipart form-data, boolean nên gửi dưới dạng string:

```ts
formData.append('format', String(true));
formData.append('return_timestamp', String(false));
formData.append('denoise_audio', String(true));
```

Backend sẽ parse:

```txt
"true" -> true
"false" -> false
```

Không nên gửi boolean raw vào FormData vì browser có thể convert không rõ ràng giữa môi trường.

---

## 17. Checklist FE trước khi tích hợp

- Đã có access token trong request.
- Đã check permission để show/hide menu.
- Upload OCR và S2T dùng `multipart/form-data`.
- Translate, detect language, translate summarize dùng `application/json`.
- Boolean multipart gửi bằng string.
- Response được unwrap từ response interceptor.
- `target_lang` được validate bằng danh sách language.
- Có loading state riêng cho từng API.
- Có error state riêng cho `403`, `422`, `500`.
- Có copy output text.
- Không gọi detect language liên tục từng keypress.

---

## 18. Quick Reference

OCR:

```http
POST /api/v1/ai-core/ocr
Content-Type: multipart/form-data
Permission: ocr.run
```

Speech-to-Text:

```http
POST /api/v1/ai-core/speech-to-text
Content-Type: multipart/form-data
Permission: s2t.run
```

Translate:

```http
POST /api/v1/ai-core/translate
Content-Type: application/json
Permission: translate.run
```

Detect Language:

```http
POST /api/v1/ai-core/detect-language
Content-Type: application/json
Permission: translate.run
```

Translate Summarize:

```http
POST /api/v1/ai-core/translate-summarize
Content-Type: application/json
Permission: translate.run
```
