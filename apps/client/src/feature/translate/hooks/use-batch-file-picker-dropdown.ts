import { useCallback, useState } from "react";

export type BatchFilePickerAction = "files" | "folder";

interface UseBatchFilePickerDropdownOptions {
  disabled?: boolean;
  onSelect: (action: BatchFilePickerAction) => void;
}

export function useBatchFilePickerDropdown({
  disabled = false,
  onSelect,
}: UseBatchFilePickerDropdownOptions) {
  const [open, setOpen] = useState(false);

  const selectAction = useCallback(
    (action: BatchFilePickerAction) => {
      if (disabled) return;

      setOpen(false);
      onSelect(action);
    },
    [disabled, onSelect],
  );

  return {
    open,
    selectAction,
    setOpen,
  };
}
