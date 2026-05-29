import { useEffect, useMemo, useState } from "react";

import type { VoiceDirectoryDetail } from "../types/voice-directory.types";

export function useVoiceDetailHistory(detail?: VoiceDirectoryDetail) {
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!detail) return;

    queueMicrotask(() => {
      setSelectedAudioIds(new Set());
      setPreviewSessionId(null);
    });
  }, [detail]);

  const historyRows = useMemo(
    () => detail?.identify_history ?? [],
    [detail?.identify_history],
  );
  const previewSessionRow = useMemo(
    () =>
      historyRows.find((row) => row.session_id === previewSessionId) ?? null,
    [historyRows, previewSessionId],
  );

  const toggleAudioSelection = (audioFileId: string) => {
    setSelectedAudioIds((prev) => {
      const next = new Set(prev);
      if (next.has(audioFileId)) next.delete(audioFileId);
      else next.add(audioFileId);
      return next;
    });
  };

  return {
    historyRows,
    previewSessionId,
    previewSessionRow,
    selectedAudioIds,
    setPreviewSessionId,
    setSelectedAudioIds,
    toggleAudioSelection,
  };
}
