# Translation Feedback Implementation Plan

## Scope

Customer feedback focuses on the translate workflow:

- Preserve full source text by translating in ordered chunks.
- Show progressive preview while long documents are processing.
- Avoid sending all PDF pages as one long blocking unit; process PDF pages in small batches.
- Allow users to edit translated output and save edits for future model training.
- Apply a consistent frontend design system for the translation workspace.

## Implementation Checklist

### 1. Ordered Chunk Translation

- Backend owns chunking in `AiTranslateUseCase`.
- Split long source text into bounded chunks before calling AI Core.
- Call AI Core sequentially per chunk to preserve order.
- Persist the final joined translation as one history record.
- Stream partial joined translation through the job state so FE can display completed chunks while the next chunk is processing.

Status: implemented for translation jobs.

### 2. Progressive Preview

- FE polls `/ai-core/translate/jobs/:jobId`.
- While job status is `processing`, FE reads `result.translated_text` when present and displays it read-only.
- Export is disabled until job status is `completed`.
- User can edit only after the final history record is available.

Status: implemented for live/file translation output.

### 3. PDF Page Batching

- Target behavior: split PDF into ordered page batches of 2-3 pages.
- Process each OCR batch sequentially or with a capped concurrency of one batch in flight per user job.
- Update extraction job state with completed pages so FE can preview source text before all pages complete.
- Enable export only when extraction and translation jobs are both complete.

Status: planned. Current OCR integration posts the whole file to AI Core. This needs either an AI Core page-range API or backend PDF page splitting before OCR.

### 4. Translation Edit Storage

- Translation history already stores `edited_translated_text`, `edited_at`, and `edited_by`.
- FE exposes editable translated output after a history record is created.
- Save calls `PATCH /translate/history/:id`.
- Edited text becomes the effective translation for review/training datasets.

Status: existing and kept compatible with progressive translation.

### 5. Translation Workspace Design System

- Shared CSS utilities live in `apps/client/src/index.css`.
- Translation pages use shared title, surface, textarea, empty-state, and progress-chip styles.
- Controls remain dense and operational: language selectors, mode tabs, progress, copy, save, and export are visible near the related content.

Status: implemented for translate file/live pages.

## Remaining PDF Work

Recommended backend route shape:

- `POST /ai-core/ocr/page-batch/jobs`
- `GET /ai-core/ocr/page-batch/jobs/:jobId`

Recommended job result shape:

```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": 40,
  "result": {
    "pages": [
      { "page": 1, "text": "..." },
      { "page": 2, "text": "..." }
    ],
    "completed_pages": 2,
    "total_pages": 8
  }
}
```

FE should render completed pages immediately, append pages by `page` order, and keep export disabled until the job is complete.
