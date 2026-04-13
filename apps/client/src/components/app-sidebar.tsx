import {
  BookOpenText,
  BookUser,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  History,
  Home,
  KeyRound,
  Languages,
  Loader2,
  LogOut,
  Mic,
  Search,
  UsersRound,
} from "lucide-react";
import * as React from "react";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import { toast } from "sonner";

interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  onClick?: () => void;
  children?: {
    title: string;
    url?: string;
    icon: React.ElementType;
    onClick?: () => void;
  }[];
}

import { logoutApi, resetPasswordApi } from "@/api/auth.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar-context";
import { ROUTES } from "@/constants";
import { useAuthStore } from "@/store/auth.store";

const navigation: NavItem[] = [
  {
    title: "Trang chủ",
    url: ROUTES.HOME,
    icon: Home,
  },
  {
    title: "Nhận dạng giọng nói",
    icon: Mic,
    children: [
      { title: "Đăng ký giọng nói", url: ROUTES.VOICE_ENROLL, icon: Mic },
      {
        title: "Tra cứu 1 người",
        url: ROUTES.VOICE_SEARCH_SINGLE,
        icon: Search,
      },
      {
        title: "Tra cứu 1-2 người",
        url: ROUTES.VOICE_SEARCH_MULTI,
        icon: UsersRound,
      },
      {
        title: "Hồ sơ định danh",
        url: ROUTES.VOICE_DIRECTORY,
        icon: BookUser,
      },
      {
        title: "Lịch sử định dạng",
        url: ROUTES.VOICE_HISTORY,
        icon: History,
      },
    ],
  },
  {
    title: "Dịch đa ngôn ngữ",
    icon: Languages,
    children: [
      { title: "Dịch trực tiếp", url: "#", icon: Mic },
      { title: "Dịch tệp tin", url: "#", icon: BookOpenText },
    ],
  },
  {
    title: "Hướng dẫn sử dụng",
    url: ROUTES.VOICE_GUIDE,
    icon: BookOpenText,
  },
];

function NavMenuItem({
  item,
  isActive,
  state,
  location,
}: {
  item: NavItem;
  isActive: boolean;
  state: string;
  location: Location;
}) {
  const { setOpen } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(isActive);
  const Icon = item.icon;

  const handleGroupClick = () => {
    if (state === "collapsed") {
      setOpen(true);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  if (!item.children) {
    const isExternal = item.url?.startsWith("http");

    const content = (
      <div
        className={`flex items-center ${state === "expanded" ? "gap-3" : "justify-center w-full"}`}
      >
        <Icon className="size-5 shrink-0" />
        {state === "expanded" && (
          <span className="text-nowrap">{item.title}</span>
        )}
      </div>
    );

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild={!!item.url && !isExternal}
          isActive={isActive}
          tooltip={item.title}
          onClick={item.onClick}
          className={`h-11 rounded-md transition-all font-medium ${
            isActive
              ? "bg-primary-50 text-primary-600"
              : "hover:bg-primary-50 hover:text-primary-600"
          } ${state === "expanded" ? "px-3" : "justify-center px-0"}`}
        >
          {item.url && !isExternal ? (
            <Link to={item.url}>{content}</Link>
          ) : isExternal ? (
            <a href={item.url} target="_blank" rel="noreferrer">
              {content}
            </a>
          ) : (
            content
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleGroupClick}
        tooltip={item.title}
        isActive={isActive}
        className={`h-11 rounded-md transition-all font-medium ${
          isActive
            ? "bg-primary-50 text-primary-500"
            : "hover:bg-primary-50 hover:text-primary-500"
        } ${state === "expanded" ? "px-3" : "px-0"}`}
      >
        {state === "expanded" ? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="size-5 shrink-0" />
              <span className="text-nowrap">{item.title}</span>
            </div>
            <div className="ml-auto">
              {isOpen ? (
                <ChevronUp className="size-4 opacity-50" />
              ) : (
                <ChevronDown className="size-4 opacity-50" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <Icon className="size-5 shrink-0" />
          </div>
        )}
      </SidebarMenuButton>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen && state === "expanded"
            ? "grid-rows-[1fr] opacity-100 mt-1"
            : "grid-rows-[0fr] opacity-0 mt-0 overflow-hidden"
        }`}
      >
        <div className="overflow-hidden">
          <SidebarMenuSub className="ml-4 border-l border-gray-100 pl-2">
            {item.children.map((child) => {
              const isChildActive = child.url
                ? location.pathname === child.url
                : false;
              const isExternalChild = child.url?.startsWith("http");
              const childContent = (
                <div className="flex items-center gap-3 py-2 text-sm transition-colors">
                  <child.icon className="size-4 shrink-0" />
                  <span>{child.title}</span>
                </div>
              );

              return (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    asChild={!!child.url && !isExternalChild}
                    isActive={isChildActive}
                    onClick={child.onClick}
                    className="h-9"
                  >
                    {child.url && !isExternalChild ? (
                      <Link to={child.url}>{childContent}</Link>
                    ) : isExternalChild ? (
                      <a href={child.url} target="_blank" rel="noreferrer">
                        {childContent}
                      </a>
                    ) : (
                      childContent
                    )}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </div>
      </div>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);
  const [isSubmittingLogout, setIsSubmittingLogout] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] =
    React.useState(false);
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState("");

  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setIsProfileDropdownOpen(false);
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
    <Sidebar collapsible="icon" {...props} className="border-r border-gray-100">
      <SidebarContent className="no-scrollbar bg-white pt-6">
        <div
          className={`relative mb-3 transition-all ${state === "expanded" ? "px-3" : "px-2"}`}
          ref={profileRef}
        >
          {user && (
            <>
              <div
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center gap-3 rounded-md bg-white p-2 border border-gray-200 text-gray-800 transition-all hover:bg-gray-50 cursor-pointer  ${
                  state === "collapsed" ? "justify-center" : ""
                }`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white  font-semibold text-gray-800 shadow uppercase">
                  {user.email.charAt(0)}
                </div>
                {state === "expanded" && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-[13px] font-bold">
                      {user.email}
                    </span>
                    <span className="truncate text-[10px] text-gray-500">
                      Ngày tạo: 12/04/2026
                    </span>
                  </div>
                )}
              </div>

              {isProfileDropdownOpen && (
                <div
                  className={`absolute left-3 right-3 z-50 mt-2 rounded-md border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                    state === "collapsed" ? "left-full ml-2 w-56" : ""
                  }`}
                >
                  <button
                    onClick={() => {
                      setIsPasswordDialogOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-500 transition-all"
                  >
                    <KeyRound className="size-4 shrink-0" />
                    <span>Thiết lập bảo mật</span>
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    disabled={isSubmittingLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                  >
                    {isSubmittingLogout ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <LogOut className="size-4 shrink-0" />
                    )}
                    <span>Đăng xuất hệ thống</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <SidebarMenu className="gap-1 px-3">
          {navigation.map((item, index) => {
            const isActive =
              location.pathname === item.url ||
              (item.url !== ROUTES.HOME &&
                item.url !== "#" &&
                location.pathname.startsWith(item.url as string)) ||
              (item.children?.some(
                (child) => child.url && location.pathname === child.url,
              ) ??
                false);

            if (index === 1 && state === "expanded") {
              return (
                <React.Fragment key="label-services">
                  <div className="my-2 px-2 text-[10px] font-semibold text-nowrap uppercase tracking-wider text-gray-400">
                    Dịch vụ & Tính năng
                  </div>
                  <NavMenuItem
                    item={item}
                    isActive={isActive}
                    state={state}
                    location={location}
                  />
                </React.Fragment>
              );
            }

            return (
              <NavMenuItem
                key={item.title}
                item={item}
                isActive={isActive}
                state={state}
                location={location}
              />
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-100 bg-white p-4">
        <SidebarTrigger className="h-10 w-full justify-start rounded-md border-t border-gray-100 px-4 outline-none focus:outline-none focus-visible:outline-none">
          <div className="flex w-full items-center gap-2">
            {state === "expanded" ? (
              <>
                <ChevronLeft className="size-4" />
                <span className="text-sm font-medium">Thu gọn thanh menu</span>
              </>
            ) : (
              <div className="flex w-full justify-center">
                <ChevronRight className="size-4" />
              </div>
            )}
          </div>
        </SidebarTrigger>
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
              <Button
                type="submit"
                disabled={isSubmittingPassword}
                className="bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
              >
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
