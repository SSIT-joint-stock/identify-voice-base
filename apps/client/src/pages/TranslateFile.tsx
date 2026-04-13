import { IsUpdate } from "@/components/IsUpdate";
import { PageLayout } from "@/components/PageLayout";

export default function TranslateFile() {
  return (
    <PageLayout
      title="Dịch tệp tin"
      description="Khu vực tải lên và xử lý tệp âm thanh hoặc tài liệu để dịch đa ngôn ngữ."
    >
      <IsUpdate />
    </PageLayout>
  );
}
