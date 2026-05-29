import { PageLayout } from "@/components/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { TranslateAudioPreview } from "@/feature/translate/components/translate-audio-preview";
import { TranslateFileDropzone } from "@/feature/translate/components/translate-file-dropzone";
import { TranslateFileOptionsCard } from "@/feature/translate/components/translate-file-options-card";
import { TranslateOutputPanel } from "@/feature/translate/components/translate-output-panel";
import { TranslateSourceTextPanel } from "@/feature/translate/components/translate-source-text-panel";
import { TRANSLATION_LANGUAGES } from "@/feature/translate/constants/translate.constants";
import { useTranslateFileController } from "@/feature/translate/hooks/use-translate-file-controller";

export default function TranslateFile() {
  const {
    cancelTranslate,
    canSaveTranslationEdit,
    clearSourceText,
    copyText,
    denoiseAudio,
    detectedSourceLanguageLabel,
    downloadTranslatedFile,
    errorMessage,
    exportingFormat,
    extractText,
    handleDenoiseAudioChange,
    handleModeChange,
    handleReturnTimestampChange,
    handleSelectedFileChange,
    handleSourceLanguageChange,
    handleSourceTextChange,
    handleTargetLanguageChange,
    hasFile,
    hasPendingTranslationEdit,
    hasSourceText,
    hasTranslatedText,
    isAudio,
    isBusy,
    isSavingEditedTranslation,
    mode,
    outputTitle,
    processingStep,
    resetPage,
    returnTimestamp,
    saveEditedTranslation,
    selectedFile,
    setErrorMessage,
    setTranslatedText,
    setVisibleIsLoadingAudio,
    sourceAutoScroll,
    sourceLanguage,
    sourceLanguageLabel,
    sourceLanguageOptions,
    sourceText,
    targetLanguage,
    translateOptionsRef,
    translateProgress,
    translateText,
    translatedAutoScroll,
    translatedText,
    visibleIsLoadingAudio,
  } = useTranslateFileController();

  const renderTranslateOptions = () => (
    <TranslateFileOptionsCard
      detectedSourceLanguageLabel={detectedSourceLanguageLabel}
      denoiseAudio={denoiseAudio}
      disabled={isBusy}
      isAudio={isAudio}
      mode={mode}
      processingStep={processingStep}
      returnTimestamp={returnTimestamp}
      sourceLanguage={sourceLanguage}
      sourceLanguageLabel={sourceLanguageLabel}
      sourceLanguageOptions={sourceLanguageOptions}
      targetLanguage={targetLanguage}
      targetLanguageOptions={TRANSLATION_LANGUAGES}
      canExtract={Boolean(selectedFile)}
      onDenoiseAudioChange={handleDenoiseAudioChange}
      onExtractText={() => void extractText()}
      onModeChange={handleModeChange}
      onReturnTimestampChange={handleReturnTimestampChange}
      onSourceLanguageChange={handleSourceLanguageChange}
      onTargetLanguageChange={handleTargetLanguageChange}
    />
  );

  return (
    <PageLayout
      title="Dịch tệp tin"
      description="Tải audio, PDF, DOCX, TXT hoặc ảnh để trích xuất và dịch nội dung."
      titleClassName="translation-page-title"
      onRefresh={resetPage}
    >
      {!hasFile ? renderTranslateOptions() : null}

      <Card className="translation-surface">
        <CardHeader>
          <CardTitle>Dịch từ tệp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>File</Label>
            <TranslateFileDropzone
              value={selectedFile}
              disabled={isBusy}
              onChange={handleSelectedFileChange}
              onValidationError={setErrorMessage}
            />
          </div>
        </CardContent>
      </Card>

      {isAudio ? (
        <TranslateAudioPreview
          file={selectedFile?.file ?? null}
          onLoadingChange={setVisibleIsLoadingAudio}
        />
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể xử lý yêu cầu</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {hasFile ? (
        <>
          <div ref={translateOptionsRef}>{renderTranslateOptions()}</div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TranslateSourceTextPanel
              containerRef={sourceAutoScroll.containerRef}
              handleTextareaScroll={sourceAutoScroll.handleTextareaScroll}
              hasSourceText={hasSourceText}
              isAudio={isAudio}
              isBusy={isBusy}
              isJumpVisible={sourceAutoScroll.isJumpVisible}
              pauseAutoScroll={sourceAutoScroll.pauseAutoScroll}
              processingStep={processingStep}
              resumeAutoScroll={sourceAutoScroll.resumeAutoScroll}
              sourceText={sourceText}
              textareaRef={sourceAutoScroll.textareaRef}
              translateProgress={translateProgress}
              visibleIsLoadingAudio={visibleIsLoadingAudio}
              onCancelTranslate={cancelTranslate}
              onClear={clearSourceText}
              onCopy={() => copyText(sourceText, "Đã sao chép văn bản nguồn.")}
              onSourceTextChange={handleSourceTextChange}
              onTranslate={() => void translateText()}
            />

            <TranslateOutputPanel
              canEdit={canSaveTranslationEdit}
              containerRef={translatedAutoScroll.containerRef}
              exportingFormat={exportingFormat}
              handleTextareaScroll={translatedAutoScroll.handleTextareaScroll}
              hasPendingEdit={hasPendingTranslationEdit}
              hasTranslatedText={hasTranslatedText}
              isBusy={isBusy}
              isJumpVisible={translatedAutoScroll.isJumpVisible}
              isSavingEdit={isSavingEditedTranslation}
              outputTitle={outputTitle}
              pauseAutoScroll={translatedAutoScroll.pauseAutoScroll}
              processingStep={processingStep}
              resumeAutoScroll={translatedAutoScroll.resumeAutoScroll}
              textareaRef={translatedAutoScroll.textareaRef}
              translatedText={translatedText}
              translateProgress={translateProgress}
              onCopy={() => copyText(translatedText, "Đã sao chép bản dịch.")}
              onDownload={downloadTranslatedFile}
              onSaveEdit={() => void saveEditedTranslation()}
              onTranslatedTextChange={setTranslatedText}
            />
          </div>
        </>
      ) : null}
    </PageLayout>
  );
}
