import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { VoiceEnrollDialog } from "@/feature/voice/components/voice-enroll-dialog";
import { VoiceErrorDialog } from "@/feature/voice/components/voice-error-dialog";
import { VoiceSingleSearchForm } from "@/feature/voice/components/voice-single-search-form";
import { VoiceTop5MatchTable } from "@/feature/voice/components/voice-top5-match-table";
import { useVoiceStore } from "@/feature/voice";

const SINGLE_SEARCH_FORM_ID = "voice-single-search-form";

export default function VoiceSearchSingle() {
  const { identifyResult, errorDialog, closeErrorDialog, resetIdentifyResult } =
    useVoiceStore();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    resetIdentifyResult();
    return () => {
      resetIdentifyResult();
    };
  }, [resetIdentifyResult]);

  const items = identifyResult?.items ?? [];
  const hasAudioFile = Boolean(audioFile);
  const hasSearchResult = identifyResult !== null;

  return (
    <>
      <PageLayout
        title="Tra cứu 1 người"
        description="Tải file audio có 1 người nói để tra cứu"
        titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
      >
        <VoiceSingleSearchForm
          formId={SINGLE_SEARCH_FORM_ID}
          autoSubmitOnAudioChange
          showSubmitButton={false}
          onPendingChange={setIsSearching}
          onFileSelected={(file) => {
            setAudioFile(file);
            resetIdentifyResult();
          }}
        />

        <VoiceAudioPlayer
          file={audioFile}
          title="Audio tra cứu"
          footerAction={
            <Button
              type="submit"
              form={SINGLE_SEARCH_FORM_ID}
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
                  <Search className="mr-2 size-4" />
                  Tra cứu 1 người
                </>
              )}
            </Button>
          }
        />

        {hasSearchResult ? (
          <VoiceTop5MatchTable
            title="Kết quả phù hợp"
            description="Sắp xếp theo điểm số giảm dần."
            items={items}
            emptyText="Chưa có kết quả nhận diện."
          />
        ) : null}

        {hasAudioFile ? (
          <div className="rounded-2xl border border-dashed p-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">
                {items.length > 0
                  ? "Top 5 bên trên chưa đúng người?"
                  : "Đăng ký giọng nói từ file hiện tại"}
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 shadow-lg hover:shadow-xl"
                onClick={() => setOpenEnrollDialog(true)}
              >
                Đăng ký giọng nói
              </Button>
            </div>
          </div>
        ) : null}
      </PageLayout>

      <VoiceEnrollDialog
        open={openEnrollDialog}
        onOpenChange={setOpenEnrollDialog}
        sourceFile={audioFile}
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
