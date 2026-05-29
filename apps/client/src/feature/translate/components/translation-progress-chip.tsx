import { ArrowDown, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TranslationProgressChipProps {
  label: string;
  jumpLabel?: string;
  jumpVisible?: boolean;
  onJump?: () => void;
}

export function TranslationProgressChip({
  label,
  jumpLabel = "Đi tới đoạn mới nhất",
  jumpVisible = false,
  onJump,
}: TranslationProgressChipProps) {
  return (
    <div className="translation-progress-chip">
      <LoaderCircle className="size-3.5 animate-spin text-primary-500" />
      <span className="min-w-0 truncate">{label}</span>
      <div className="min-w-0 flex-1" />
      {jumpVisible && onJump ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="-my-1 shrink-0"
          aria-label={jumpLabel}
          title={jumpLabel}
          onClick={onJump}
        >
          <ArrowDown className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
