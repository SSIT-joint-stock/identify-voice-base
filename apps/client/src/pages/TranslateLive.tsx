import { IsUpdate } from "@/components/IsUpdate";
import { PageLayout } from "@/components/PageLayout";

export default function TranslateLive() {
  return (
    <PageLayout
      title="Dịch trực tiếp"
      description="Khu vực dịch đa ngôn ngữ theo thời gian thực cho hội thoại và âm thanh trực tiếp."
    >
      <IsUpdate />
    </PageLayout>
  );
}
