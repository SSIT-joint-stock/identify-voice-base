import type { ElementType } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenText,
  BookUser,
  ChevronRight,
  FileText,
  History,
  Languages,
  Mic,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { ROUTES } from "@/constants";
import { isAdminUser } from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";
import micWave from "@/assets/micwave.png";

type QuickLink = {
  title: string;
  description: string;
  to: string;
  icon: ElementType;
  iconClassName: string;
};

type QuickLinkGroup = {
  title: string;
  description: string;
  items: QuickLink[];
};

const quickLinkGroups: QuickLinkGroup[] = [
  {
    title: "Nhận dạng giọng nói",
    description:
      "Các luồng thao tác chính cho nghiệp vụ đăng ký, tra cứu và quản lý hồ sơ.",
    items: [
      {
        title: "Đăng ký giọng nói",
        description: "Tạo hồ sơ giọng nói mới để phục vụ đối sánh về sau.",
        to: ROUTES.VOICE_ENROLL,
        icon: Mic,
        iconClassName:
          "bg-[#f97316] text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)]",
      },
      {
        title: "Tra cứu 1 người",
        description:
          "Thực hiện đối sánh một giọng nói với kho dữ liệu hiện có.",
        to: ROUTES.VOICE_SEARCH_SINGLE,
        icon: Search,
        iconClassName:
          "bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]",
      },
      {
        title: "Tra cứu 1-2 người",
        description:
          "Phân tích mẫu có tối đa hai người nói trong cùng một phiên.",
        to: ROUTES.VOICE_SEARCH_MULTI,
        icon: UsersRound,
        iconClassName:
          "bg-[#0f766e] text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]",
      },
      {
        title: "Hồ sơ định danh",
        description:
          "Xem danh sách, tìm kiếm và cập nhật thông tin hồ sơ giọng nói.",
        to: ROUTES.VOICE_DIRECTORY,
        icon: BookUser,
        iconClassName:
          "bg-[#16a34a] text-white shadow-[0_10px_24px_rgba(22,163,74,0.2)]",
      },
      {
        title: "Lịch sử định danh",
        description: "Theo dõi các phiên tra cứu và kết quả đã xử lý trước đó.",
        to: ROUTES.VOICE_HISTORY,
        icon: History,
        iconClassName:
          "bg-[#7c3aed] text-white shadow-[0_10px_24px_rgba(124,58,237,0.2)]",
      },
    ],
  },
  {
    title: "Dịch và hỗ trợ",
    description:
      "Các công cụ đi kèm để xử lý âm thanh và tra cứu hướng dẫn thao tác.",
    items: [
      {
        title: "Dịch trực tiếp",
        description:
          "Ghi âm hoặc nhận tín hiệu đầu vào để dịch theo thời gian thực.",
        to: ROUTES.TRANSLATE_LIVE,
        icon: Languages,
        iconClassName:
          "bg-[#0284c7] text-white shadow-[0_10px_24px_rgba(2,132,199,0.22)]",
      },
      {
        title: "Dịch tệp tin",
        description:
          "Tải lên tệp âm thanh và nhận bản dịch theo nội dung ghi âm.",
        to: ROUTES.TRANSLATE_FILE,
        icon: FileText,
        iconClassName:
          "bg-[#ea580c] text-white shadow-[0_10px_24px_rgba(234,88,12,0.2)]",
      },
      {
        title: "Hướng dẫn sử dụng",
        description:
          "Xem luồng thao tác chuẩn và các lưu ý khi vận hành hệ thống.",
        to: ROUTES.VOICE_GUIDE,
        icon: BookOpenText,
        iconClassName:
          "bg-[#4f46e5] text-white shadow-[0_10px_24px_rgba(79,70,229,0.2)]",
      },
    ],
  },
];

const adminGroup: QuickLinkGroup = {
  title: "Quản trị hệ thống",
  description:
    "Tác vụ dành cho tài khoản quản trị để kiểm soát người dùng trong hệ thống.",
  items: [
    {
      title: "Quản lý tài khoản",
      description:
        "Thêm mới, cập nhật quyền và theo dõi trạng thái tài khoản vận hành.",
      to: ROUTES.ADMIN_ACCOUNTS,
      icon: ShieldCheck,
      iconClassName:
        "bg-[#475569] text-white shadow-[0_10px_24px_rgba(71,85,105,0.22)]",
    },
  ],
};

function QuickLinkRow({ item }: { item: QuickLink }) {
  const Icon = item.icon;

  return (
    <Link to={item.to} className="group block">
      <div className="flex items-center gap-4 rounded-[24px] border border-white/70 bg-white/95 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d6c1b3] hover:shadow-[0_16px_40px_rgba(75,29,24,0.12)] md:px-5">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-[18px] ${item.iconClassName}`}
        >
          <Icon className="size-7 stroke-[2.1]" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[#3b231d] md:text-lg">
            {item.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#7c665f]">
            {item.description}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f7efe8] text-[#b2876a] transition-colors duration-300 group-hover:bg-[#efe1d6] group-hover:text-[#8f5b3a]">
          <ChevronRight className="size-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickLinkSection({ group }: { group: QuickLinkGroup }) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(255,250,247,0.96)_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] md:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="mt-2 text-2xl font-bold text-[#3b231d]">
            {group.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7c665f]">
            {group.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {group.items.map((item) => (
          <QuickLinkRow key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const visibleGroups = isAdminUser(user)
    ? [...quickLinkGroups, adminGroup]
    : quickLinkGroups;
  const welcomeName = user?.email?.split("@")[0] ?? "người dùng";

  return (
    <div className="relative flex h-full flex-col gap-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 rounded-[40px] bg-[radial-gradient(circle_at_top_left,rgba(241,192,153,0.28),transparent_42%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_34%),linear-gradient(180deg,rgba(255,248,242,0.92)_0%,rgba(249,250,251,0)_100%)]" />

      <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#fff9f5_0%,#fff3eb_52%,#fffdfb_100%)] px-6 py-6 md:px-8 md:py-8 xl:px-10">
        <div className="grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[#ecd7c9] bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#9f6c4d]">
              Chào mừng, {welcomeName}
            </span>

            <h1 className="mt-5 text-[30px] font-playfair font-bold leading-[1.18] text-[#4b1d18] md:text-[38px] xl:text-[42px] 2xl:text-[46px]">
              Hệ thống định danh giọng nói và dịch đa ngôn ngữ
            </h1>
          </div>

          <div className="flex justify-center xl:justify-end">
            <div className="relative w-full max-w-70 2xl:max-w-[320px]">
              <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.18)_0%,rgba(255,255,255,0)_72%)] blur-2xl" />
              <img
                src={micWave}
                alt="Microphone and waveform"
                className="relative h-auto w-full -translate-x-[10%] object-contain drop-shadow-[0_18px_40px_rgba(75,29,24,0.18)]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <QuickLinkSection group={visibleGroups[0]} />

        <div className="grid gap-6">
          {visibleGroups.slice(1).map((group) => (
            <QuickLinkSection key={group.title} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}
