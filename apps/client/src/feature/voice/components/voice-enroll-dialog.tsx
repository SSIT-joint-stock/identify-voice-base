import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { VoiceIdentifyTwoItem } from '../types/voice.types';
import { VoiceAudioPlayer } from './voice-audio-player';
import { VoiceUploadForm } from './voice-upload-form';

interface VoiceEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFile: File | null;
  speakerItem?: VoiceIdentifyTwoItem | null;
  onEnrollSuccess?: (data: VoiceIdentifyTwoItem) => void;
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getLongestSegment(item?: VoiceIdentifyTwoItem | null) {
  if (!item?.audio_segment?.length) return undefined;

  return [...item.audio_segment].sort((a, b) => b.end - b.start - (a.end - a.start))[0];
}

export function VoiceEnrollDialog({
  open,
  onOpenChange,
  sourceFile,
  speakerItem,
  onEnrollSuccess,
}: VoiceEnrollDialogProps) {
  const longestSegment = getLongestSegment(speakerItem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] w-[95vw] max-w-7xl overflow-hidden sm:max-w-[90vw] lg:max-w-7xl p-0">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle>Đăng ký giọng nói</DialogTitle>
            <DialogDescription>
              Mở form đăng ký để lưu thông tin người nói chưa có trên hệ thống.
              {speakerItem?.audio_segment?.length
                ? ' Có kèm thông tin segment để đối chiếu khi thao tác.'
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="space-y-4 min-w-0">
              {sourceFile ? (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground break-all">
                  File nguồn: <span className="font-medium">{sourceFile.name}</span>
                </div>
              ) : null}

              {speakerItem?.audio_segment?.length ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Timestamp speaker</p>
                  <div className="flex flex-wrap gap-2">
                    {speakerItem.audio_segment.map((segment, index) => (
                      <Badge key={`${segment.start}-${segment.end}-${index}`} variant="secondary">
                        {formatSeconds(segment.start)} - {formatSeconds(segment.end)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="min-w-0">
                <VoiceAudioPlayer file={sourceFile} title="Audio nguồn" />
              </div>

              <div className="min-w-0">
                <VoiceUploadForm
                  key={
                    speakerItem
                      ? `${speakerItem.matched_voice_id}-${longestSegment?.start}-${longestSegment?.end}`
                      : 'new'
                  }
                  initialFile={sourceFile}
                  initialStart={longestSegment?.start}
                  initialEnd={longestSegment?.end}
                  compact
                  onUploadSuccess={(data) => {
                    if (data) {
                      onEnrollSuccess?.({
                        ...speakerItem,
                        ...data,
                      } as VoiceIdentifyTwoItem);
                    }
                    onOpenChange(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
