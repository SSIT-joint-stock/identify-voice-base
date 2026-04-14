import { useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { VoiceUploadForm } from "@/feature/voice/components/voice-upload-form";
import { useVoiceStore } from "@/feature/voice";

export default function VoiceEnroll() {
  const { uploadResult, resetUploadResult } = useVoiceStore();

  useEffect(() => {
    resetUploadResult();
    return () => {
      resetUploadResult();
    };
  }, [resetUploadResult]);

  return (
    <PageLayout
      title="Đăng ký giọng nói"
      description="Tải file audio của người đăng ký để đăng ký giọng nói"
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <VoiceUploadForm onFileChange={resetUploadResult} />

      {uploadResult ? (
        <Card className="rounded-2xl border-green-200">
          <CardContent className="p-4">
            <p className="font-medium text-green-700">Gửi đăng ký thành công</p>
            <p className="text-sm text-muted-foreground">
              {uploadResult.message}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </PageLayout>
  );
}
