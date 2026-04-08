import * as React from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Home,
  KeyRound,
  Loader2,
  LogOut,
  Mic,
  Search,
  UsersRound,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";
import { ROUTES } from "@/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { logoutApi, resetPasswordApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

const navigation = [
  { title: "Trang chủ", url: ROUTES.HOME, icon: Home },
  { title: "Đăng ký giọng nói", url: ROUTES.VOICE_ENROLL, icon: Mic },
  { title: "Tra cứu 1 người", url: ROUTES.VOICE_SEARCH_SINGLE, icon: Search },
  {
    title: "Tra cứu 1-2 người",
    url: ROUTES.VOICE_SEARCH_MULTI,
    icon: UsersRound,
  },
  {
    title: "Hướng dẫn sử dụng",
    url: ROUTES.VOICE_GUIDE,
    icon: BookOpenText,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);
  const [isSubmittingLogout, setIsSubmittingLogout] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");

  const handleLogout = async () => {
    setIsSubmittingLogout(true);
    try {
      await logoutApi();
    } catch {
      // Best effort logout: still clear local session to unblock user flow.
    } finally {
      clearAuth();
      toast.success("Đã đăng xuất.");
      navigate(ROUTES.LOGIN, { replace: true });
      setIsSubmittingLogout(false);
    }
  };

  const handleResetPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await resetPasswordApi({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      toast.success("Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsPasswordDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Đổi mật khẩu thất bại. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent className="bg-white">
        <SidebarMenu className="gap-2 px-3 py-6">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.url ||
              (item.url !== ROUTES.HOME &&
                location.pathname.startsWith(item.url));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="h-12 rounded-none border-l-4 border-transparent pl-4 pr-3 text-base font-medium data-[active=true]:border-l-primary-500 data-[active=true]:bg-primary-50 data-[active=true]:text-primary-500 hover:text-primary-500 hover:bg-primary-50 transition-all duration-200 ease-in-out hover:scale-105 w-full"
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <Icon className="size-5 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="bg-white p-4">
        {state === "expanded" ? (
          <SidebarMenu className="mb-3 gap-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsPasswordDialogOpen(true)}
                className="h-12 rounded-none border-l-4 border-transparent pl-4 pr-3 text-base font-medium hover:bg-primary-50 hover:text-primary-500 transition-all duration-200 ease-in-out hover:scale-105 w-full"
              >
                <KeyRound className="size-5 shrink-0" />
                <span>Đổi mật khẩu</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                disabled={isSubmittingLogout}
                className="h-12 rounded-none border-l-4 border-transparent pl-4 pr-3 text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ease-in-out hover:scale-105 w-full"
              >
                {isSubmittingLogout ? (
                  <Loader2 className="size-5 shrink-0 animate-spin" />
                ) : (
                  <LogOut className="size-5 shrink-0" />
                )}
                <span>Đăng xuất</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="mb-3 flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsPasswordDialogOpen(true)}
                >
                  <KeyRound className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Đổi mật khẩu</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-600"
                  onClick={handleLogout}
                  disabled={isSubmittingLogout}
                >
                  {isSubmittingLogout ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Đăng xuất</TooltipContent>
            </Tooltip>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="h-10 w-full hover:bg-primary-50 hover:text-primary-500 transition-all duration-200 outline-none">
              <div
                className={`flex w-full items-center gap-2 ${state === "expanded" ? "items-start" : "justify-center"}`}
              >
                {state === "expanded" ? (
                  <>
                    <ChevronLeft className="size-5" />
                    <span>Thu gọn</span>
                  </>
                ) : (
                  <ChevronRight className="size-5" />
                )}
              </div>
            </SidebarTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={state === "expanded"}>
            Mở rộng sidebar
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>

      <SidebarRail />

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div className="space-y-2">
              <Label htmlFor="old-password">Mật khẩu hiện tại</Label>
              <Input
                id="old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">
                Xác nhận mật khẩu mới
              </Label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu mật khẩu mới"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
