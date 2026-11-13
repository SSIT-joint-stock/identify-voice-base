import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Container,
  ExternalLink,
  Globe2,
  MonitorCog,
  Server,
  ShieldCheck,
  SquareTerminal,
  Timer,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageLayout } from "@/components/PageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TerminalCommandWorkbench } from "@/feature/terminal-launcher/components/terminal-command-workbench";
import {
  getInstallerUrl,
  TERMINAL_PROTOCOL_URI,
} from "@/feature/terminal-launcher/terminal-launcher.utils";

type EndpointState = "loading" | "ready" | "error";

const requirements = [
  {
    title: "Ubuntu 24.04 LTS",
    description: "Launcher chỉ hỗ trợ phiên bản Ubuntu được xác nhận.",
    icon: MonitorCog,
  },
  {
    title: "GNOME Terminal",
    description: "GNOME Desktop và gnome-terminal đã được cài đặt.",
    icon: SquareTerminal,
  },
  {
    title: "Docker cùng máy",
    description: "Web application và browser chạy trên cùng Ubuntu host.",
    icon: Container,
  },
  {
    title: "Quyền người dùng",
    description: "Có quyền ghi vào thư mục cấu hình trong home directory.",
    icon: ShieldCheck,
  },
];

const guideNavigation = [
  { href: "#requirements", label: "Kiểm tra yêu cầu", number: "01" },
  { href: "#install", label: "Cài đặt launcher", number: "02" },
  { href: "#verify", label: "Kiểm tra kết nối", number: "03" },
  { href: "#troubleshooting", label: "Xử lý sự cố", number: "04" },
];

const troubleshooting = [
  {
    icon: Container,
    title: "Không tải được installer",
    description:
      "Kiểm tra Docker và backend, sau đó mở trực tiếp /api/terminal/install.sh từ cùng origin để xác nhận endpoint hoạt động.",
  },
  {
    icon: Globe2,
    title: "Browser không hiện xác nhận",
    description:
      "Kiểm tra browser có cho phép mở external application. Browser có thể ghi nhớ lựa chọn từ lần thử trước.",
  },
  {
    icon: MonitorCog,
    title: "Protocol chưa được đăng ký",
    description:
      "Chạy lại Reinstall và dùng xdg-mime để kiểm tra association của x-scheme-handler/identify-app.",
  },
  {
    icon: Wrench,
    title: "Launcher đã cũ hoặc bị lỗi",
    description:
      "Chọn tab Reinstall để làm mới các file launcher do ứng dụng quản lý rồi thử Test Terminal lần nữa.",
  },
];

function StepHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#5a1c22] font-mono text-sm font-bold text-[#f7d7ae] shadow-[0_8px_20px_rgba(75,29,24,0.18)]">
        {number}
      </span>
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#a45f49] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold text-[#3b231d] md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#79645c]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function TerminalSetup() {
  const installerUrl = useMemo(() => {
    try {
      return getInstallerUrl(window.location.origin);
    } catch {
      return null;
    }
  }, []);
  const [endpointState, setEndpointState] = useState<EndpointState>(() =>
    installerUrl ? "loading" : "error",
  );
  const [endpointAttempt, setEndpointAttempt] = useState(0);

  useEffect(() => {
    if (!installerUrl) {
      return;
    }

    const controller = new AbortController();

    void fetch(installerUrl, {
      method: "HEAD",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Installer endpoint returned " + response.status);
        }
        setEndpointState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setEndpointState("error");
      });

    return () => controller.abort();
  }, [endpointAttempt, installerUrl]);

  const retryEndpoint = useCallback(() => {
    setEndpointState("loading");
    setEndpointAttempt((attempt) => attempt + 1);
  }, []);

  const handleTerminalRequest = () => {
    toast.info(
      "Đã gửi yêu cầu mở Terminal. Vui lòng xác nhận trong browser nếu được hỏi.",
    );
  };

  return (
    <PageLayout
      title="Setup Ubuntu Terminal Launcher"
      description="Install the native launcher to open GNOME Terminal directly from your browser."
      titleClassName="font-playfair text-[34px] leading-[1.1] font-bold tracking-tight text-[#4b1d18] md:text-[42px]"
      showRefreshButton={false}
      className="gap-0"
    >
      <section className="relative mt-6 overflow-hidden rounded-[30px] bg-[linear-gradient(125deg,#46171a_0%,#671d26_55%,#8c3440_100%)] px-3 py-5 text-white shadow-[0_24px_60px_rgba(75,29,24,0.2)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-8 -bottom-28 size-60 rounded-full bg-[#e6a675]/15 blur-2xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end w-full">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f6cba5]/25 bg-white/8 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#f6cba5] uppercase">
              <SquareTerminal className="size-3.5" />
              Hướng dẫn cài đặt chính thức
            </div>
            <h2 className="mt-5 max-w-3xl font-playfair text-3xl leading-tight font-bold sm:text-4xl">
              Kết nối web với Terminal native trong khoảng 5 phút.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#ead8d3]">
              Làm theo bốn phần bên dưới để đăng ký protocol{" "}
              <code className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[#ffd6b0]">
                identify-app://open
              </code>
              . Web chỉ yêu cầu mở Terminal và không gửi shell command.
            </p>
          </div>

          <div className="grid text-nowrap  grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
            <div>
              <Timer className="size-5 text-[#f6cba5]" />
              <p className="mt-2 text-sm font-bold">~5 phút</p>
              <p className="text-xs text-[#d7c3be]">Thời gian thiết lập</p>
            </div>
            <div>
              <ShieldCheck className="size-5 text-[#f6cba5]" />
              <p className="mt-2 text-sm font-bold">User-level</p>
              <p className="text-xs text-[#d7c3be]">Không yêu cầu sudo</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[134px]">
          <nav
            aria-label="Nội dung hướng dẫn"
            className="rounded-2xl border border-[#eadfd8] bg-white p-3 shadow-[0_10px_30px_rgba(44,24,19,0.05)]"
          >
            <p className="px-3 pt-2 pb-3 text-[10px] font-bold tracking-[0.18em] text-[#a45f49] uppercase">
              Trong hướng dẫn này
            </p>
            <ol className="grid grid-cols-2 gap-1 lg:grid-cols-1">
              {guideNavigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#654f48] transition-colors hover:bg-[#faf1eb] hover:text-[#5a1c22]"
                  >
                    <span className="font-mono text-[10px] font-bold text-[#bb8169]">
                      {item.number}
                    </span>
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <ChevronRight className="hidden size-3.5 transition-transform group-hover:translate-x-0.5 lg:block" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-4 hidden rounded-2xl border border-[#ead9cd] bg-[#fff8f3] p-4 lg:block">
            <CircleHelp className="size-5 text-[#9b5745]" />
            <p className="mt-3 text-sm font-semibold text-[#4b2b24]">
              Lưu ý quan trọng
            </p>
            <p className="mt-1 text-xs leading-5 text-[#806b63]">
              Chạy command trên Ubuntu host, không chạy bên trong Docker
              container.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-7">
          <section
            id="requirements"
            className="scroll-mt-36 rounded-[26px] border border-[#eadfd8] bg-white p-5 shadow-[0_14px_38px_rgba(44,24,19,0.055)] sm:p-7"
          >
            <StepHeading
              number="01"
              eyebrow="Trước khi bắt đầu"
              title="Kiểm tra môi trường Ubuntu"
              description="Bảo đảm máy đang đáp ứng đủ bốn điều kiện dưới đây trước khi chạy installer."
            />

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {requirements.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-2xl border border-[#eee3dc] bg-[#fdfaf8] p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4e4da] text-[#87392f]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[#432a24]">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[#7b6861]">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Alert className="mt-5 rounded-2xl border-amber-300/60 bg-amber-50/90 px-5 py-4 text-amber-950">
              <AlertTriangle className="size-5" />
              <AlertTitle>Kiểm tra nguồn trước khi chạy</AlertTitle>
              <AlertDescription className="text-amber-900/75">
                Command sẽ tải và thực thi code từ endpoint của ứng dụng. Chỉ
                chạy khi bạn tin tưởng origin đang hiển thị và không thêm{" "}
                <code>sudo</code>.
              </AlertDescription>
            </Alert>
          </section>

          <section
            id="install"
            className="scroll-mt-36 rounded-[26px] border border-[#eadfd8] bg-white p-5 shadow-[0_14px_38px_rgba(44,24,19,0.055)] sm:p-7"
          >
            <StepHeading
              number="02"
              eyebrow="Cài đặt launcher"
              title="Copy và chạy một command"
              description="Chọn action phù hợp, copy command rồi chạy trong GNOME Terminal trên Ubuntu host."
            />

            <div className="mt-7">
              {installerUrl ? (
                <TerminalCommandWorkbench
                  installerUrl={installerUrl}
                  endpointState={endpointState}
                  onRetry={retryEndpoint}
                />
              ) : (
                <Alert variant="destructive" className="rounded-2xl">
                  <Server className="size-5" />
                  <AlertTitle>Không tạo được installer URL</AlertTitle>
                  <AlertDescription>
                    Trang phải được mở từ một HTTP hoặc HTTPS origin hợp lệ.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f7f1ed] p-4 text-sm text-[#6c554d]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4f8b61]" />
              <p className="leading-6">
                Khi script báo thành công, quay lại browser và tiếp tục bước 03.
                Nếu launcher đã tồn tại, dùng tab <strong>Reinstall</strong>.
              </p>
            </div>
          </section>

          <section
            id="verify"
            className="scroll-mt-36 overflow-hidden rounded-[26px] border border-[#eadfd8] bg-white shadow-[0_14px_38px_rgba(44,24,19,0.055)]"
          >
            <div className="p-5 sm:p-7">
              <StepHeading
                number="03"
                eyebrow="Xác minh kết nối"
                title="Gửi yêu cầu mở Terminal"
                description="Browser có thể yêu cầu bạn xác nhận trước khi chuyển URI sang native launcher."
              />
            </div>

            <div className="grid border-t border-[#eee3dc] lg:grid-cols-[0.85fr_1.15fr]">
              <div className="bg-[#5a1c22] p-5 text-white sm:p-7">
                <SquareTerminal className="size-7 text-[#f7d7ae]" />
                <h3 className="mt-4 text-lg font-bold">Sẵn sàng kiểm tra?</h3>
                <p className="mt-2 text-sm leading-6 text-[#e4cfca]">
                  Nút này chỉ gửi URI cố định. Web không thể xác nhận Terminal
                  đã mở thành công.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-6 h-11 w-full bg-[#f7d7ae] text-[#4d181c] hover:bg-[#ffe6c3]"
                >
                  <a
                    href={TERMINAL_PROTOCOL_URI}
                    onClick={handleTerminalRequest}
                  >
                    <SquareTerminal />
                    Test Terminal
                    <ExternalLink className="ml-auto" />
                  </a>
                </Button>
              </div>

              <ol className="grid gap-px bg-[#eee3dc] sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["01", "Browser nhận URI", "identify-app://open"],
                  ["02", "XDG gọi launcher", "Kiểm tra protocol association"],
                  ["03", "GNOME Terminal mở", "Tạo một Terminal session mới"],
                ].map(([number, title, description]) => (
                  <li key={number} className="flex gap-3 bg-[#fdfaf8] p-4">
                    <span className="font-mono text-xs font-bold text-[#b66f55]">
                      {number}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#4a312b]">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#7b6861]">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            id="troubleshooting"
            className="scroll-mt-36 rounded-[26px] border border-[#eadfd8] bg-white p-5 shadow-[0_14px_38px_rgba(44,24,19,0.055)] sm:p-7"
          >
            <StepHeading
              number="04"
              eyebrow="Troubleshooting"
              title="Terminal vẫn chưa mở?"
              description="Mở tình huống gần nhất với lỗi bạn gặp và kiểm tra lần lượt từng gợi ý."
            />

            <div className="mt-7 divide-y divide-[#eee3dc] overflow-hidden rounded-2xl border border-[#eee3dc]">
              {troubleshooting.map(({ icon: Icon, title, description }) => (
                <details
                  key={title}
                  className="group bg-white open:bg-[#fdf9f6]"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 text-sm font-semibold text-[#4a312b] marker:hidden sm:px-5">
                    <Icon className="size-5 shrink-0 text-[#9b5745]" />
                    <span className="min-w-0 flex-1">{title}</span>
                    <ChevronRight className="size-4 shrink-0 text-[#a98b7f] transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="px-4 pb-5 pl-12 text-sm leading-6 text-[#78655e] sm:px-5 sm:pl-13">
                    {description}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
