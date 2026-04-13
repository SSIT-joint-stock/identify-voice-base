import { Mic, ShieldAlert } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VoiceGuide() {
  return (
    <PageLayout
      title="Hướng dẫn sử dụng"
      description="Hướng dẫn sử dụng hệ thống nhận diện giọng nói"
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="size-5" />
              Định dạng hỗ trợ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Hỗ trợ các file audio phổ biến như WAV, MP3, FLAC, OGG, M4A.</p>
            <p>
              Nên ưu tiên file rõ tiếng, ít tạp âm, hạn chế lẫn nhiều nguồn âm
              khác.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Khuyến nghị chất lượng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Nên dùng file dài từ 3-5 giây trở lên để hệ thống có đủ dữ liệu xử
              lý.
            </p>
            <p>
              Tránh tiếng ồn nền lớn, nhạc, tiếng TV hoặc hội thoại chồng lấn
              quá nhiều.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="size-5" />
              Lưu ý nghiệp vụ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Tra cứu dùng để tìm người đã có dữ liệu mẫu trên hệ thống.</p>
            <p>
              Nếu người nói chưa có dữ liệu, dùng chức năng đăng ký giọng nói để
              bổ sung hồ sơ.
            </p>
          </CardContent>
        </Card>
      </section>
    </PageLayout>
  );
}
