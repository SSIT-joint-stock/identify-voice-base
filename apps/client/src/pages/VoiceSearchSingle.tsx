import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { VoiceErrorDialog } from "@/feature/voice/components/voice-error-dialog";
import { VoiceSingleSearchForm } from "@/feature/voice/components/voice-single-search-form";
import { VoiceAudioPlayer } from "@/feature/voice/components/voice-audio-player";
import { VoiceTop5MatchTable } from "@/feature/voice/components/voice-top5-match-table";
import { VoiceEnrollDialog } from "@/feature/voice/components/voice-enroll-dialog";
import { useVoiceStore } from "@/feature/voice";

function isUnknownSingle(item: {
  matched_voice_id?: string;
  message?: string;
}) {
  const message = (item.message || "").toLowerCase();

  return (
    !item.matched_voice_id ||
    message.includes("no matching") ||
    message.includes("unknown") ||
    message.includes("not found")
  );
}

export default function VoiceSearchSingle() {
  const { identifyResult, errorDialog, closeErrorDialog, resetIdentifyResult } =
    useVoiceStore();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [openEnrollDialog, setOpenEnrollDialog] = useState(false);

  useEffect(() => {
    resetIdentifyResult();
    return () => {
      resetIdentifyResult();
    };
  }, [resetIdentifyResult]);

  const items = identifyResult?.items ?? [];
  const hasKnownMatch = items.some((item) => !isUnknownSingle(item));
  const shouldShowUnknownCta = items.length === 0 || !hasKnownMatch;

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <Search className="size-4" />
              Tra cứu 1 người
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nhận diện giọng nói 1 người
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Tải file audio có một người nói để tra cứu top 5 kết quả phù hợp
              nhất.
            </p>
          </div>
        </section>

        <VoiceSingleSearchForm
          onFileSelected={(file) => {
            setAudioFile(file);
            resetIdentifyResult();
          }}
        />

        <VoiceAudioPlayer file={audioFile} title="Audio tra cứu" />

        <VoiceTop5MatchTable
          title="Kết quả phù hợp"
          description="Kết quả được sắp xếp theo điểm số giảm dần."
          items={items}
          emptyText="Chưa có kết quả nhận diện."
        />

        {shouldShowUnknownCta && audioFile ? (
          <div className="rounded-2xl border border-dashed p-5">
            <div className="space-y-2">
              <p className="font-semibold">Không tìm thấy người phù hợp?</p>
              <p className="text-sm text-muted-foreground">
                Có thể mở popup đăng ký giọng nói mới bằng chính file audio vừa
                tải lên.
              </p>
              <button
                type="button"
                onClick={() => setOpenEnrollDialog(true)}
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Đăng ký giọng nói
              </button>
            </div>
          </div>
        ) : null}
      </div>

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
