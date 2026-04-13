import headerBg from "@/assets/header1.webp";
import logo1 from "@/assets/logo1.png";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

const APP_HEADER_HEIGHT = "110px";

export function MainLayout() {
  return (
    <SidebarProvider
      style={
        {
          "--app-header-height": APP_HEADER_HEIGHT,
        } as React.CSSProperties
      }
    >
      <div className="min-h-screen w-full bg-gray-50/90">
        <header
          className="sticky top-0 z-40 h-(--app-header-height)  shrink-0 overflow-hidden border-b bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${headerBg})` }}
        >
          {/* <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(183,8,38,0.92)_0%,rgba(183,8,38,0.86)_45%,rgba(183,8,38,0.80)_100%)]" /> */}

          <div className="relative flex h-full items-center gap-4 px-6 py-5 md:px-8">
            <div className="flex items-center gap-4">
              <img
                src={logo1}
                alt="logo"
                className=" h-14 w-14 shrink-0 object-contain md:h-16 md:w-16"
              />

              <div className=" text-[#fad29e]">
                <p className="text-xsm font-sans font-light tracking-wide md:text-base">
                  BỘ CÔNG AN
                </p>
                <p className="text-big font-sans font-bold tracking-wide md:text-[18px]">
                  CỤC KỸ THUẬT NGHIỆP VỤ
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-var(--app-header-height))] w-full">
          <AppSidebar />

          <main className="min-w-0 flex-1 overflow-auto">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
