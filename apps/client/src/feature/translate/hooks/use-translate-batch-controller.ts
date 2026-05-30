import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_TRANSLATE_DOCUMENT_EXTENSIONS,
  ACCEPTED_TRANSLATE_DOCUMENT_TYPES,
  QUERY_KEYS,
} from "@/constants";
import {
  translateApi,
  type TranslateExportFormat,
} from "@/feature/translate/api/translate.api";
import {
  AUTO_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@/feature/translate/constants/translate.constants";
import type { AudioTranslateBatchItem } from "@/feature/translate/types/translate.types";
import { formatError, type ProcessingStep } from "@/utils";
import { useBatchFilePickerDropdown } from "./use-batch-file-picker-dropdown";
import { useTranslationAutoScroll } from "./use-translation-auto-scroll";

const POLL_INTERVAL_MS = 1500;

export const ACCEPTED_BATCH_EXTENSIONS = [
  ...ACCEPTED_AUDIO_EXTENSIONS,
  ...ACCEPTED_TRANSLATE_DOCUMENT_EXTENSIONS,
].join(",");

export interface TranslateBatchSelectedFile {
  id: string;
  file: File;
  sourceLang: string;
  targetLang: string;
  returnTimestamp: boolean;
  denoiseAudio: boolean;
  kind: "audio" | "document" | "image";
}

export interface TranslateBatchRetryOption {
  sourceLang: string;
  targetLang: string;
  returnTimestamp: boolean;
  denoiseAudio: boolean;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isAudioFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  return (
    ACCEPTED_AUDIO_TYPES.includes(
      file.type as (typeof ACCEPTED_AUDIO_TYPES)[number],
    ) ||
    ACCEPTED_AUDIO_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_AUDIO_EXTENSIONS)[number],
    )
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.name);
}

function getFileKind(file: File): TranslateBatchSelectedFile["kind"] {
  if (isAudioFile(file)) return "audio";
  if (isImageFile(file)) return "image";
  return "document";
}

function isSupportedBatchFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  return (
    isAudioFile(file) ||
    ACCEPTED_TRANSLATE_DOCUMENT_TYPES.includes(
      file.type as (typeof ACCEPTED_TRANSLATE_DOCUMENT_TYPES)[number],
    ) ||
    ACCEPTED_TRANSLATE_DOCUMENT_EXTENSIONS.includes(
      extension as (typeof ACCEPTED_TRANSLATE_DOCUMENT_EXTENSIONS)[number],
    )
  );
}

function getProcessingStep(
  item: AudioTranslateBatchItem | null,
): ProcessingStep {
  if (!item) return "idle";
  if (item.status === "extracting" || item.status === "transcribing") {
    return "extracting";
  }
  if (item.status === "translating") return "translating";
  return "idle";
}

export function copyTranslateBatchText(text: string, successMessage: string) {
  if (!text.trim()) return false;

  return navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success(successMessage);
      return true;
    })
    .catch(() => {
      toast.error("Không thể sao chép nội dung.");
      return false;
    });
}

export function useTranslateBatchController() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<TranslateBatchSelectedFile[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_TARGET_LANGUAGE);
  const [retryOptions, setRetryOptions] = useState<
    Record<string, TranslateBatchRetryOption>
  >({});
  const [exportingFormat, setExportingFormat] =
    useState<TranslateExportFormat | null>(null);
  const [exportingBatchFormat, setExportingBatchFormat] =
    useState<TranslateExportFormat | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const batchQuery = useQuery({
    queryKey: batchId
      ? QUERY_KEYS.translate.audioBatch.detail(batchId)
      : ["translate", "audio-batch", "idle"],
    queryFn: () => translateApi.getAudioTranslateBatch(batchId!),
    enabled: Boolean(batchId),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing"
        ? POLL_INTERVAL_MS
        : false;
    },
  });

  const batch = batchQuery.data ?? null;
  const selectedItem = useMemo(
    () => batch?.items.find((item) => item.item_id === selectedItemId) ?? null,
    [batch?.items, selectedItemId],
  );
  const selectedProcessingStep = getProcessingStep(selectedItem);
  const selectedSourceText = selectedItem?.transcript ?? "";
  const selectedTranslatedText = selectedItem?.translated_text ?? "";
  const selectedItemBusy =
    selectedItem?.status === "extracting" ||
    selectedItem?.status === "transcribing" ||
    selectedItem?.status === "translating";
  const isBatchRunning =
    batch?.status === "pending" || batch?.status === "processing";
  const canExportBatch = Boolean(
    batch?.items.some((item) => item.status === "completed"),
  );
  const sourceAutoScroll = useTranslationAutoScroll({
    enabled:
      selectedItem?.status === "extracting" ||
      selectedItem?.status === "transcribing",
    text: selectedSourceText,
  });
  const translatedAutoScroll = useTranslationAutoScroll({
    enabled: selectedItem?.status === "translating",
    text: selectedTranslatedText,
  });
  const pickerDropdown = useBatchFilePickerDropdown({
    disabled: isCreating || isBatchRunning,
    onSelect: (action) => {
      if (action === "folder") {
        folderInputRef.current?.click();
        return;
      }

      fileInputRef.current?.click();
    },
  });

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;

    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!batchQuery.error) return;
    setErrorMessage(formatError(batchQuery.error));
  }, [batchQuery.error]);

  useEffect(() => {
    if (!batch?.items.length) return;
    setSelectedItemId((current) => current ?? batch.items[0]?.item_id ?? null);
  }, [batch?.items]);

  useEffect(() => {
    if (!batch?.items.length) return;

    setRetryOptions((current) => {
      let changed = false;
      const next = { ...current };

      batch.items.forEach((item) => {
        if (next[item.item_id]) return;
        changed = true;
        next[item.item_id] = {
          sourceLang: item.source_lang ?? AUTO_LANGUAGE,
          targetLang: item.target_lang ?? DEFAULT_TARGET_LANGUAGE,
          returnTimestamp: item.return_timestamp ?? false,
          denoiseAudio: item.denoise_audio ?? false,
        };
      });

      return changed ? next : current;
    });
  }, [batch?.items]);

  const resetPage = () => {
    setFiles([]);
    setBatchId(null);
    setSelectedItemId(null);
    setRetryOptions({});
    setErrorMessage(null);
    queryClient.removeQueries({ queryKey: ["translate", "audio-batch"] });
  };

  const handleFilesChange = (selectedFiles: FileList | null) => {
    const supportedFiles = Array.from(selectedFiles ?? []).filter(
      isSupportedBatchFile,
    );
    setFiles(
      supportedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        sourceLang: AUTO_LANGUAGE,
        targetLang: targetLanguage,
        returnTimestamp: false,
        denoiseAudio: false,
        kind: getFileKind(file),
      })),
    );
    setBatchId(null);
    setSelectedItemId(null);
    setRetryOptions({});
    setErrorMessage(null);

    if (selectedFiles?.length && supportedFiles.length === 0) {
      setErrorMessage(
        "Không tìm thấy file audio, PDF, Word, TXT hoặc ảnh hợp lệ trong lựa chọn.",
      );
    }
  };

  const createBatch = async () => {
    if (!files.length) {
      setErrorMessage("Vui lòng chọn ít nhất một file cần dịch.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await translateApi.createAudioTranslateBatch({
        files: files.map((file) => file.file),
        targetLang: targetLanguage,
        fileOptions: files.map((file) => ({
          sourceLang:
            file.sourceLang === AUTO_LANGUAGE ? undefined : file.sourceLang,
          targetLang: file.targetLang,
          returnTimestamp: file.returnTimestamp,
          denoiseAudio: file.denoiseAudio,
        })),
      });
      const nextBatch = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.translate.audioBatch.detail(created.batch_id),
        queryFn: () => translateApi.getAudioTranslateBatch(created.batch_id),
        staleTime: 0,
      });

      setBatchId(created.batch_id);
      setSelectedItemId(nextBatch.items[0]?.item_id ?? null);
      toast.success("Đã tạo batch dịch file.");
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsCreating(false);
    }
  };

  const retryItem = async (itemId: string) => {
    if (!batch) return;
    const options = retryOptions[itemId];

    try {
      await translateApi.retryAudioTranslateBatchItem(
        batch.batch_id,
        itemId,
        options
          ? {
              sourceLang:
                options.sourceLang === AUTO_LANGUAGE
                  ? undefined
                  : options.sourceLang,
              targetLang: options.targetLang,
              returnTimestamp: options.returnTimestamp,
              denoiseAudio: options.denoiseAudio,
            }
          : undefined,
      );
      await batchQuery.refetch();
      toast.success("Đã chạy lại item.");
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  };

  const refreshBatch = async () => {
    if (!batch) return;

    try {
      await batchQuery.refetch();
    } catch (error) {
      setErrorMessage(formatError(error));
    }
  };

  const exportItem = async (
    item: AudioTranslateBatchItem,
    format: TranslateExportFormat,
  ) => {
    if (!batch) return;

    setExportingFormat(format);
    try {
      const blob = await translateApi.exportAudioTranslateBatchItem(
        batch.batch_id,
        item.item_id,
        format,
      );
      downloadBlob(blob, `${item.filename.replace(/\.[^.]+$/, "")}.${format}`);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setExportingFormat(null);
    }
  };

  const exportBatch = async (format: TranslateExportFormat) => {
    if (!batch) return;

    setExportingBatchFormat(format);
    try {
      const blob = await translateApi.exportAudioTranslateBatch(
        batch.batch_id,
        format,
      );
      downloadBlob(blob, `audio-translation-batch-${batch.batch_id}.zip`);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setExportingBatchFormat(null);
    }
  };

  const updateFileOption = (
    fileId: string,
    patch: Partial<
      Pick<
        TranslateBatchSelectedFile,
        "sourceLang" | "targetLang" | "returnTimestamp" | "denoiseAudio"
      >
    >,
  ) => {
    setFiles((current) =>
      current.map((file) =>
        file.id === fileId
          ? {
              ...file,
              ...patch,
            }
          : file,
      ),
    );
  };

  const updateRetryOption = (
    itemId: string,
    patch: Partial<TranslateBatchRetryOption>,
  ) => {
    setRetryOptions((current) => {
      const currentOption =
        current[itemId] ??
        ({
          sourceLang: AUTO_LANGUAGE,
          targetLang: DEFAULT_TARGET_LANGUAGE,
          returnTimestamp: false,
          denoiseAudio: false,
        } satisfies TranslateBatchRetryOption);

      return {
        ...current,
        [itemId]: {
          ...currentOption,
          ...patch,
        },
      };
    });
  };

  return {
    batch,
    canExportBatch,
    createBatch,
    errorMessage,
    exportBatch,
    exportItem,
    exportingBatchFormat,
    exportingFormat,
    fileInputRef,
    files,
    folderInputRef,
    handleFilesChange,
    isBatchRunning,
    isCreating,
    pickerDropdown,
    refreshBatch,
    resetPage,
    retryItem,
    retryOptions,
    selectedItem,
    selectedItemBusy,
    selectedItemId,
    selectedProcessingStep,
    selectedSourceText,
    selectedTranslatedText,
    setSelectedItemId,
    setTargetLanguage,
    sourceAutoScroll,
    targetLanguage,
    translatedAutoScroll,
    updateFileOption,
    updateRetryOption,
  };
}
