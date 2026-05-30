import type {
  AudioTranslateBatchItem,
  AudioTranslateBatchStatus,
} from "@/feature/translate/types/translate.types";

function getStatusLabel(status: AudioTranslateBatchItem["status"]) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "extracting":
      return "Đang OCR";
    case "transcribing":
      return "Đang S2T";
    case "translating":
      return "Đang dịch";
    case "completed":
      return "Hoàn tất";
    case "failed":
      return "Lỗi";
    default:
      return status;
  }
}

function getBatchStatusLabel(status: AudioTranslateBatchStatus) {
  switch (status) {
    case "pending":
      return "Chờ xử lý";
    case "processing":
      return "Đang xử lý";
    case "completed":
      return "Hoàn tất";
    case "partial":
      return "Hoàn tất một phần";
    case "failed":
      return "Thất bại";
    default:
      return status;
  }
}

export { getBatchStatusLabel, getStatusLabel };
