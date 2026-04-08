import { Link } from "react-router-dom";
import { Languages, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants";
import micWave from "@/assets/micwave.png";

const quickActions = [
  {
    title: "TRA CỨU 1-2 NGƯỜI",
    to: ROUTES.VOICE_SEARCH_MULTI,
    icon: UsersRound,
  },
  {
    title: "DỊCH ĐA NGÔN NGỮ",
    to: "/translate",
    icon: Languages,
  },
];

export default function Home() {
  return (
    <div className="flex h-full flex-col gap-6">
      <section className="flex flex-5 items-center rounded-[32px] bg-white px-8 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] md:px-12 md:py-10 lg:px-16 lg:py-12">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
          <div className="flex justify-center xl:justify-start">
            <img
              src={micWave}
              alt="Microphone and waveform"
              className="h-auto w-full max-w-[320px] object-contain lg:max-w-100 xl:max-w-115 2xl:max-w-125"
            />
          </div>

          <div className="min-w-0 flex items-center h-full">
            <h1 className="font-playfair line-clamp-3 text-[30px] font-bold leading-[1.2] text-[#4b1d18] md:text-[36px] lg:text-[40px] xl:text-[46px] 2xl:text-[52px]">
              Hệ thống nhận diện đối tượng dựa trên đặc điểm sinh trắc giọng nói
              và dịch đa ngôn ngữ
            </h1>
          </div>
        </div>
      </section>

      <section className="grid flex-4 gap-6 sm:grid-cols-2">
        {quickActions.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.title} to={item.to} className="block h-full">
              <Card className="h-full rounded-[24px] border-0 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
                <CardContent className="flex h-full flex-col items-center justify-center gap-6 px-6 py-8 text-center">
                  <div className="flex items-center justify-center rounded-full text-[#4b140c]">
                    <Icon className="size-16 stroke-[1.8] md:size-20 lg:size-24" />
                  </div>

                  <h2 className="text-[20px] font-bold tracking-wide text-[#4b140c] md:text-[24px] lg:text-[28px]">
                    {item.title}
                  </h2>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
