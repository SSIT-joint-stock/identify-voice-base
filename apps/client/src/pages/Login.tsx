import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AudioWaveform } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginApi } from "@/api/auth.api.ts";
import { useAuthStore } from "@/store/auth.store";
import { ROUTES } from "@/constants";
import logo1 from "@/assets/logo1.png";
import headerBg from "@/assets/header1.webp";

// ─── Validation ────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Component ─────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    ROUTES.HOME;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await loginApi(data);
      setAuth(
        {
          ...res.data.account,
          username: res.data.account.username || "",
        },
        res.data.access_token,
      );
      toast.success("Đăng nhập thành công!");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message || "Đăng nhập thất bại";
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ─── Left Branding Panel ─────────────────────────────────── */}
      <div
        className="relative hidden w-[52%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{
          backgroundImage: `url(${headerBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-linear-to-br from-[#1a0a08]/80 via-[#2d1210]/70 to-[#4b1d18]/60 backdrop-blur-sm" />

        {/* Decorative floating orbs */}
        <div className="absolute top-16 left-16 h-64 w-64 rounded-full bg-[#fad29e]/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-24 right-20 h-48 w-48 rounded-full bg-[#e8a04a]/8 blur-2xl animate-pulse [animation-delay:1.5s]" />
        <div className="absolute top-1/3 right-12 h-32 w-32 rounded-full bg-white/5 blur-2xl animate-pulse [animation-delay:3s]" />

        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          <div className="flex items-center justify-center rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20 shadow-2xl">
            <img src={logo1} alt="Logo" className="h-20 w-20 object-contain" />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-light tracking-[0.25em] uppercase text-[#fad29e]/80">
              Bộ Công An
            </p>
            <h1 className="text-[28px] font-bold leading-tight tracking-wide text-[#fad29e]">
              CỤC KỸ THUẬT NGHIỆP VỤ
            </h1>
          </div>

          <div className="mx-auto h-px w-32 bg-linear-to-r from-transparent via-[#fad29e]/40 to-transparent" />

          <div className="flex items-center gap-3 text-white/70">
            <AudioWaveform className="h-5 w-5" />
            <p className="text-base font-light">Hệ thống nhận diện giọng nói</p>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-[#f8f9fb] px-6 py-12 lg:px-16">
        <div className="w-full max-w-110">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo1} alt="Logo" className="h-12 w-12 object-contain" />
            <span className="text-lg font-bold text-[#4b1d18]">
              Cục Kỹ Thuật Nghiệp Vụ
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-[32px] font-bold tracking-tight text-[#1a1a2e]">
              Đăng nhập
            </h2>
            <p className="text-base text-[#6b7280]">
              Vui lòng đăng nhập để tiếp tục sử dụng hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="login-email"
                className="text-sm font-semibold text-[#374151]"
              >
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
                className="h-12 rounded-xl border-[#e5e7eb] bg-white px-4 text-base shadow-sm transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[#4b1d18] focus:ring-2 focus:ring-[#4b1d18]/10"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="login-password"
                className="text-sm font-semibold text-[#374151]"
              >
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-12 rounded-xl border-[#e5e7eb] bg-white px-4 pr-12 text-base shadow-sm transition-all duration-200 placeholder:text-[#9ca3af] focus:border-[#4b1d18] focus:ring-2 focus:ring-[#4b1d18]/10"
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#4b1d18] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-[#4b1d18] text-base font-semibold text-white shadow-lg shadow-[#4b1d18]/20 transition-all duration-200 hover:bg-[#3a1512] hover:shadow-xl hover:shadow-[#4b1d18]/30 active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-[#6b7280]">
            Chưa có tài khoản?{" "}
            <Link
              to={ROUTES.REGISTER}
              className="font-semibold text-[#4b1d18] underline-offset-4 hover:underline transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
