import { useEffect } from "react";
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
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-playfair text-2xl font-bold text-[#4b1d18] md:text-3xl">
          Đăng ký giọng nói
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tải file audio của người đăng ký để đăng ký giọng nói
        </p>
      </header>

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
    </div>
  );
}
