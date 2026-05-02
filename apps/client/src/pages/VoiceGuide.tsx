import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Languages, Mic, ShieldAlert } from "lucide-react";

export default function VoiceGuide() {
  return (
    <PageLayout
      title="Hướng dẫn sử dụng"
      description="Hướng dẫn sử dụng hệ thống nhận diện giọng nói và dịch đa ngôn ngữ"
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Nhận diện giọng nói
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chuẩn bị dữ liệu âm thanh để tra cứu, đăng ký và đối soát hồ sơ.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mic className="size-5" />
                  Định dạng hỗ trợ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Hỗ trợ các file audio phổ biến như WAV, MP3, FLAC, OGG, M4A.
                </p>
                <p>
                  Nên ưu tiên file rõ tiếng, ít tạp âm, hạn chế lẫn nhiều nguồn
                  âm khác.
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
                  Nên dùng file dài từ 3-5 giây trở lên để hệ thống có đủ dữ
                  liệu xử lý.
                </p>
                <p>
                  Tránh tiếng ồn nền lớn, nhạc, tiếng TV hoặc hội thoại chồng
                  lấn quá nhiều.
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
                <p>
                  Tra cứu dùng để tìm người đã có dữ liệu mẫu trên hệ thống.
                </p>
                <p>
                  Nếu người nói chưa có dữ liệu, dùng chức năng đăng ký giọng
                  nói để bổ sung hồ sơ.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Dịch đa ngôn ngữ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dịch văn bản trực tiếp hoặc trích xuất nội dung từ tệp trước khi
              dịch.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Languages className="size-5" />
                  Dịch trực tiếp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Nhập văn bản nguồn, chọn ngôn ngữ đích và chọn chế độ Dịch
                  hoặc Dịch tóm tắt.
                </p>
                <p>
                  Có thể để hệ thống tự nhận diện ngôn ngữ nguồn trước khi chạy
                  dịch.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="size-5" />
                  Dịch tệp tin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Hỗ trợ audio, PDF, DOCX, TXT và ảnh để trích xuất nội dung
                  trước khi dịch.
                </p>
                <p>
                  Với audio, hệ thống chuyển lời nói thành văn bản rồi tiếp tục
                  dịch sang ngôn ngữ đã chọn.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Download className="size-5" />
                  Kết quả dịch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="flex ">
                  Có thể sao chép văn bản gốc hoặc bản dịch để dùng lại.
                </p>
                <p>
                  Bản dịch có thể tải xuống dưới dạng DOCX hoặc PDF sau khi xử
                  lý xong.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
