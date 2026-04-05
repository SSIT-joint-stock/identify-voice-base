import { UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { VoiceErrorDialog } from '@/feature/voice/components/voice-error-dialog';
import { VoiceMultiSearchForm } from '@/feature/voice/components/voice-multi-search-form';
import { VoiceAudioPlayer } from '@/feature/voice/components/voice-audio-player';
import { VoiceSpeakerResultCard } from '@/feature/voice/components/voice-speaker-result-card';
import { VoiceEnrollDialog } from '@/feature/voice/components/voice-enroll-dialog';
import { useVoiceStore } from '@/feature/voice';
import type { VoiceIdentifyTwoItem } from '@/feature/voice/types/voice.types';

export default function VoiceSearchMulti() {
  const { identifyTwoResult, errorDialog, closeErrorDialog, resetIdentifyTwoResult } =
    useVoiceStore();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [selectedUnknownItem, setSelectedUnknownItem] = useState<VoiceIdentifyTwoItem | null>(null);
  const [selectedSpeakerIndex, setSelectedSpeakerIndex] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<{
    start?: number;
    end?: number;
  }>({});

  const updateIdentifyTwoSpeaker = useVoiceStore((state) => state.updateIdentifyTwoSpeaker);

  useEffect(() => {
    resetIdentifyTwoResult();
    return () => {
      resetIdentifyTwoResult();
    };
  }, [resetIdentifyTwoResult]);

  const items = identifyTwoResult?.items ?? [];
  console.log(identifyTwoResult);

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <UsersRound className="size-4" />
              Tra cứu 1-2 người
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Nhận diện giọng nói 1-2 người</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Tải file audio có tối đa 2 người nói.
            </p>
          </div>
        </section>

        <VoiceMultiSearchForm
          onFileSelected={(file) => {
            setAudioFile(file);
            setSelectedUnknownItem(null);
            setOpenEnrollDialog(false);
            setSelectedSegment({});
            resetIdentifyTwoResult();
          }}
        />

        <VoiceAudioPlayer
          file={audioFile}
          title="Audio tra cứu 1-2 người"
          startAt={selectedSegment.start}
          endAt={selectedSegment.end}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div
                key={`${item.matched_voice_id || item.name || item.message}-${index}`}
                className={items.length === 1 ? "xl:col-span-2" : ""}
              >
                <VoiceSpeakerResultCard
                  title={`Người nói ${index + 1}`}
                  item={item}
                  speakerIndex={index}
                  onSelectSegment={(start, end) => setSelectedSegment({ start, end })}
                  onRegisterUnknown={() => {
                    setSelectedUnknownItem(item);
                    setSelectedSpeakerIndex(index);
                    setOpenEnrollDialog(true);
                  }}
                />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border p-5 text-sm text-muted-foreground xl:col-span-2">
              Chưa có kết quả nhận diện.
            </div>
          )}
        </div>
      </div>

      <VoiceEnrollDialog
        open={openEnrollDialog}
        onOpenChange={(open) => {
          setOpenEnrollDialog(open);
          if (!open) {
            setSelectedUnknownItem(null);
            setSelectedSpeakerIndex(null);
          }
        }}
        sourceFile={audioFile}
        speakerItem={selectedUnknownItem}
        onEnrollSuccess={(data) => {
          if (selectedSpeakerIndex !== null) {
            updateIdentifyTwoSpeaker(selectedSpeakerIndex, data);
          }
        }}
      />

      <VoiceErrorDialog
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        onClose={closeErrorDialog}
      />
    </>
  );
}
