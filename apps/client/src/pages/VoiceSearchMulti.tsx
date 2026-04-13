import { LoaderCircle, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { VoiceErrorDialog } from "@/feature/voice/components/voice-error-dialog";
import { VoiceMultiSearchForm } from "@/feature/voice/components/voice-multi-search-form";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { VoiceSpeakerResultCard } from "@/feature/voice/components/voice-speaker-result-card";
import { VoiceEnrollDialog } from "@/feature/voice/components/voice-enroll-dialog";
import { useVoiceStore } from "@/feature/voice";
import type { VoiceIdentifyTwoItem } from "@/feature/voice/types/voice.types";

const MULTI_SEARCH_FORM_ID = "voice-multi-search-form";

export default function VoiceSearchMulti() {
  const {
    identifyTwoResult,
    errorDialog,
    closeErrorDialog,
    resetIdentifyTwoResult,
  } = useVoiceStore();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [selectedUnknownItem, setSelectedUnknownItem] =
    useState<VoiceIdentifyTwoItem | null>(null);
  const [selectedSpeakerIndex, setSelectedSpeakerIndex] = useState<
    number | null
  >(null);
  const [selectedSegment, setSelectedSegment] = useState<{
    start?: number;
    end?: number;
  }>({});
  const [isSearching, setIsSearching] = useState(false);

  const updateIdentifyTwoSpeaker = useVoiceStore(
    (state) => state.updateIdentifyTwoSpeaker,
  );

  useEffect(() => {
    resetIdentifyTwoResult();
    return () => {
      resetIdentifyTwoResult();
    };
  }, [resetIdentifyTwoResult]);

  const items = identifyTwoResult?.items ?? [];
  const hasSearched = identifyTwoResult !== null;

  return (
    <>
      <PageLayout
        title="Tra cứu 1-2 người"
        description="Tải file audio có tối đa 2 người nói để tra cứu"
      >
        <VoiceMultiSearchForm
          formId={MULTI_SEARCH_FORM_ID}
          autoSubmitOnAudioChange
          showSubmitButton={false}
          onPendingChange={setIsSearching}
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
          footerAction={
            <Button
              type="submit"
              form={MULTI_SEARCH_FORM_ID}
              variant="outline"
              className="shadow-md hover:shadow-lg"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Đang tra cứu...
                </>
              ) : (
                <>
                  <UsersRound className="mr-2 size-4" />
                  Tra cứu 1-2 người
                </>
              )}
            </Button>
          }
        />

        {hasSearched ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {items.length > 0 ? (
              <>
                {items.map((item, index) => (
                  <div
                    key={`${item.matched_voice_id || item.name || item.message}-${index}`}
                    className={items.length === 1 ? "xl:col-span-2" : ""}
                  >
                    <VoiceSpeakerResultCard
                      title={`Người nói ${index + 1}`}
                      item={item}
                      speakerIndex={index}
                      onSelectSegment={(start, end) =>
                        setSelectedSegment({ start, end })
                      }
                      onRegisterUnknown={() => {
                        setSelectedUnknownItem(item);
                        setSelectedSpeakerIndex(index);
                        setOpenEnrollDialog(true);
                      }}
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="rounded-2xl border p-5 text-sm text-muted-foreground xl:col-span-2">
                Chưa có kết quả nhận diện.
              </div>
            )}
          </div>
        ) : null}
      </PageLayout>

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
