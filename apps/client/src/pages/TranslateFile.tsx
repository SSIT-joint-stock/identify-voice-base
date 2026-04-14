import { IsUpdate } from "@/components/IsUpdate";
import { PageLayout } from "@/components/PageLayout";

export default function TranslateFile() {
  return (
    <PageLayout
      title="Dịch tệp tin"
      description="Khu vực tải lên và xử lý tệp âm thanh hoặc tài liệu để dịch đa ngôn ngữ."
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <IsUpdate />
    </PageLayout>
  );
}
