import { IsUpdate } from "@/components/IsUpdate";
import { PageLayout } from "@/components/PageLayout";

export default function TranslateLive() {
  return (
    <PageLayout
      title="Dịch trực tiếp"
      description="Khu vực dịch đa ngôn ngữ theo thời gian thực cho hội thoại và âm thanh trực tiếp."
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <IsUpdate />
    </PageLayout>
  );
}
